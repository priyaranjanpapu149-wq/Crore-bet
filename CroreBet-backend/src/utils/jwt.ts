import jwt, { SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const ADMIN_JWT_EXPIRES_IN = process.env.ADMIN_JWT_EXPIRES_IN || '8h';

if (!JWT_SECRET) throw new Error('Missing JWT_SECRET in .env');
if (!JWT_REFRESH_SECRET) throw new Error('Missing JWT_REFRESH_SECRET in .env');
// ADMIN_JWT_SECRET is required only when 2FA routes are used. Guard at call site
// so the server still boots if admin 2FA isn't wired yet.

function getAdminSecret(): string {
  if (!ADMIN_JWT_SECRET || ADMIN_JWT_SECRET.length < 32) {
    throw new Error(
      'ADMIN_JWT_SECRET missing or too short (must be 32+ chars). ' +
        'Generate with: openssl rand -base64 48',
    );
  }
  return ADMIN_JWT_SECRET;
}

export interface UserPayload {
  sub: string;
  mobile: string;
  role: 'user';
}

export interface AdminPayload {
  sub: string;
  email: string;
  role: 'admin' | 'superadmin';
  stage?: 'access' | '2fa';
}

// ---------- USER ----------
export function signUserAccess(payload: UserPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as SignOptions);
}

export function signUserRefresh(payload: UserPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  } as SignOptions);
}

export function verifyUserAccess(token: string): UserPayload {
  return jwt.verify(token, JWT_SECRET) as UserPayload;
}

export function verifyUserRefresh(token: string): UserPayload {
  return jwt.verify(token, JWT_REFRESH_SECRET) as UserPayload;
}

// ---------- ADMIN (legacy — kept for compatibility, unused now) ----------
export function signAdminAccess(payload: AdminPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30m' } as SignOptions);
}

export function verifyAdminAccess(token: string): AdminPayload {
  return jwt.verify(token, JWT_SECRET) as AdminPayload;
}

// ---------- ADMIN SESSION (real admin access token) ----------
export function signAdminSession(admin: {
  id: string;
  email: string;
  role: string;
}): string {
  return jwt.sign(
    {
      sub: admin.id,
      email: admin.email,
      role: admin.role as 'admin' | 'superadmin',
      stage: 'access',
    },
    getAdminSecret(),
    { expiresIn: ADMIN_JWT_EXPIRES_IN } as SignOptions,
  );
}

export function verifyAdminSession(token: string): AdminPayload {
  const payload = jwt.verify(token, getAdminSecret()) as AdminPayload;
  if (payload.stage === '2fa') {
    throw new Error('2FA temp token cannot be used as an access token');
  }
  return payload;
}

// ---------- 2FA TEMP TOKEN (between password and TOTP) ----------
export interface TwoFactorTempPayload {
  sub: string;
  stage: '2fa';
}

export function signTwoFactorTemp(adminId: string): string {
  return jwt.sign(
    { sub: adminId, stage: '2fa' },
    getAdminSecret(),
    { expiresIn: '5m' } as SignOptions,
  );
}

export function verifyTwoFactorTemp(token: string): TwoFactorTempPayload {
  const payload = jwt.verify(token, getAdminSecret()) as TwoFactorTempPayload;
  if (payload.stage !== '2fa') {
    throw new Error('Not a 2FA temp token');
  }
  return payload;
}