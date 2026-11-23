import crypto from 'crypto';

const AES_KEY_HEX = process.env.AES_KEY!;

if (!AES_KEY_HEX || AES_KEY_HEX.length !== 64) {
  throw new Error('AES_KEY must be 64 hex characters (run: openssl rand -hex 32)');
}

// Decode hex → 32 raw bytes for AES-256
const AES_KEY = Buffer.from(AES_KEY_HEX, 'hex');

// ============ AES-256-GCM ============
export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', AES_KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

export function decrypt(encrypted: string): string {
  const [ivHex, tagHex, dataHex] = encrypted.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', AES_KEY, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]);
  return dec.toString('utf8');
}

// ============ HMAC-SHA256 ============
export function hmacSign(payload: string, key: string): string {
  return crypto.createHmac('sha256', key).update(payload).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

// ============ Random helpers ============
export function randomCode(len = 6): string {
  const digits = '0123456789';
  let out = '';
  const bytes = crypto.randomBytes(len);
  for (let i = 0; i < len; i++) {
    out += digits[bytes[i] % 10];
  }
  return out;
}

export function randomReferCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}
