const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
process.env.JWT_SECRET = 'test-only-secret-that-is-at-least-32-characters';
process.env.JWT_REFRESH_SECRET = 'test-only-refresh-secret-at-least-32-characters';
process.env.NODE_ENV = 'test';
let createdUser;
globalThis.prisma = {
  user: {
    findUnique: async () => null,
    create: async ({ data }) => { createdUser = data; return { ...data, id: 'fake-user', wallet: 0, mPinHash: null }; },
  },
  refreshToken: { create: async () => ({}) },
};
const route = require('../src/routes/auth.routes.ts').default;
const app = express();
app.use(express.json());
app.use('/api/auth', route);
let server, base;
test.before(async () => { server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); }); base = `http://127.0.0.1:${server.address().port}`; });
test.after(() => server.close());
test('new registration creates a CB referral code', async () => {
  const response = await fetch(`${base}/api/auth/signup/direct`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test User', mobile: '9876543210', password: 'Password123' }),
  });
  assert.equal(response.status, 201);
  assert.match(createdUser.referCode, /^CB543210\d{2}$/);
});
