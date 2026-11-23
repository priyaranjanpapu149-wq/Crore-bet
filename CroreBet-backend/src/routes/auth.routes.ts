import { Router } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import { ok, created, badRequest, unauthorized, serverError } from '../utils/response';
import { sendOtp, validateOtp } from '../services/otp.service';
import { otpLimiter, loginLimiter, verifyLimiter } from '../middleware/rateLimit';
import {
  isValidName,
  isValidMobile,
  isValidOtp,
  isValidPassword,
  isValidReferCode,
} from '../utils/validate';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET missing or too short (must be 32+ chars)');
}

// 🚀 Read Access Expiry from .env (e.g., '7d')
const ACCESS_EXPIRY = (process.env.JWT_EXPIRES_IN || '15m') as jwt.SignOptions['expiresIn'];

// 🚀 Read Refresh Expiry from .env (e.g., '15d') and convert to milliseconds
const REFRESH_EXPIRY_STR = process.env.JWT_REFRESH_EXPIRES_IN || '15d';
const refreshDaysMatch = REFRESH_EXPIRY_STR.match(/^(\d+)d$/);
const REFRESH_DAYS = refreshDaysMatch ? parseInt(refreshDaysMatch[1], 10) : 15;
const REFRESH_MS = REFRESH_DAYS * 24 * 60 * 60 * 1000;

// 🚀 Increased to 10 attempts
const MAX_FAILED = 10;
const LOCK_MINUTES = 30;

function getDeviceId(req: any): string {
  return String(req.headers['x-device-id'] || '').trim().slice(0, 128);
}

async function touchUserSession(userId: string, req: any) {
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    null;
  const deviceId = String(req.headers['x-device-id'] || '').trim().slice(0, 128) || null;

  await prisma.user.update({
    where: { id: userId },
    data: {
      lastSeen: new Date(),
      lastIp: ip,
      ...(deviceId ? { lastDeviceId: deviceId } : {}),
    },
  }).catch(() => {});
}

function generateReferCode(mobile: string): string {
  return 'SHV' + mobile.slice(-6) + crypto.randomInt(10, 99);
}

function issueAccessToken(user: { id: string; mobile: string }) {
  return jwt.sign({ sub: user.id, mobile: user.mobile }, JWT_SECRET as string, {
    expiresIn: ACCESS_EXPIRY,
  });
}

async function issueRefreshToken(userId: string) {
  const token = crypto.randomBytes(64).toString('hex');
  await prisma.refreshToken.create({
    data: {
      userId,
      token,
      expiresAt: new Date(Date.now() + REFRESH_MS), // 🚀 Uses .env value
    },
  });
  return token;
}

function setRefreshCookie(res: any, token: string) {
  res.cookie('refresh_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: REFRESH_MS, // 🚀 Uses .env value
    path: '/',
  });
}

async function checkLockout(user: { id: string; lockedUntil?: Date | null }) {
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const mins = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    return `Account locked. Try again in ${mins} min.`;
  }
  return null;
}

async function recordFailedLogin(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { failedLogins: true } });
  const next = (u?.failedLogins ?? 0) + 1;
  if (next >= MAX_FAILED) {
    await prisma.user.update({
      where: { id: userId },
      data: { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60000) },
    });
  } else {
    await prisma.user.update({ where: { id: userId }, data: { failedLogins: next } });
  }
}

async function clearFailedLogin(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { failedLogins: 0, lockedUntil: null },
  });
}

async function handleOtpResult(
  result: Awaited<ReturnType<typeof validateOtp>>,
  session: { id: string; attempts: number },
  res: any,
): Promise<boolean> {
  if (result === 'valid') {
    await prisma.otpSession.update({
      where: { id: session.id },
      data: { used: true },
    });
    return true;
  }

  if (result === 'expired') {
    await prisma.otpSession.update({
      where: { id: session.id },
      data: { used: true },
    });
    badRequest(res, 'OTP expired. Please request a new one.');
    return false;
  }

  if (result === 'already_used') {
    await prisma.otpSession.update({
      where: { id: session.id },
      data: { used: true },
    });
    badRequest(res, 'OTP already used. Please request a new one.');
    return false;
  }

  if (result === 'limit') {
    badRequest(res, 'Too many attempts. Please request a new OTP.');
    return false;
  }

  await prisma.otpSession.update({
    where: { id: session.id },
    data: { attempts: session.attempts + 1 },
  });
  badRequest(res, 'Invalid OTP');
  return false;
}

// ═══════════════════════════════════════════════════════════
// SIGNUP — Send OTP (rejects existing numbers)
// ═══════════════════════════════════════════════════════════
router.post('/signup/send-otp', otpLimiter, async (req, res) => {
  try {
    const mobileCheck = isValidMobile(req.body.mobile);
    if (!mobileCheck.ok) return badRequest(res, mobileCheck.msg!);
    const mobile = mobileCheck.value;

    const existing = await prisma.user.findUnique({ where: { mobile } });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Mobile number already registered. Please login instead.',
        code: 'USER_EXISTS',
      });
    }

    await sendOtp(mobile, 'signup');
    return ok(res, {}, 'OTP sent to your mobile');
  } catch (e: any) {
    return badRequest(res, e.message);
  }
});

// ═══════════════════════════════════════════════════════════
// SIGNUP — Verify OTP + Create Account + Issue Tokens
// 🚀 STRICT VALIDATION — rejects anything invalid, no silent strip
// ═══════════════════════════════════════════════════════════
router.post('/signup/verify-otp', verifyLimiter, async (req, res) => {
  try {
    // 🚀 STRICT WHITELIST VALIDATION
    const mobileCheck = isValidMobile(req.body.mobile);
    if (!mobileCheck.ok) return badRequest(res, mobileCheck.msg!);

    const codeCheck = isValidOtp(req.body.code);
    if (!codeCheck.ok) return badRequest(res, codeCheck.msg!);

    const nameCheck = isValidName(req.body.name);
    if (!nameCheck.ok) return badRequest(res, nameCheck.msg!);

    const pwCheck = isValidPassword(req.body.password);
    if (!pwCheck.ok) return badRequest(res, pwCheck.msg!);

    const referCheck = isValidReferCode(req.body.referCode);
    if (!referCheck.ok) return badRequest(res, referCheck.msg!);

    const mobile = mobileCheck.value;
    const code = codeCheck.value;
    const name = nameCheck.value;
    const password = pwCheck.value;
    const referCode = referCheck.value;

    const session = await prisma.otpSession.findFirst({
      where: { mobile, purpose: 'signup', used: false },
      orderBy: { createdAt: 'desc' },
    });
    if (!session) return badRequest(res, 'No OTP requested');
    if (session.expiresAt < new Date()) return badRequest(res, 'OTP expired');
    if (session.attempts >= 10) return badRequest(res, 'Too many attempts'); // 🚀 Changed to 10

    const result = await validateOtp(session.verificationId, code);
    const okRes = await handleOtpResult(result, session, res);
    if (!okRes) return;

    const existing = await prisma.user.findUnique({ where: { mobile } });
    if (existing) return badRequest(res, 'Mobile already registered');

    // ─── Resolve refer code ───
    let validRefer: string | null = null;
    let referrerMobile: string | null = null;

    if (referCode && typeof referCode === 'string') {
      const rcode = referCode.trim().toUpperCase();
      const referrer = await prisma.user.findUnique({
        where: { referCode: rcode },
        select: { mobile: true },
      });
      if (referrer && referrer.mobile !== mobile) {
        validRefer = rcode;
        referrerMobile = referrer.mobile;
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const deviceId = getDeviceId(req);

    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      null;

    const user = await prisma.user.create({
      data: {
        mobile,
        name,
        passwordHash,
        verified: true,
        referCode: generateReferCode(mobile),
        referredBy: validRefer,
        lastDeviceId: deviceId || null,
        lastIp: ip,
        lastSeen: new Date(),
      },
    });

    if (validRefer && referrerMobile) {
      try {
        const { createReferral } = await import('../services/referral.service');
        await createReferral({
          referrerMobile,
          refereeMobile: mobile,
          refereeName: name,
          referralCode: validRefer,
        });
        console.log(`[referral] created: ${referrerMobile} ← ${mobile}`);
      } catch (e: any) {
        console.error('[referral:create]', e.message);
      }
    }

    const accessToken = issueAccessToken(user);
    const refreshToken = await issueRefreshToken(user.id);
    setRefreshCookie(res, refreshToken);

    return created(
      res,
      {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          name: user.name,
          mobile: user.mobile,
          wallet: Number(user.wallet),
          hasMpin: !!user.mPinHash,
        },
      },
      'Account created',
    );
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

// ═══════════════════════════════════════════════════════════
// LOGIN — Step 1: Password
// ═══════════════════════════════════════════════════════════
router.post('/login/verify-password', loginLimiter, async (req, res) => {
  try {
    const mobileCheck = isValidMobile(req.body.mobile);
    if (!mobileCheck.ok) return badRequest(res, mobileCheck.msg!);

    const pwCheck = isValidPassword(req.body.password);
    if (!pwCheck.ok) return badRequest(res, pwCheck.msg!);

    const mobile = mobileCheck.value;
    const password = pwCheck.value;

    const user = await prisma.user.findUnique({ where: { mobile } });
    if (!user || !user.active) return unauthorized(res, 'Invalid credentials');

    const lockMsg = await checkLockout(user);
    if (lockMsg) return unauthorized(res, lockMsg);

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      await recordFailedLogin(user.id);
      return unauthorized(res, 'Invalid credentials');
    }

    await clearFailedLogin(user.id);
    await sendOtp(mobile, 'login');
    return ok(res, { requiresOtp: true }, 'OTP sent to your mobile');
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

// ═══════════════════════════════════════════════════════════
// LOGIN — Step 2: Verify OTP + Issue Tokens
// ═══════════════════════════════════════════════════════════
router.post('/login/verify-otp', verifyLimiter, async (req, res) => {
  try {
    const mobileCheck = isValidMobile(req.body.mobile);
    if (!mobileCheck.ok) return badRequest(res, mobileCheck.msg!);

    const codeCheck = isValidOtp(req.body.code);
    if (!codeCheck.ok) return badRequest(res, codeCheck.msg!);

    const mobile = mobileCheck.value;
    const code = codeCheck.value;

    const session = await prisma.otpSession.findFirst({
      where: { mobile, purpose: 'login', used: false },
      orderBy: { createdAt: 'desc' },
    });
    if (!session) return badRequest(res, 'No OTP requested');
    if (session.expiresAt < new Date()) return badRequest(res, 'OTP expired');
    if (session.attempts >= 10) return badRequest(res, 'Too many attempts'); // 🚀 Changed to 10

    const result = await validateOtp(session.verificationId, code);
    const okRes = await handleOtpResult(result, session, res);
    if (!okRes) return;

    const user = await prisma.user.findUnique({ where: { mobile } });
    if (!user) return unauthorized(res, 'User not found');

    await touchUserSession(user.id, req);

    const accessToken = issueAccessToken(user);
    const refreshToken = await issueRefreshToken(user.id);
    setRefreshCookie(res, refreshToken);

    return ok(
      res,
      {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          name: user.name,
          mobile: user.mobile,
          wallet: Number(user.wallet),
          hasMpin: !!user.mPinHash,
        },
      },
      'Login successful',
    );
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

// ═══════════════════════════════════════════════════════════
// LOGIN — Quick (password only, no OTP)
// ═══════════════════════════════════════════════════════════
router.post('/login/password', loginLimiter, async (req, res) => {
  try {
    const mobileCheck = isValidMobile(req.body.mobile);
    if (!mobileCheck.ok) return badRequest(res, mobileCheck.msg!);

    const pwCheck = isValidPassword(req.body.password);
    if (!pwCheck.ok) return badRequest(res, pwCheck.msg!);

    const mobile = mobileCheck.value;
    const password = pwCheck.value;

    const user = await prisma.user.findUnique({ where: { mobile } });
    if (!user || !user.active) return unauthorized(res, 'Invalid credentials');

    const lockMsg = await checkLockout(user);
    if (lockMsg) return unauthorized(res, lockMsg);

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      await recordFailedLogin(user.id);
      return unauthorized(res, 'Invalid credentials');
    }

    // 🚀 FIXED: We still get the device ID but we don't block the login if it's new.
    const deviceId = getDeviceId(req);

    await clearFailedLogin(user.id);
    await touchUserSession(user.id, req);

    const accessToken = issueAccessToken(user);
    const refreshToken = await issueRefreshToken(user.id);
    setRefreshCookie(res, refreshToken);

    return ok(
      res,
      {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          name: user.name,
          mobile: user.mobile,
          wallet: Number(user.wallet),
          hasMpin: !!user.mPinHash,
        },
      },
      'Login successful',
    );
  } catch (e: any) {
    return serverError(res, e.message);
  }
});
// ═══════════════════════════════════════════════════════════
// MPIN / FORGOT / REFRESH / LOGOUT / SESSION
// ═══════════════════════════════════════════════════════════

router.post('/set-mpin', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return unauthorized(res);
    const payload: any = jwt.verify(authHeader.slice(7), JWT_SECRET as string);
    const { mpin } = req.body;
    if (!/^\d{4}$/.test(String(mpin))) return badRequest(res, 'MPIN must be 4 digits');
    const hash = await bcrypt.hash(String(mpin), 12);
    await prisma.user.update({ where: { id: payload.sub }, data: { mPinHash: hash } });
    return ok(res, {}, 'MPIN set successfully');
  } catch {
    return unauthorized(res, 'Invalid or expired token');
  }
});

router.post('/verify-mpin', loginLimiter, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return unauthorized(res);
    const payload: any = jwt.verify(authHeader.slice(7), JWT_SECRET as string);
    const { mpin } = req.body;
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user?.mPinHash) return badRequest(res, 'MPIN not set');
    const valid = await bcrypt.compare(String(mpin), user.mPinHash);
    if (!valid) return unauthorized(res, 'Invalid MPIN');
    return ok(res, { verified: true });
  } catch {
    return unauthorized(res, 'Invalid or expired token');
  }
});

router.post('/forgot/send-otp', otpLimiter, async (req, res) => {
  try {
    const mobileCheck = isValidMobile(req.body.mobile);
    if (!mobileCheck.ok) return badRequest(res, mobileCheck.msg!);
    const mobile = mobileCheck.value;

    const user = await prisma.user.findUnique({ where: { mobile } });
    if (!user) return ok(res, {}, 'If the mobile exists, an OTP has been sent');
    await sendOtp(mobile, 'forgot_password');
    return ok(res, {}, 'OTP sent');
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.post('/forgot/verify-otp', verifyLimiter, async (req, res) => {
  try {
    const mobileCheck = isValidMobile(req.body.mobile);
    if (!mobileCheck.ok) return badRequest(res, mobileCheck.msg!);

    const codeCheck = isValidOtp(req.body.code);
    if (!codeCheck.ok) return badRequest(res, codeCheck.msg!);

    const mobile = mobileCheck.value;
    const code = codeCheck.value;

    const session = await prisma.otpSession.findFirst({
      where: { mobile, purpose: 'forgot_password', used: false },
      orderBy: { createdAt: 'desc' },
    });
    if (!session) return badRequest(res, 'No OTP requested');
    if (session.expiresAt < new Date()) return badRequest(res, 'OTP expired');
    if (session.attempts >= 10) return badRequest(res, 'Too many attempts'); // 🚀 Changed to 10

    const result = await validateOtp(session.verificationId, code);
    const okRes = await handleOtpResult(result, session, res);
    if (!okRes) return;

    const user = await prisma.user.findUnique({ where: { mobile } });
    if (!user) return unauthorized(res, 'User not found');

    const resetToken = crypto.randomBytes(32).toString('hex');
    await prisma.otpSession.create({
      data: {
        mobile,
        verificationId: resetToken,
        purpose: 'forgot_password_reset',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    return ok(res, { resetToken }, 'OTP verified');
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.post('/forgot/reset-password', verifyLimiter, async (req, res) => {
  try {
    const mobileCheck = isValidMobile(req.body.mobile);
    if (!mobileCheck.ok) return badRequest(res, mobileCheck.msg!);

    const pwCheck = isValidPassword(req.body.newPassword);
    if (!pwCheck.ok) return badRequest(res, pwCheck.msg!);

    if (!req.body.resetToken || typeof req.body.resetToken !== 'string') {
      return badRequest(res, 'Invalid reset token');
    }

    const mobile = mobileCheck.value;
    const newPassword = pwCheck.value;
    const resetToken = String(req.body.resetToken).trim();

    const tokenSession = await prisma.otpSession.findFirst({
      where: {
        mobile,
        verificationId: resetToken,
        purpose: 'forgot_password_reset',
        used: false,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!tokenSession) return badRequest(res, 'Invalid reset session');
    if (tokenSession.expiresAt < new Date()) {
      return badRequest(res, 'Reset session expired. Start again.');
    }

    await prisma.otpSession.update({
      where: { id: tokenSession.id },
      data: { used: true },
    });

    const hash = await bcrypt.hash(newPassword, 12);
    const user = await prisma.user.update({
      where: { mobile },
      data: { passwordHash: hash },
    });

    await prisma.refreshToken.updateMany({
      where: { userId: user.id, revoked: false },
      data: { revoked: true },
    });
    await prisma.userSession.deleteMany({ where: { userId: user.id } });
    await clearFailedLogin(user.id);

    return ok(res, {}, 'Password reset. Please login again.');
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const token = req.cookies?.refresh_token || req.body?.refreshToken;
    if (!token) return unauthorized(res, 'No refresh token');
    const stored = await prisma.refreshToken.findUnique({ where: { token } });
    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      return unauthorized(res, 'Invalid refresh token');
    }
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
    const user = await prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user || !user.active) return unauthorized(res, 'User not found');

    await touchUserSession(user.id, req);

    const newAccess = issueAccessToken(user);
    const newRefresh = await issueRefreshToken(user.id);
    setRefreshCookie(res, newRefresh);
    return ok(res, { accessToken: newAccess, refreshToken: newRefresh });
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.post('/logout', async (req, res) => {
  try {
    const token = req.cookies?.refresh_token || req.body?.refreshToken;
    if (token) {
      await prisma.refreshToken.updateMany({ where: { token }, data: { revoked: true } });
    }
    res.clearCookie('refresh_token', { path: '/' });
    return ok(res, {}, 'Logged out');
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.get('/session', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return unauthorized(res);
    const payload: any = jwt.verify(authHeader.slice(7), JWT_SECRET as string);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, mobile: true, wallet: true, mPinHash: true },
    });
    if (!user) return unauthorized(res, 'User not found');

    prisma.user.update({
      where: { id: user.id },
      data: { lastSeen: new Date() },
    }).catch(() => {});

    return ok(res, {
      id: user.id,
      name: user.name,
      mobile: user.mobile,
      wallet: Number(user.wallet),
      hasMpin: !!user.mPinHash,
    });
  } catch {
    return unauthorized(res, 'Invalid session');
  }
});

export default router;