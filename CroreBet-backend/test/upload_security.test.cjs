const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const express = require('express');

test('upload rejects unsafe folders and non-image files', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'crorebet-upload-test-'));
  process.env.UPLOAD_ROOT = root;
  globalThis.prisma = { adminSession: { findUnique: async () => ({ active: true, expiresAt: new Date(Date.now() + 60000), lastActiveAt: new Date(), admin: { id: 'test', email: 'test@example.invalid', role: 'admin', active: true } }) } };
  const app = express();
  app.use((req, _res, next) => { req.cookies = { mhx_admin_session: 'test-only' }; next(); });
  app.use('/admin', require('../src/routes/upload.routes.ts').default);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const send = (folder, bytes) => {
    const form = new FormData();
    form.append('file', new Blob([bytes], { type: 'image/png' }), 'image.png');
    form.append('folder', folder);
    return fetch(`http://127.0.0.1:${server.address().port}/admin/upload`, { method: 'POST', body: form });
  };
  try {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    assert.equal((await send('../outside', png)).status, 400);
    assert.equal((await send('sliders', Buffer.from('not an image'))).status, 400);
    const response = await send('sliders', png);
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.match(result.data.filename, /^[0-9]+-[0-9a-f]+\.png$/);
    await fs.unlink(path.join(root, 'sliders', result.data.filename));
    await fs.rmdir(path.join(root, 'sliders'));
  } finally {
    await new Promise(resolve => server.close(resolve));
    await fs.rmdir(root);
  }
});
