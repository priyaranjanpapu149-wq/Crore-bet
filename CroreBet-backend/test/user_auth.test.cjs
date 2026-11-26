const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = 'test-only-secret-that-is-at-least-32-characters';
process.env.JWT_REFRESH_SECRET = 'test-only-refresh-secret-at-least-32-characters';
let active = true;
globalThis.prisma = { user: { findUnique: async () => ({ active }) } };
const { requireUser } = require('../src/middleware/auth.ts');

test('blocked users cannot use an existing access token', async () => {
  const token = jwt.sign({ sub: 'test-user', mobile: '9000000000', role: 'user' }, process.env.JWT_SECRET);
  const req = { headers: { authorization: `Bearer ${token}` } };
  let nextCalled = false;
  const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  active = true;
  await requireUser(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  active = false;
  nextCalled = false;
  await requireUser(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.code, 401);
});
