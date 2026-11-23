import axios from 'axios';
import prisma from '../config/db';

// ═══════════════════════════════════════════════════════════════════
// MessageCentral v3 API
//   send()      → POST
//   validateOtp() → GET
// ═══════════════════════════════════════════════════════════════════
const MC_AUTH_TOKEN = process.env.MC_AUTH_TOKEN!;
const MC_CUSTOMER_ID = process.env.MC_CUSTOMER_ID!;
const APP_HASH = process.env.APP_HASH || ''; // 🚀 ADDED: Your 11-character Android app hash
const BASE = 'https://cpaas.messagecentral.com';

async function getToken(): Promise<string> {
  if (!MC_AUTH_TOKEN) {
    throw new Error('MC_AUTH_TOKEN not set in .env');
  }
  return MC_AUTH_TOKEN;
}

// ═══════════════════════════════════════════════════════════════════
// SEND OTP — POST
// ═══════════════════════════════════════════════════════════════════
export async function sendOtp(
  mobile: string,
  purpose: 'signup' | 'login' | 'forgot_password',
): Promise<{ verificationId: string }> {
  const token = await getToken();

  const { data, status } = await axios.post(
    `${BASE}/verification/v3/send`,
    null,
    {
      params: {
        countryCode: '91',
        customerId: MC_CUSTOMER_ID,
        flowType: 'SMS',
        mobileNumber: mobile,
        otpLength: 6,
        appHash: APP_HASH, // 🚀 ADDED: Passes the hash so Android can auto-fill
      },
      headers: { authToken: token, accept: '*/*' },
      timeout: 15000,
      validateStatus: () => true,
    },
  );

  console.log('[MC send] Status:', status);
  console.log('[MC send] Response:', JSON.stringify(data).slice(0, 300));

  if (status !== 200) {
    throw new Error(
      `MC send failed (${status}): ${data?.message || JSON.stringify(data)}`,
    );
  }

  const verificationId = data?.data?.verificationId;
  if (!verificationId) {
    throw new Error(data?.message || 'OTP send failed — no verificationId');
  }

  await prisma.otpSession.create({
    data: {
      mobile,
      verificationId,
      purpose,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  });

  return { verificationId };
}

// ═══════════════════════════════════════════════════════════════════
// VALIDATE OTP — GET
// Returns a status string so callers can show the right message.
//
// MessageCentral response codes:
//   200 → SUCCESS
//   700 → VERIFICATION_FAILED
//   702 → WRONG_OTP_PROVIDED
//   703 → ALREADY_VERIFIED
//   705 → VERIFICATION_EXPIRED (60-second window!)
//   800 → MAX_LIMIT_REACHED
// ═══════════════════════════════════════════════════════════════════
export type OtpResult =
  | 'valid'
  | 'wrong'
  | 'expired'
  | 'already_used'
  | 'limit'
  | 'error';

export async function validateOtp(
  verificationId: string,
  code: string,
): Promise<OtpResult> {
  const token = await getToken();

  const { data, status } = await axios.get(
    `${BASE}/verification/v3/validateOtp`,
    {
      params: { verificationId, code },
      headers: { authToken: token, accept: '*/*' },
      timeout: 15000,
      validateStatus: () => true,
    },
  );

  const rc = Number(data?.responseCode);
  console.log('[MC validate] Status:', status, 'responseCode:', rc, 'msg:', data?.message);

  switch (rc) {
    case 200:
      return 'valid';
    case 700:
    case 702:
      return 'wrong';
    case 703:
      return 'already_used';
    case 705:
      return 'expired';
    case 800:
      return 'limit';
    default:
      return 'error';
  }
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════
export async function otpRateLimitExceeded(mobile: string): Promise<boolean> {
  const since = new Date(Date.now() - 10 * 60 * 1000);
  const count = await prisma.otpSession.count({
    where: { mobile, createdAt: { gte: since } },
  });
  return count >= 3;
}

export async function markOtpUsed(mobile: string, purpose: string) {
  await prisma.otpSession.updateMany({
    where: { mobile, purpose, used: false },
    data: { used: true },
  });
}