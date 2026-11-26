const test = require('node:test');
const assert = require('node:assert/strict');

test('simultaneous transfers cannot spend the same balance twice', { skip: process.env.RUN_DB_TESTS !== '1' }, async () => {
  require('dotenv/config');
  const express = require('express');
  const jwt = require('jsonwebtoken');
  const crypto = require('crypto');
  const { PrismaClient } = require('@prisma/client');
  const originalHour = Date.prototype.getUTCHours;
  Date.prototype.getUTCHours = () => 12;
  const db = new PrismaClient();
  const users = [];
  let server;
  try {
    const app = express();
    app.use(express.json());
    app.use('/wallet', require('../src/routes/wallet.routes.ts').default);
    for (let i = 0; i < 3; i++) {
      users.push(await db.user.create({ data: { name: 'Isolated transfer test', mobile: String(crypto.randomInt(1000000000, 9999999999)), passwordHash: 'test-only', wallet: i === 0 ? 100 : 0 } }));
    }
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const token = jwt.sign({ sub: users[0].id, mobile: users[0].mobile, role: 'user' }, process.env.JWT_SECRET, { expiresIn: '1m' });
    const send = recipient => fetch(`http://127.0.0.1:${server.address().port}/wallet/transfer`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ toMobile: recipient.mobile, amount: 100 }) });
    const results = await Promise.all([send(users[1]), send(users[2])]);
    const balances = await db.user.findMany({ where: { id: { in: users.map(user => user.id) } }, select: { wallet: true } });
    assert.equal(results.filter(result => result.ok).length, 1);
    assert.equal(balances.reduce((sum, user) => sum + Number(user.wallet), 0), 100);
  } finally {
    Date.prototype.getUTCHours = originalHour;
    if (server) await new Promise(resolve => server.close(resolve));
    if (users.length) await db.user.deleteMany({ where: { id: { in: users.map(user => user.id) } } });
    await db.$disconnect();
  }
});
