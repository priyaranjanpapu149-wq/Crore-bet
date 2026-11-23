import { authenticator } from '@otplib/v12-adapter';
import QRCode from 'qrcode';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { encrypt, decrypt } from '../utils/crypto';

const ISSUER = 'Shivaay Admin';

// otplib defaults: 30s step, 6 digits, SHA1 — matches Google Authenticator.
// window: 1 = accept the code from the step before and after the current
// one (±30s). Do NOT widen: window: 2+ enables replay of an older code
// within a 60-90s window.
authenticator.options = { window: 1 };

// ─── Generate a fresh TOTP secret for an admin (not yet enabled) ───
export async function generateSecret(
  email: string,
): Promise<{ qrDataUrl: string; secret: string }> {
  const secret = authenticator.generateSecret(); // base32, ~32 chars / 160 bits
  const otpauthUrl = authenticator.keyuri(email, ISSUER, secret);
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl);
  return { qrDataUrl, secret };
}

// ─── Verify a 6-digit TOTP code against a stored (AES-GCM encrypted) secret ───
export function verifyCode(encryptedSecret: string, code: string): boolean {
  try {
    const base32 = decrypt(encryptedSecret);
    return authenticator.verify({
      token: String(code).replace(/\D/g, ''),
      secret: base32,
    });
  } catch {
    return false;
  }
}

// ─── Encrypt a plain base32 secret for storage ───
export function sealSecret(base32: string): string {
  return encrypt(base32);
}

// ─── Generate N recovery codes (plaintext, shown to user once) ───
export function generateRecoveryCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(4).toString('hex');
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}`); // e.g. a1b2-c3d4
  }
  return codes;
}

// ─── Hash recovery codes for storage ───
export async function hashRecoveryCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map((c) => bcrypt.hash(c, 10)));
}

// ─── Consume a recovery code (returns new array minus the used one) ───
export async function consumeRecoveryCode(
  storedHashes: string[],
  inputCode: string,
): Promise<{ ok: boolean; remainingHashes: string[] }> {
  const trimmed = inputCode.trim().toLowerCase();
  for (let i = 0; i < storedHashes.length; i++) {
    const match = await bcrypt.compare(trimmed, storedHashes[i]);
    if (match) {
      return {
        ok: true,
        remainingHashes: storedHashes.filter((_, idx) => idx !== i),
      };
    }
  }
  return { ok: false, remainingHashes: storedHashes };
}