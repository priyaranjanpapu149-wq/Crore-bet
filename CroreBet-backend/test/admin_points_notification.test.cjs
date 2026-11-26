const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cookieParser = require('cookie-parser');
process.env.JWT_SECRET = 'test-only-secret-that-is-at-least-32-characters';
process.env.NODE_ENV = 'test';
const messages = [];
let failDelivery = false;
const messaging = require('firebase-admin/messaging');
messaging.getMessaging = () => ({
  sendEachForMulticast: async (message) => {
    messages.push(message);
    if (failDelivery) throw new Error('Simulated delivery failure');
    return { successCount: 1, failureCount: 0, responses: [] };
  },
});
let state;
const prisma = {
  adminSession: { findUnique: async () => ({ id: 'session', active: true, expiresAt: new Date(Date.now() + 60000), lastActiveAt: new Date(), admin: { id: 'admin-1', active: true, email: 'test@example.invalid', role: 'admin' } }) },
  setting: { findMany: async () => [{ key: 'referral_enabled', value: '0' }] },
  auditLog: { create: async () => ({}) },
  deviceToken: { findMany: async ({ where }) => where.userId === 'user-1' ? [{ token: 'test-device' }] : [] },
  $transaction: async (callback) => {
    const local = structuredClone(state);
    const tx = {
      user: {
        findUnique: async () => ({ id: 'user-1', wallet: local.wallet, mobile: '9000000000' }),
        update: async ({ data }) => { local.wallet += data.wallet.increment; return { wallet: local.wallet }; },
      },
      transaction: { create: async ({ data }) => { local.transactions.push(data); return data; } },
    };
    const value = await callback(tx);
    state = local;
    return value;
  },
};
globalThis.prisma = prisma;
const adminRoutes = require(process.env.TEST_COMPILED ? '../dist/routes/admin.routes.js' : '../src/routes/admin.routes.ts').default;
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/admin', adminRoutes);
let server, base;
test.before(async () => { server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); }); base = `http://127.0.0.1:${server.address().port}`; });
test.after(() => server.close());
test.beforeEach(() => { state = { wallet: 100, transactions: [] }; messages.length = 0; failDelivery = false; });
async function credit(cookie = true) {
  return fetch(`${base}/api/admin/wallet/add`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: 'mhx_admin_session=fake-session' } : {}) }, body: JSON.stringify({ userId: 'user-1', amount: 50, type: 1, remark: 'Points Added By Admin', skipBonus: true }) });
}
test('admin point credit updates wallet and sends one background-capable notification', async () => {
  const res = await credit();
  assert.equal(res.status, 200);
  assert.equal(state.wallet, 150);
  assert.equal(state.transactions.length, 1);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(messages.length, 1);
  assert.equal(messages[0].data.type, 'wallet');
  assert.match(messages[0].data.body, /₹50/);
  assert.match(messages[0].data.body, /₹150/);
  assert.equal(messages[0].android.priority, 'high');
});
test('notification failure does not repeat or roll back a successful credit', async () => {
  failDelivery = true;
  const res = await credit();
  assert.equal(res.status, 200);
  assert.equal(state.wallet, 150);
  assert.equal(state.transactions.length, 1);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(messages.length, 1);
});
test('unauthorized request cannot credit the wallet', async () => {
  const res = await credit(false);
  assert.equal(res.status, 401);
  assert.equal(state.wallet, 100);
  assert.equal(messages.length, 0);
});
