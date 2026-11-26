const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const RealDate = Date;
const fixedTime = new RealDate('2026-11-25T06:30:00.000Z').getTime();
global.Date = class extends RealDate {
  constructor(...args) { super(...(args.length ? args : [fixedTime])); }
  static now() { return fixedTime; }
};

process.env.JWT_SECRET = 'test-only-secret-that-is-at-least-32-characters';
process.env.NODE_ENV = 'test';
const messages = [];
const messaging = require('firebase-admin/messaging');
messaging.getMessaging = () => ({
  sendEachForMulticast: async (message) => { messages.push(message); return { successCount: 1, failureCount: 0, responses: [] }; },
  send: async (message) => { messages.push(message); return 'test-message'; },
});
let state;
const prisma = {
  user: { findUnique: async () => ({ active: true }) },
  setting: { findMany: async () => [{ key: 'referral_enabled', value: '0' }] },
  deviceToken: { findMany: async () => [{ token: 'test-token' }] },
  $transaction: async (callback) => {
    const local = structuredClone(state);
    const tx = {
      user: {
        findUnique: async () => ({ id: 'user-1', active: true, mobile: '9000000000', wallet: local.wallet }),
        findUniqueOrThrow: async () => ({ wallet: local.wallet }),
        update: async ({ data }) => { local.wallet -= data.wallet.decrement; return { wallet: local.wallet }; },
      },
      market: { findUnique: async () => ({ id: 'market-1', name: 'Test market', active: true, openTime: '23:59', closeTime: '23:59' }) },
      result: { findFirst: async ({ where }) => where.session === 'open' && local.openDeclared ? { id: 'open-result' } : null },
      rate: { findUnique: async () => ({ minBet: 10, maxBet: 100000, payout: 9 }) },
      bid: { create: async ({ data }) => { const bid = { ...data, id: `bid-${local.bids.length + 1}` }; local.bids.push(bid); return bid; } },
      transaction: { create: async ({ data }) => { local.transactions.push(data); } },
    };
    const result = await callback(tx);
    state = local;
    return result;
  },
};
globalThis.prisma = prisma;
const route = require(process.env.TEST_COMPILED ? '../dist/routes/game.routes.js' : '../src/routes/game.routes.ts').default;
const app = express();
app.use(express.json());
app.use('/api/games', route);
let server, base;
test.before(async () => {
  server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => { server.close(); global.Date = RealDate; });
test.beforeEach(() => { state = { wallet: 100, bids: [], transactions: [] }; messages.length = 0; });
async function send(bids, { session = 'close', gameType = 'single' } = {}) {
  const token = jwt.sign({ sub: 'user-1', mobile: '9000000000' }, process.env.JWT_SECRET);
  return fetch(`${base}/api/games/bid/batch`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ marketId: 'market-1', gameType, session, bids }) });
}
test('valid batch commits all bids, wallet changes and sends notification', async () => {
  const res = await send([{ digits: '1', amount: 10 }, { digits: '2', amount: 20 }]);
  assert.equal(res.status, 200);
  const result = await res.json();
  assert.equal(result.data.wallet, 70);
  assert.equal(result.data.bidIds.length, 2);
  assert.equal(state.bids.length, 2);
  assert.equal(state.transactions.length, 2);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(messages.length, 1);
  assert.equal(messages[0].data.type, 'bid_placed');
});
test('invalid second bid rolls back first bid and wallet', async () => {
  const res = await send([{ digits: '1', amount: 10 }, { digits: '2', amount: 1 }]);
  assert.equal(res.status, 400);
  assert.match((await res.json()).message, /Minimum bid/);
  assert.equal(state.wallet, 100);
  assert.equal(state.bids.length, 0);
  assert.equal(state.transactions.length, 0);
  assert.equal(messages.length, 0);
});
test('insufficient funds rolls back the entire batch', async () => {
  const res = await send([{ digits: '1', amount: 60 }, { digits: '2', amount: 50 }]);
  assert.equal(res.status, 400);
  assert.match((await res.json()).message, /Insufficient balance/);
  assert.equal(state.wallet, 100);
  assert.equal(state.bids.length, 0);
});

test('sessionless jodi is accepted and stored without a session', async () => {
  const res = await send([{ digits: '12', amount: 10 }], { gameType: 'jodi', session: '' });
  assert.equal(res.status, 200);
  assert.equal(state.bids[0].session, null);
});

test('after the open result only eligible close-session bets are accepted', async () => {
  state.openDeclared = true;
  const denied = await send([{ digits: '1', amount: 10 }], { session: 'open' });
  assert.equal(denied.status, 400);
  assert.equal(state.bids.length, 0);
  const allowed = await send([{ digits: '2', amount: 10 }], { session: 'close' });
  assert.equal(allowed.status, 200);
  assert.equal(state.bids.length, 1);
});

test('declaring a result sends result, win and loss notifications', async () => {
  const { declareResult } = require(process.env.TEST_COMPILED ? '../dist/services/game.service.js' : '../src/services/game.service.ts');
  const originalTransaction = prisma.$transaction;
  const statuses = {};
  prisma.$transaction = async (callback) => callback({
    $queryRaw: async () => [],
    market: { findUnique: async () => ({ name: 'Test market', openTime: '10:00' }) },
    result: { findFirst: async () => null, create: async ({ data }) => ({ id: 'result-1', ...data }) },
    bid: {
      findMany: async () => [
        { id: 'won', userId: 'winner', gameType: 'single', session: 'open', digits: '4', payout: 90 },
        { id: 'lost', userId: 'loser', gameType: 'single', session: 'open', digits: '5', payout: 90 },
      ],
      update: async ({ where, data }) => { statuses[where.id] = data.status; },
    },
    user: { findUnique: async () => ({ wallet: 100 }), update: async () => ({ wallet: 190 }) },
    transaction: { create: async () => ({}) },
  });
  try {
    const result = await declareResult({ marketId: 'market-1', session: 'open', openResult: '4', pannaResult: '123', resultDate: '2026-11-25', force: true });
    assert.equal(result.wonCount, 1);
    assert.deepEqual(statuses, { won: 'won', lost: 'lost' });
    assert.deepEqual(messages.map(message => message.data.type), ['result', 'win', 'loss']);
    assert.ok(messages.every(message => message.android.priority === 'high'));
  } finally {
    prisma.$transaction = originalTransaction;
  }
});
