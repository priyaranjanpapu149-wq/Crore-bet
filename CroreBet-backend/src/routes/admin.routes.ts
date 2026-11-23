import { Router } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '../config/db';
import { requireAdmin, requireSuperAdmin } from '../middleware/adminAuth';
import { ok, created, badRequest, unauthorized, notFound, serverError, tooMany } from '../utils/response';
import { updateWallet, creditDepositWithBonus } from '../services/wallet.service';
import { declareResult } from '../services/game.service';
import { sendToTopic, sendToUser } from '../services/fcm.service';
import {
  sendResetOtpEmail,
  sendResetConfirmationEmail,
} from '../services/email.service';
import {
  signTwoFactorTemp,
  verifyTwoFactorTemp,
} from '../utils/jwt';
import {
  generateSecret,
  verifyCode,
  sealSecret,
  generateRecoveryCodes,
  hashRecoveryCodes,
  consumeRecoveryCode,
} from '../services/twoFactor.service';
import { todayIST } from '../utils/dateIST';
const router = Router();

const COOKIE_NAME = 'mhx_admin_session';
const SESSION_DAYS = 7;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// ═══════════════════════════════════════════════════════════════════
// NIGHT-SHIFT DATE HELPER
// Matches autoResult.job.ts and public.routes.ts (3 AM rollover).
// Between 00:00 and 03:00 IST, treats "today" as yesterday so evening
// markets (21:55, 23:55) still count.
// ═══════════════════════════════════════════════════════════════════
function todayISTNightShift(): string {
  const now = new Date();
  const istRaw = new Date(now.getTime() + IST_OFFSET_MS);
  const isNightShift = istRaw.getUTCHours() < 3;
  const ist = isNightShift
    ? new Date(istRaw.getTime() - 24 * 3600 * 1000)
    : istRaw;
  return ist.toISOString().split('T')[0];
}
// ═══════════════════════════════════════════════════════════════════
// DASHBOARD REF DATE — flips at 00:15 IST
// Before 00:15 IST → still "yesterday"
// At/after 00:15 IST → "today"
// ═══════════════════════════════════════════════════════════════════
function todayIST_1215(): string {
  const now = new Date();
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const minsSinceMidnight = ist.getUTCHours() * 60 + ist.getUTCMinutes();

  if (minsSinceMidnight < 15) {
    // Still within the 00:00 – 00:15 grace window → yesterday's date
    const yesterday = new Date(ist.getTime() - 24 * 3600 * 1000);
    return yesterday.toISOString().split('T')[0];
  }
  return ist.toISOString().split('T')[0];
}

function cookieOpts(req: any) {
  return {
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
  };
}

async function createAdminSession(admin: any, req: any, res: any): Promise<void> {
  const sessionToken = crypto.randomBytes(48).toString('hex');

  await prisma.adminSession.create({
    data: {
      adminId: admin.id,
      refreshToken: sessionToken,
      userAgent: (req.headers['user-agent'] as string) || null,
      ipAddress: req.ip || null,
      expiresAt: new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000),
      lastActiveAt: new Date(),
    },
  });

  res.cookie(COOKIE_NAME, sessionToken, cookieOpts(req));

  await prisma.admin.update({
    where: { id: admin.id },
    data: { lastLogin: new Date() },
  });
  await prisma.auditLog.create({
    data: { adminId: admin.id, action: 'login.success', ipAddress: req.ip },
  });
}

function generateOtp(): string {
  return String(crypto.randomInt(100000, 999999));
}

async function getSettingsMap(keys: string[]) {
  const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

// ============================================================
// SHARED RATE RESOLUTION — all 16 game types
// ============================================================
const RATE_SETTING_KEY_MAP: Record<string, string> = {
  single:         'rate_single',
  jodi:           'rate_jodi',
  single_panna:   'rate_singlepatti',
  double_panna:   'rate_doublepatti',
  triple_panna:   'rate_triplepatti',
  family_panna:   'rate_familypanna',
  cycle_patti:    'rate_cyclepatti',
  group_jodi:     'rate_groupjodi',
  sp_dp_tp:       'rate_sp_dp_tp',
  sp_motor:       'rate_sp_motor',
  dp_motor:       'rate_dp_motor',
  odd_even:       'rate_odd_even',
  red_bracket:    'rate_red_bracket',
  half_sangam:    'rate_halfsangam',
  half_sangam_a:  'rate_halfsangam',
  half_sangam_b:  'rate_halfsangam',
  full_sangam:    'rate_fullsangam',
};

async function getRatesForMarket(marketId: string): Promise<Record<string, number>> {
  const settingRows = await prisma.setting.findMany({
    where: { key: { in: Object.values(RATE_SETTING_KEY_MAP) } },
  });

  const rateMap: Record<string, number> = {};

  for (const [gameType, settingKey] of Object.entries(RATE_SETTING_KEY_MAP)) {
    const row = settingRows.find((r) => r.key === settingKey);
    const n = row?.value ? Number(row.value) : NaN;
    if (!isNaN(n) && n > 0) rateMap[gameType] = n;
  }

  const rateRows = await prisma.rate.findMany({ where: { marketId } });
  for (const r of rateRows) {
    const n = Number(r.payout);
    if (!isNaN(n) && n > 0) rateMap[r.gameType] = n;
  }

  return rateMap;
}

// Standard game types — anything else = "personal/custom"
const STANDARD_GAME_TYPES = [
  'single',
  'jodi',
  'single_panna',
  'double_panna',
  'triple_panna',
  'family_panna',
  'cycle_patti',
  'group_jodi',
  'sp_dp_tp',
  'sp_motor',
  'dp_motor',
  'odd_even',
  'red_bracket',
  'half_sangam',
  'half_sangam_a',
  'half_sangam_b',
  'full_sangam',
];

// ============================================================
// LOGIN FLOW
// ============================================================
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return badRequest(res, 'Email and password required');

    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin || !admin.active) return unauthorized(res, 'Invalid credentials');

    const match = await bcrypt.compare(password, admin.passwordHash);
    if (!match) return unauthorized(res, 'Invalid credentials');

    // ── 2FA branch ─────────────────────────────────────────
    if (admin.twofaEnabled && admin.twofaSecret) {
      const tempToken = signTwoFactorTemp(admin.id);
      await prisma.auditLog.create({
        data: { adminId: admin.id, action: 'login.2fa.required', ipAddress: req.ip },
      });
      return ok(res, { twoFactorRequired: true, tempToken }, '2FA code required');
    }

    // ── No 2FA — issue session directly ────────────────────
    await createAdminSession(admin, req, res);

    return ok(
      res,
      {
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          twoFactorEnabled: false,
        },
      },
      'Login successful',
    );
  } catch (e: any) {
    console.error('auth/login:', e.message);
    return serverError(res, 'Login failed');
  }
});
// ============================================================
// 2FA VERIFY (public — uses tempToken, NOT a session)
// ============================================================
router.post('/auth/2fa/verify', async (req, res) => {
  try {
    const { tempToken, token } = req.body;
    if (!tempToken || !token) {
      return badRequest(res, 'tempToken and token required');
    }

    let payload;
    try {
      payload = verifyTwoFactorTemp(tempToken);
    } catch {
      return unauthorized(res, 'Invalid or expired 2FA session. Please login again.');
    }

    const admin = await prisma.admin.findUnique({ where: { id: payload.sub } });
    if (!admin || !admin.active) return unauthorized(res, 'Admin not found');
    if (!admin.twofaEnabled || !admin.twofaSecret) {
      return badRequest(res, '2FA not enabled for this account');
    }

    // ── Try TOTP first ────────────────────────────────────
    let verified = verifyCode(admin.twofaSecret, String(token));

    // ── Fallback: recovery code ───────────────────────────
    if (!verified) {
      const recovery = await consumeRecoveryCode(
        admin.twofaRecoveryCodes || [],
        String(token),
      );
      if (recovery.ok) {
        verified = true;
        await prisma.admin.update({
          where: { id: admin.id },
          data: { twofaRecoveryCodes: recovery.remainingHashes },
        });
        await prisma.auditLog.create({
          data: {
            adminId: admin.id,
            action: 'login.2fa.recovery_used',
            ipAddress: req.ip,
          },
        });
      }
    }

    if (!verified) {
      await prisma.auditLog.create({
        data: { adminId: admin.id, action: 'login.2fa.failed', ipAddress: req.ip },
      });
      return unauthorized(res, 'Invalid code');
    }

    await createAdminSession(admin, req, res);
    await prisma.auditLog.create({
      data: { adminId: admin.id, action: 'login.2fa.success', ipAddress: req.ip },
    });

    return ok(
      res,
      {
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          twoFactorEnabled: true,
        },
      },
      'Login successful',
    );
  } catch (e: any) {
    console.error('auth/2fa/verify:', e.message);
    return serverError(res, e.message);
  }
});
// ============================================================
// FORGOT PASSWORD
// ============================================================
router.post('/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return badRequest(res, 'Valid email required');
    }

    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin || !admin.active) {
      return ok(res, {}, 'If the email exists, a reset OTP has been sent');
    }

    const cfg = await getSettingsMap(['admin_otp_rate_limit', 'admin_otp_window_minutes']);
    const windowMin = Number(cfg.admin_otp_window_minutes || 10);
    const maxTries = Number(cfg.admin_otp_rate_limit || 3);

    const since = new Date(Date.now() - windowMin * 60 * 1000);
    const cnt = await prisma.adminOtp.count({
      where: { email, type: 'reset', createdAt: { gte: since } },
    });
    if (cnt >= maxTries) {
      return tooMany(res, `Too many OTP requests. Try again in ${windowMin} minutes.`);
    }

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);

    await prisma.adminOtp.create({
      data: {
        email,
        otpHash,
        type: 'reset',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    await sendResetOtpEmail(email, otp);
    await prisma.auditLog.create({
      data: { adminId: admin.id, action: 'reset.otp.sent', ipAddress: req.ip },
    });

    return ok(res, { email }, 'Reset OTP sent to your registered email');
  } catch (e: any) {
    console.error('auth/forgot-password:', e.message);
    return serverError(res, 'Failed to send OTP');
  }
});

router.post('/auth/verify-reset-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp || otp.length !== 6) return badRequest(res, 'Invalid input');

    const record = await prisma.adminOtp.findFirst({
      where: { email, type: 'reset', used: false },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) return badRequest(res, 'No OTP found. Request a new one.');
    if (record.expiresAt < new Date()) return badRequest(res, 'OTP has expired');
    if (record.attempts >= 5) return badRequest(res, 'Too many attempts. Request a new OTP.');

    const match = await bcrypt.compare(otp, record.otpHash);
    if (!match) {
      await prisma.adminOtp.update({
        where: { id: record.id },
        data: { attempts: record.attempts + 1 },
      });
      return badRequest(res, 'Invalid OTP');
    }

    await prisma.adminOtp.update({ where: { id: record.id }, data: { used: true } });

    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin || !admin.active) return unauthorized(res, 'Admin not found');

    const plainToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(plainToken, 10);

    await prisma.adminResetToken.create({
      data: {
        adminId: admin.id,
        email,
        tokenHash,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    await prisma.adminOtp.updateMany({
      where: { email, type: 'reset', used: false },
      data: { used: true },
    });

    await prisma.auditLog.create({
      data: { adminId: admin.id, action: 'reset.otp.verified', ipAddress: req.ip },
    });

    return ok(res, { email, resetToken: plainToken }, 'OTP verified - set new password');
  } catch (e: any) {
    console.error('auth/verify-reset-otp:', e.message);
    return serverError(res, e.message);
  }
});

router.post('/auth/reset-password', async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;
    if (!email || !resetToken || !newPassword) return badRequest(res, 'Missing fields');
    if (newPassword.length < 8)
      return badRequest(res, 'Password must be at least 8 characters');

    const tokens = await prisma.adminResetToken.findMany({
      where: { email, used: false },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    let matched: (typeof tokens)[0] | null = null;
    for (const t of tokens) {
      if (await bcrypt.compare(resetToken, t.tokenHash)) {
        matched = t;
        break;
      }
    }
    if (!matched) return badRequest(res, 'Invalid or expired reset session');
    if (matched.expiresAt < new Date()) {
      return badRequest(res, 'Reset session has expired. Please start again.');
    }

    const admin = await prisma.admin.findUnique({ where: { id: matched.adminId } });
    if (!admin || !admin.active) return unauthorized(res, 'Admin not found');

    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.admin.update({
      where: { id: admin.id },
      data: { passwordHash: newHash },
    });

    await prisma.adminResetToken.update({
      where: { id: matched.id },
      data: { used: true },
    });
    await prisma.adminResetToken.updateMany({
      where: { adminId: admin.id, used: false },
      data: { used: true },
    });
    await prisma.adminSession.updateMany({
      where: { adminId: admin.id, active: true },
      data: { active: false },
    });

    await prisma.auditLog.create({
      data: { adminId: admin.id, action: 'password.reset.success', ipAddress: req.ip },
    });

    try {
      await sendResetConfirmationEmail(admin.email, admin.name, new Date());
    } catch (e: any) {
      console.error('Confirmation email failed:', e.message);
    }

    return ok(res, {}, 'Password updated successfully');
  } catch (e: any) {
    console.error('auth/reset-password:', e.message);
    return serverError(res, e.message);
  }
});

router.post('/auth/logout', async (req, res) => {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (token) {
      await prisma.adminSession.updateMany({
        where: { refreshToken: token },
        data: { active: false },
      });
    }
    res.clearCookie(COOKIE_NAME, { path: '/' });
    return ok(res, {}, 'Logged out');
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.get('/auth/me', requireAdmin, async (req, res) => {
  try {
    const admin = await prisma.admin.findUnique({
      where: { id: req.admin!.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        twofaEnabled: true,
      },
    });
    if (!admin || !admin.active) return unauthorized(res, 'Admin not found');
    return ok(res, {
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        twoFactorEnabled: admin.twofaEnabled,
      },
    });
  } catch (e: any) {
    return serverError(res, e.message);
  }
});
// ============================================================
// ALL BELOW REQUIRE ADMIN
// ============================================================
router.use(requireAdmin);
// ============================================================
// 2FA MANAGEMENT (all below need an active session)
// ============================================================
router.post('/auth/2fa/setup', async (req, res) => {
  try {
    const admin = await prisma.admin.findUnique({ where: { id: req.admin!.sub } });
    if (!admin) return unauthorized(res, 'Admin not found');
    if (admin.twofaEnabled) {
      return badRequest(res, '2FA already enabled. Disable first to re-setup.');
    }

    const { qrDataUrl, secret } = await generateSecret(admin.email);
    const encrypted = sealSecret(secret);

    await prisma.admin.update({
      where: { id: admin.id },
      data: { twofaSecret: encrypted }, // store but do NOT enable yet
    });

    await prisma.auditLog.create({
      data: { adminId: admin.id, action: '2fa.setup.initiated', ipAddress: req.ip },
    });

    return ok(res, { qr: qrDataUrl, secret }, 'Scan with Google Authenticator');
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.post('/auth/2fa/verify-setup', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token || String(token).length !== 6) {
      return badRequest(res, '6-digit code required');
    }

    const admin = await prisma.admin.findUnique({ where: { id: req.admin!.sub } });
    if (!admin) return unauthorized(res, 'Admin not found');
    if (admin.twofaEnabled) return badRequest(res, '2FA already enabled');
    if (!admin.twofaSecret) return badRequest(res, 'Start setup first');

    if (!verifyCode(admin.twofaSecret, String(token))) {
      return badRequest(res, 'Invalid code');
    }

    const plainCodes = generateRecoveryCodes(10);
    const hashedCodes = await hashRecoveryCodes(plainCodes);

    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        twofaEnabled: true,
        twofaRecoveryCodes: hashedCodes,
        tokenVersion: { increment: 1 },
      },
    });

    await prisma.auditLog.create({
      data: { adminId: admin.id, action: '2fa.enabled', ipAddress: req.ip },
    });

    return ok(
      res,
      { recoveryCodes: plainCodes },
      '2FA enabled. Save these recovery codes — they will not be shown again.',
    );
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.post('/auth/2fa/disable', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token && !password) {
      return badRequest(res, 'Provide TOTP code or password');
    }

    const admin = await prisma.admin.findUnique({ where: { id: req.admin!.sub } });
    if (!admin) return unauthorized(res, 'Admin not found');
    if (!admin.twofaEnabled) return badRequest(res, '2FA not enabled');

    let verified = false;
    if (password) {
      verified = await bcrypt.compare(String(password), admin.passwordHash);
    } else if (token && admin.twofaSecret) {
      verified = verifyCode(admin.twofaSecret, String(token));
    }
    if (!verified) return unauthorized(res, 'Invalid credentials');

    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        twofaEnabled: false,
        twofaSecret: null,
        twofaRecoveryCodes: [],
        tokenVersion: { increment: 1 },
      },
    });

    await prisma.auditLog.create({
      data: { adminId: admin.id, action: '2fa.disabled', ipAddress: req.ip },
    });

    return ok(res, { ok: true }, '2FA disabled');
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.post('/auth/2fa/regenerate-recovery', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token || String(token).length !== 6) {
      return badRequest(res, '6-digit code required');
    }

    const admin = await prisma.admin.findUnique({ where: { id: req.admin!.sub } });
    if (!admin) return unauthorized(res, 'Admin not found');
    if (!admin.twofaEnabled || !admin.twofaSecret) {
      return badRequest(res, '2FA not enabled');
    }

    if (!verifyCode(admin.twofaSecret, String(token))) {
      return unauthorized(res, 'Invalid code');
    }

    const plainCodes = generateRecoveryCodes(10);
    const hashedCodes = await hashRecoveryCodes(plainCodes);

    await prisma.admin.update({
      where: { id: admin.id },
      data: { twofaRecoveryCodes: hashedCodes },
    });

    await prisma.auditLog.create({
      data: { adminId: admin.id, action: '2fa.recovery.regenerated', ipAddress: req.ip },
    });

    return ok(res, { recoveryCodes: plainCodes }, 'New recovery codes generated');
  } catch (e: any) {
    return serverError(res, e.message);
  }
});
router.get('/auth/sessions', async (req, res) => {
  try {
    const sessions = await prisma.adminSession.findMany({
      where: { adminId: req.admin!.sub, active: true },
      orderBy: { lastActiveAt: 'desc' },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        lastActiveAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });
    return ok(res, sessions);
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.post('/auth/sessions/:id/revoke', async (req, res) => {
  try {
    await prisma.adminSession.update({
      where: { id: String(req.params.id) },
      data: { active: false },
    });
    return ok(res, {}, 'Session revoked');
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.post('/change-password', async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return badRequest(res, 'Missing fields');
    if (newPassword.length < 8) return badRequest(res, 'Min 8 chars');
    const admin = await prisma.admin.findUnique({ where: { id: req.admin!.sub } });
    if (!admin) return notFound(res);
    const okPwd = await bcrypt.compare(oldPassword, admin.passwordHash);
    if (!okPwd) return badRequest(res, 'Old password incorrect');
    await prisma.admin.update({
      where: { id: admin.id },
      data: { passwordHash: await bcrypt.hash(newPassword, 12) },
    });
    return ok(res, {}, 'Password updated');
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

// ============================================================
// OC CUTTING GROUP
// ============================================================
const SESSION_TYPES: Record<string, string[]> = {
  open: ['single', 'single_panna', 'double_panna', 'triple_panna'],
  close: ['single', 'single_panna', 'double_panna', 'triple_panna'],
  jodi: ['jodi'],
  half_sangam: ['half_sangam'],
  full_sangam: ['full_sangam'],
};

router.get('/oc-cutting', async (req, res) => {
  try {
    const { date, marketId, session } = req.query;
    if (!date || !marketId || !session) {
      return badRequest(res, 'date, marketId, session required');
    }
    const dayStart = new Date(String(date) + 'T00:00:00.000+05:30');
    const dayEnd = new Date(String(date) + 'T23:59:59.999+05:30');

    const market = await prisma.market.findUnique({ where: { id: String(marketId) } });
    if (!market) return notFound(res, 'Market not found');

    let rateMap: Record<string, number>;
    try {
      rateMap = await getRatesForMarket(market.id);
    } catch (err: any) {
      return badRequest(res, err.message);
    }

    const sumBids = async (gameTypes: string[], sessionFilter?: string) => {
      const where: any = {
        marketId: market.id,
        gameType: { in: gameTypes },
        bidDate: { gte: dayStart, lte: dayEnd },
      };
      if (sessionFilter) where.session = sessionFilter;

      const [all, won] = await Promise.all([
        prisma.bid.aggregate({ where, _sum: { amount: true }, _count: true }),
        prisma.bid.aggregate({
          where: { ...where, status: 'won' },
          _sum: { amount: true, payout: true },
        }),
      ]);
      return {
        total: Number(all._sum.amount || 0),
        count: all._count || 0,
        wonTotal: Number(won._sum.amount || 0),
        wonPayout: Number(won._sum.payout || 0),
      };
    };

    const singleSession = session === 'open' || session === 'close' ? String(session) : undefined;
    const single = await sumBids(['single'], singleSession);
    const jodi = await sumBids(['jodi']);
    const pana = await sumBids(['single_panna', 'double_panna', 'triple_panna'], singleSession);
    const half = await sumBids(['half_sangam']);
    const full = await sumBids(['full_sangam']);

    const panaBreakdown = await Promise.all([
      sumBids(['single_panna'], singleSession),
      sumBids(['double_panna'], singleSession),
      sumBids(['triple_panna'], singleSession),
    ]);

    const singlePayoutIfWon = (single.wonTotal || 0) * (rateMap.single ?? 0);
    const jodiPayoutIfWon = (jodi.wonTotal || 0) * (rateMap.jodi ?? 0);
    const panaPayoutIfWon =
      (panaBreakdown[0].wonTotal || 0) * (rateMap.single_panna ?? 0) +
      (panaBreakdown[1].wonTotal || 0) * (rateMap.double_panna ?? 0) +
      (panaBreakdown[2].wonTotal || 0) * (rateMap.triple_panna ?? 0);
    const halfPayoutIfWon = (half.wonTotal || 0) * (rateMap.half_sangam ?? 0);
    const fullPayoutIfWon = (full.wonTotal || 0) * (rateMap.full_sangam ?? 0);

    const totalPlay = single.total + jodi.total + pana.total + half.total + full.total;
    const totalPayout = singlePayoutIfWon + jodiPayoutIfWon + panaPayoutIfWon + halfPayoutIfWon + fullPayoutIfWon;

    const gameTypes = SESSION_TYPES[String(session)] || [];
    const sessionFilter = session === 'open' || session === 'close' ? String(session) : undefined;

    const breakdownWhere: any = {
      marketId: market.id,
      gameType: { in: gameTypes },
      bidDate: { gte: dayStart, lte: dayEnd },
    };
    if (sessionFilter) breakdownWhere.session = sessionFilter;

    const grouped = await prisma.bid.groupBy({
      by: ['digits', 'gameType'],
      where: breakdownWhere,
      _sum: { amount: true },
    });

    const digitMap = new Map<string, { total: number; byType: Record<string, number> }>();
    for (const g of grouped) {
      const digit = g.digits;
      const existing = digitMap.get(digit) || { total: 0, byType: {} };
      const amt = Number(g._sum.amount || 0);
      existing.total += amt;
      existing.byType[g.gameType] = (existing.byType[g.gameType] || 0) + amt;
      digitMap.set(digit, existing);
    }

    let bookTotal = 0;
    if (session === 'open' || session === 'close') bookTotal = single.total + pana.total;
    else if (session === 'jodi') bookTotal = jodi.total;
    else if (session === 'half_sangam') bookTotal = half.total;
    else if (session === 'full_sangam') bookTotal = full.total;

    const breakdown = Array.from(digitMap.entries())
      .map(([digit, data]) => {
        let payout = 0;
        for (const [gt, amt] of Object.entries(data.byType)) {
          payout += amt * (rateMap[gt] ?? 0);
        }
        const profit = bookTotal > payout ? bookTotal - payout : 0;
        const loss = bookTotal < payout ? payout - bookTotal : 0;
        return { digit, totalBids: data.total, amountToPay: payout, profit, loss };
      })
      .sort((a, b) => b.totalBids - a.totalBids);

    return ok(res, {
      market: { id: market.id, name: market.name },
      session,
      date,
      summary: {
        single: { total: single.total, profit: single.total - singlePayoutIfWon, payout: singlePayoutIfWon },
        jodi: { total: jodi.total, profit: jodi.total - jodiPayoutIfWon, payout: jodiPayoutIfWon },
        pana: { total: pana.total, profit: pana.total - panaPayoutIfWon, payout: panaPayoutIfWon },
        halfSangam: { total: half.total, profit: half.total - halfPayoutIfWon, payout: halfPayoutIfWon },
        fullSangam: { total: full.total, profit: full.total - fullPayoutIfWon, payout: fullPayoutIfWon },
        totalPlay,
        totalPayout,
        totalProfit: totalPlay - totalPayout,
      },
      breakdown,
    });
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.get('/oc-cutting/winners', async (req, res) => {
  try {
    const { date, marketId, session, digit } = req.query;
    if (!date || !marketId || !session || !digit) {
      return badRequest(res, 'date, marketId, session, digit required');
    }
    const dayStart = new Date(String(date) + 'T00:00:00.000+05:30');
    const dayEnd = new Date(String(date) + 'T23:59:59.999+05:30');
    const gameTypes = SESSION_TYPES[String(session)] || [];
    const sessionFilter = session === 'open' || session === 'close' ? String(session) : undefined;

    const where: any = {
      marketId: String(marketId),
      gameType: { in: gameTypes },
      digits: String(digit),
      bidDate: { gte: dayStart, lte: dayEnd },
    };
    if (sessionFilter) where.session = sessionFilter;

    const bids = await prisma.bid.findMany({
      where,
      include: { user: { select: { mobile: true, name: true } } },
      orderBy: { bidDate: 'desc' },
      take: 500,
    });

    const rows = bids.map((b) => ({
      id: b.id,
      userName: b.user?.name || 'N/A',
      userMobile: b.user?.mobile || 'N/A',
      gameType: b.gameType,
      amount: Number(b.amount),
      payout: Number(b.payout || 0),
      status: b.status,
      betDate: b.bidDate,
    }));

    return ok(res, rows);
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

// ============================================================
// BETTING REPORT
// ============================================================
router.get('/betting-report', async (req, res) => {
  try {
    const { date, marketId, session } = req.query;
    if (!date || !marketId || !session) {
      return badRequest(res, 'date, marketId, session required');
    }
    const dayStart = new Date(String(date) + 'T00:00:00.000+05:30');
    const dayEnd = new Date(String(date) + 'T23:59:59.999+05:30');
    const market = await prisma.market.findUnique({ where: { id: String(marketId) } });
    if (!market) return notFound(res, 'Market not found');

    const sessionFilter = String(session).toLowerCase();

    // ═══════════════════════════════════════════════════════════
    // 🚀 All 15 game types
    //    • useSession=true  → filtered by open/close, shown in both
    //    • useSession=false → sessionless (jodi etc.)
    //      Only rendered in the CLOSE report so the same bids
    //      don't appear in both OPEN and CLOSE.
    // ═══════════════════════════════════════════════════════════
    const TYPES = [
      // Session-based
      { key: 'single',       gameType: 'single',       useSession: true  },
      { key: 'single_panna', gameType: 'single_panna', useSession: true  },
      { key: 'double_panna', gameType: 'double_panna', useSession: true  },
      { key: 'triple_panna', gameType: 'triple_panna', useSession: true  },
      { key: 'family_panna', gameType: 'family_panna', useSession: true  },
      { key: 'cycle_patti',  gameType: 'cycle_patti',  useSession: true  },
      { key: 'sp_motor',     gameType: 'sp_motor',     useSession: true  },
      { key: 'dp_motor',     gameType: 'dp_motor',     useSession: true  },
      { key: 'odd_even',     gameType: 'odd_even',     useSession: true  },
      { key: 'sp_dp_tp',      gameType: 'sp_dp_tp',      useSession: false },

      // Sessionless — shown only in the CLOSE report
      { key: 'jodi',          gameType: 'jodi',          useSession: false },
      { key: 'group_jodi',    gameType: 'group_jodi',    useSession: false },
      { key: 'red_bracket',   gameType: 'red_bracket',   useSession: false },
      { key: 'half_sangam_a', gameType: 'half_sangam_a', useSession: false },
      { key: 'full_sangam',   gameType: 'full_sangam',   useSession: false },
    ];

    const columns: Record<string, { total: number; rows: { digit: string; amount: number }[] }> = {};

        for (const t of TYPES) {
      // 🚀 Show ALL 15 game types in BOTH OPEN and CLOSE reports.
      //    Session-based games filter on the current session.
      //    Sessionless games (jodi, group_jodi, red_bracket,
      //    half_sangam_a, full_sangam) return the full day's totals
      //    in both views.
      const where: any = {
        marketId: market.id,
        gameType: t.gameType,
        bidDate: { gte: dayStart, lte: dayEnd },
      };
      if (t.useSession) where.session = sessionFilter;

      const grouped = await prisma.bid.groupBy({
        by: ['digits'],
        where,
        _sum: { amount: true },
        orderBy: { digits: 'asc' },
      });

      const rows = grouped
        .map((g) => ({ digit: g.digits, amount: Number(g._sum.amount || 0) }))
        .filter((r) => r.amount > 0);

      const total = rows.reduce((s, r) => s + r.amount, 0);
      columns[t.key] = { total, rows };
    }

    return ok(res, {
      market: { id: market.id, name: market.name },
      date,
      session,
      columns,
    });
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

// ============================================================
// WINNER PREDICTION
// ============================================================
router.get('/winner-prediction', async (req, res) => {
  try {
    const { date, marketId, session, panna, digit, cpanna, cdigit } = req.query;

    if (!date || !marketId || !session) {
      return badRequest(res, 'date, marketId, session required');
    }
    if (!['open', 'close'].includes(String(session))) {
      return badRequest(res, 'session must be open or close');
    }

    const dayStart = new Date(String(date) + 'T00:00:00.000+05:30');
    const dayEnd = new Date(String(date) + 'T23:59:59.999+05:30');

    const market = await prisma.market.findUnique({ where: { id: String(marketId) } });
    if (!market) return notFound(res, 'Market not found');

    let rateMap: Record<string, number>;
    try {
      rateMap = await getRatesForMarket(market.id);
    } catch (err: any) {
      return badRequest(res, err.message);
    }

    const where: any = {
      marketId: market.id,
      bidDate: { gte: dayStart, lte: dayEnd },
      status: { in: ['pending', 'won', 'lost'] },
    };

    // 🚀 Panna-tier games (all use the same 3-digit panna)
    const PANNA_GAMES = [
      'single_panna', 'double_panna', 'triple_panna',
      'family_panna', 'cycle_patti', 'sp_motor', 'dp_motor',
    ];

    if (session === 'open') {
      const openDigit = String(digit || '');
      const openPanna = String(panna || '');

      const openOr: any[] = [
        { session: 'open', gameType: 'single', digits: openDigit },
        { session: 'open', gameType: 'odd_even' },
      ];
      if (openPanna) {
        openOr.push({
          session: 'open',
          gameType: { in: PANNA_GAMES },
          digits: openPanna,
        });
      }
      where.OR = openOr;
    } else {
      // Fetch open result for the same day (jodi + sangam + sp_dp_tp need it)
      const openResult = await prisma.result.findFirst({
        where: {
          marketId: market.id,
          session: 'open',
          resultDate: { gte: dayStart, lte: dayEnd },
        },
      });

      const openDigit = openResult?.openResult || '';
      const openPanna = openResult?.pannaResult || '';
      const cDigit = String(cdigit || '');
      const cPanna = String(cpanna || '');

      // 🚀 All the derived digits for combination games
      const jodi      = openDigit && cDigit  ? `${openDigit}${cDigit}`           : '';
      const halfA     = openPanna && cDigit  ? `${openPanna}-${cDigit}`          : '';  // Half Sangam A
      const halfB     = openDigit && cPanna  ? `${openDigit}-${cPanna}`          : '';  // Half Sangam B
      const full      = openPanna && cPanna  ? `${openPanna}-${cPanna}`          : '';  // Full Sangam
      const spDpTp    = openDigit && cDigit && openPanna && cPanna
                        ? `${openDigit}${cDigit}-${openPanna}${cPanna}`          : '';

      const closeOr: any[] = [
        { session: 'close', gameType: 'single', digits: cDigit },
        { session: 'close', gameType: 'odd_even' },
      ];
      if (cPanna) {
        closeOr.push({
          session: 'close',
          gameType: { in: PANNA_GAMES },
          digits: cPanna,
        });
      }

      // Sessionless combined games (session column is NULL in DB)
      if (jodi) {
        closeOr.push({ session: null, gameType: { in: ['jodi', 'group_jodi'] }, digits: jodi });
        closeOr.push({ session: null, gameType: 'red_bracket', digits: jodi });
      }
      if (halfA)  closeOr.push({ session: null, gameType: 'half_sangam_a', digits: halfA });
      if (halfB)  closeOr.push({ session: null, gameType: 'half_sangam_b', digits: halfB });
      if (full)   closeOr.push({ session: null, gameType: 'full_sangam',   digits: full });
      if (spDpTp) closeOr.push({ session: null, gameType: 'sp_dp_tp',      digits: spDpTp });

      where.OR = closeOr;
    }

    const bids = await prisma.bid.findMany({
      where,
      include: { user: { select: { mobile: true, name: true } } },
      orderBy: { bidDate: 'desc' },
      take: 500,
    });

    const rows = bids.map((b) => {
      const amt = Number(b.amount);
      const rate = rateMap[b.gameType];

      // 🚀 Use the stored payout if available — that's what will actually be credited.
      //    Fall back to amt × current rate only if payout was never set.
      const payoutNum = Number(b.payout) || 0;
      const winning = payoutNum > 0 ? payoutNum : (rate ? amt * rate : 0);

      if (rate === undefined && payoutNum === 0) {
        console.warn(`[winner-prediction] No rate for gameType=${b.gameType} — winning set to 0`);
      }

      return {
        id: b.id,
        userName: b.user?.name || 'N/A',
        userMobile: b.user?.mobile || 'N/A',
        amount: amt,
        winning,
        marketName: market.name,
        gameType: b.gameType,
        digits: b.digits,
        session: b.session,
        status: b.status,
        betDate: b.bidDate,
      };
    });

    const totalBid = rows.reduce((s, r) => s + r.amount, 0);
    const totalWin = rows.reduce((s, r) => s + r.winning, 0);

    return ok(res, {
      market: { id: market.id, name: market.name },
      session,
      date,
      totalBid,
      totalWin,
      ratesUsed: rateMap,
      rows,
    });
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

// ============================================================
// AUTO RESULT
// ============================================================
router.get('/auto-result/config', async (req, res) => {
  try {
    const row = await prisma.setting.findUnique({ where: { key: 'auto_result' } });
    return ok(res, { enabled: row?.value === '1' });
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.post('/auto-result/config', async (req, res) => {
  try {
    const { enabled } = req.body;
    await prisma.setting.upsert({
      where: { key: 'auto_result' },
      create: { key: 'auto_result', value: enabled ? '1' : '0' },
      update: { value: enabled ? '1' : '0' },
    });
    await prisma.auditLog.create({
      data: {
        adminId: req.admin!.sub,
        action: 'auto_result.config',
        details: enabled ? 'enabled' : 'disabled',
        ipAddress: req.ip,
      },
    });
    return ok(res, { enabled: Boolean(enabled) }, 'Updated');
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.get('/auto-result/sites', async (req, res) => {
  try {
    const rows = await prisma.autoResultConfig.findMany({
      orderBy: [{ priority: 'asc' }, { site: 'asc' }],
    });
    return ok(res, rows);
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.post('/auto-result/sites', async (req, res) => {
  try {
    const { site, siteUrl, priority, active } = req.body;
    if (!site || !siteUrl) return badRequest(res, 'site and siteUrl required');
    const row = await prisma.autoResultConfig.create({
      data: {
        site,
        siteUrl,
        priority: Number(priority) || 0,
        active: active !== false,
      },
    });
    await prisma.auditLog.create({
      data: {
        adminId: req.admin!.sub,
        action: 'auto_result.site.add',
        details: `${site} (${siteUrl})`,
        ipAddress: req.ip,
      },
    });
    return created(res, row, 'Site added');
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.post('/auto-result/sites/bulk-update', async (req, res) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates)) return badRequest(res, 'updates array required');
    for (const u of updates) {
      await prisma.autoResultConfig.update({
        where: { id: String(u.id) },
        data: {
          active: Boolean(u.active),
          priority: Number(u.priority) || 0,
        },
      });
    }
    await prisma.auditLog.create({
      data: {
        adminId: req.admin!.sub,
        action: 'auto_result.sites.bulk_update',
        details: `${updates.length} sites`,
        ipAddress: req.ip,
      },
    });
    return ok(res, {}, 'Updated');
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.delete('/auto-result/sites/:id', async (req, res) => {
  try {
    await prisma.autoResultConfig.delete({ where: { id: String(req.params.id) } });
    return ok(res, {}, 'Deleted');
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.post('/auto-result/sites/check', async (req, res) => {
  try {
    const { id } = req.body;
    const where = id ? { id: String(id) } : {};
    const sites = await prisma.autoResultConfig.findMany({ where });

    const results: any[] = [];
    for (const s of sites) {
      let status = 'not_working';
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 8000);
        const r = await fetch(s.siteUrl, {
          signal: controller.signal,
          method: 'GET',
          redirect: 'follow',
        });
        clearTimeout(t);
        status = r.ok || r.status < 500 ? 'working' : 'not_working';
      } catch {
        status = 'not_working';
      }
      await prisma.autoResultConfig.update({
        where: { id: s.id },
        data: { status, lastCheck: new Date() },
      });
      results.push({ id: s.id, site: s.site, status });
    }
    return ok(res, results, `Checked ${sites.length} site(s)`);
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

// ============================================================
// GAME PROVIDERS
// ============================================================
router.put('/games/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { name, slug, openTime, closeTime, days, active, autoResult, type } = req.body;
    const m = await prisma.market.update({
      where: { id: String(req.params.id) },
      data: {
        name,
        slug,
        type: type || undefined,
        openTime: openTime ?? null,
        closeTime: closeTime ?? null,
        days: days ?? null,
        active: active === undefined ? undefined : Boolean(active),
        autoResult: autoResult === undefined ? undefined : Boolean(autoResult),
      },
    });
    await prisma.auditLog.create({
      data: {
        adminId: req.admin!.sub,
        action: 'game.update',
        details: name,
        ipAddress: req.ip,
      },
    });
    return ok(res, m, 'Market updated');
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.delete('/games/:id', requireSuperAdmin, async (req, res) => {
  try {
    const m = await prisma.market.findUnique({ where: { id: String(req.params.id) } });
    if (!m) return notFound(res);
    await prisma.market.delete({ where: { id: m.id } });
    await prisma.auditLog.create({
      data: {
        adminId: req.admin!.sub,
        action: 'game.delete',
        details: `${m.name}`,
        ipAddress: req.ip,
      },
    });
    return ok(res, {}, 'Market deleted');
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.post('/games/:id/toggle-active', async (req, res) => {
  try {
    const m = await prisma.market.findUnique({ where: { id: String(req.params.id) } });
    if (!m) return notFound(res);
    const updated = await prisma.market.update({
      where: { id: m.id },
      data: { active: !m.active },
    });
    return ok(res, updated, `Market ${updated.active ? 'activated' : 'deactivated'}`);
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.post('/games/:id/toggle-auto-result', async (req, res) => {
  try {
    const m = await prisma.market.findUnique({ where: { id: String(req.params.id) } });
    if (!m) return notFound(res);
    const updated = await prisma.market.update({
      where: { id: m.id },
      data: { autoResult: !m.autoResult },
    });
    return ok(res, updated, `Auto Result ${updated.autoResult ? 'enabled' : 'disabled'}`);
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

// ============================================================
// GAME RATES
// ============================================================
const RATE_KEYS = [
  'rate_single',
  'rate_jodi',
  'rate_singlepatti',
  'rate_doublepatti',
  'rate_triplepatti',
  'rate_familypanna',
  'rate_cyclepatti',
  'rate_groupjodi',
  'rate_sp_dp_tp',
  'rate_sp_motor',
  'rate_dp_motor',
  'rate_odd_even',
  'rate_red_bracket',
  'rate_halfsangam',
  'rate_fullsangam',
] as const;

router.get('/game-rates', async (req, res) => {
  try {
    const rows = await prisma.setting.findMany({ where: { key: { in: [...RATE_KEYS] } } });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

    return ok(res, {
      single: map.rate_single ? Number(map.rate_single) : 0,
      jodi: map.rate_jodi ? Number(map.rate_jodi) : 0,
      single_panna: map.rate_singlepatti ? Number(map.rate_singlepatti) : 0,
      double_panna: map.rate_doublepatti ? Number(map.rate_doublepatti) : 0,
      triple_panna: map.rate_triplepatti ? Number(map.rate_triplepatti) : 0,
      family_panna: map.rate_familypanna ? Number(map.rate_familypanna) : 0,
      cycle_patti: map.rate_cyclepatti ? Number(map.rate_cyclepatti) : 0,
      group_jodi: map.rate_groupjodi ? Number(map.rate_groupjodi) : 0,
      sp_dp_tp: map.rate_sp_dp_tp ? Number(map.rate_sp_dp_tp) : 0,
      sp_motor: map.rate_sp_motor ? Number(map.rate_sp_motor) : 0,
      dp_motor: map.rate_dp_motor ? Number(map.rate_dp_motor) : 0,
      odd_even: map.rate_odd_even ? Number(map.rate_odd_even) : 0,
      red_bracket: map.rate_red_bracket ? Number(map.rate_red_bracket) : 0,
      half_sangam: map.rate_halfsangam ? Number(map.rate_halfsangam) : 0,
      full_sangam: map.rate_fullsangam ? Number(map.rate_fullsangam) : 0,
    });
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.post('/game-rates', requireSuperAdmin, async (req, res) => {
  try {
    const b = req.body as Record<string, any>;

    const map: Record<string, string> = {};
    const pairs: [string, string][] = [
      ['single', 'rate_single'],
      ['jodi', 'rate_jodi'],
      ['single_panna', 'rate_singlepatti'],
      ['double_panna', 'rate_doublepatti'],
      ['triple_panna', 'rate_triplepatti'],
      ['family_panna', 'rate_familypanna'],
      ['cycle_patti', 'rate_cyclepatti'],
      ['group_jodi', 'rate_groupjodi'],
      ['sp_dp_tp', 'rate_sp_dp_tp'],
      ['sp_motor', 'rate_sp_motor'],
      ['dp_motor', 'rate_dp_motor'],
      ['odd_even', 'rate_odd_even'],
      ['red_bracket', 'rate_red_bracket'],
      ['half_sangam', 'rate_halfsangam'],
      ['full_sangam', 'rate_fullsangam'],
    ];

    for (const [field, key] of pairs) {
      const n = Number(b[field]);
      if (!isNaN(n) && n > 0) map[key] = String(n);
    }

    for (const [key, value] of Object.entries(map)) {
      await prisma.setting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      });
    }

    await prisma.auditLog.create({
      data: {
        adminId: req.admin!.sub,
        action: 'game_rates.update',
        details: JSON.stringify(b),
        ipAddress: req.ip,
      },
    });
    return ok(res, {}, 'Rates saved');
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

// ============================================================
// GAME RESULT — Today list, winners, reverse
// ============================================================
router.get('/game-result/today', async (req, res) => {
  try {
    let date = req.query.date ? String(req.query.date) : todayISTNightShift();

    // Night-shift guard: during 00:00–03:00 IST, if the caller sent today's
    // calendar date, override to yesterday's date so it matches what
    // autoResult.job.ts saved.
    const _nsNow = new Date();
    const _nsIst = new Date(_nsNow.getTime() + IST_OFFSET_MS);
    if (_nsIst.getUTCHours() < 3) {
      const _calendarToday = _nsIst.toISOString().split('T')[0];
      if (date === _calendarToday) {
        date = todayISTNightShift();
      }
    }

    const dayStart = new Date(date + 'T00:00:00.000+05:30');
    const dayEnd = new Date(date + 'T23:59:59.999+05:30');

    const markets = await prisma.market.findMany({
      where: { active: true, type: 'regular' },
      orderBy: [{ openTime: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true, openTime: true, closeTime: true },
    });

    const results = await prisma.result.findMany({
      where: { resultDate: { gte: dayStart, lte: dayEnd } },
      orderBy: { declaredAt: 'desc' },
    });

    const resultMap: Record<string, any> = {};
    for (const r of results) {
      const key = String(r.session).toLowerCase().trim();
      resultMap[r.marketId] = resultMap[r.marketId] || {};
      resultMap[r.marketId][key] = r;
    }

    const rows = markets.map((m) => {
      const openRow = resultMap[m.id]?.open;
      const closeRow = resultMap[m.id]?.close;

      return {
        id: m.id,
        name: m.name,
        slug: m.slug,
        openTime: m.openTime,
        closeTime: m.closeTime,
        openResult: openRow
          ? {
              id: openRow.id,
              panna: openRow.pannaResult,
              digit: openRow.openResult,
              declaredAt: openRow.declaredAt,
            }
          : null,
        closeResult: closeRow
          ? {
              id: closeRow.id,
              panna: closeRow.pannaResult,
              digit: closeRow.closeResult,
              declaredAt: closeRow.declaredAt,
            }
          : null,
      };
    });

    return ok(res, { date, rows });
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.get('/game-result/winners', async (req, res) => {
  try {
    const { marketId, date, session, status } = req.query;
    if (!marketId || !date || !session) {
      return badRequest(res, 'marketId, date, session required');
    }
    const dayStart = new Date(String(date) + 'T00:00:00.000+05:30');
    const dayEnd = new Date(String(date) + 'T23:59:59.999+05:30');
    const statusFilter = status === 'pending' ? 'pending' : 'won';

    const bids = await prisma.bid.findMany({
      where: {
        marketId: String(marketId),
        session: String(session),
        status: statusFilter,
        bidDate: { gte: dayStart, lte: dayEnd },
      },
      include: { user: { select: { mobile: true, name: true } } },
      orderBy: { bidDate: 'desc' },
      take: 500,
    });

    const rows = bids.map((b) => ({
      id: b.id,
      userName: b.user?.name || 'N/A',
      userMobile: b.user?.mobile || 'N/A',
      gameType: b.gameType,
      digits: b.digits,
      amount: Number(b.amount),
      payout: Number(b.payout || 0),
      status: b.status,
      betDate: b.bidDate,
    }));
    return ok(res, rows);
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

// ═══════════════════════════════════════════════════════════════════
// 🚀 RESULT REVERSE — with result-lock enforcement
//   • Before market's openTime → free to reverse (dev window)
//   • At/after openTime       → LOCKED, cannot reverse till next 3 AM
//     (superadmin force=true bypasses the lock)
// ═══════════════════════════════════════════════════════════════════
router.post('/result/reverse', requireSuperAdmin, async (req, res) => {
  try {
    const { marketId, session, date, force } = req.body;
    if (!marketId || !session || !date) {
      return badRequest(res, 'marketId, session, date required');
    }
    const dayStart = new Date(String(date) + 'T00:00:00.000+05:30');
    const dayEnd = new Date(String(date) + 'T23:59:59.999+05:30');

    const market = await prisma.market.findUnique({ where: { id: String(marketId) } });
    if (!market) return notFound(res, 'Market not found');

    // ─── Result-lock check ──────────────────────────────
    const istNow = new Date(Date.now() + IST_OFFSET_MS);
    const nowMin = istNow.getUTCHours() * 60 + istNow.getUTCMinutes();
    const [oh, om] = String(market.openTime || '00:00').split(':').map(Number);
    const openMin = oh * 60 + om;

    if (nowMin >= openMin && !force) {
      return badRequest(
        res,
        `${market.name}: result locked — cannot reverse after market open time (till next 3 AM)`
      );
    }

    const result = await prisma.result.findFirst({
      where: {
        marketId: String(marketId),
        session: String(session),
        resultDate: { gte: dayStart, lte: dayEnd },
      },
    });
    if (!result) return notFound(res, 'Result not found');

    const wonBids = await prisma.bid.findMany({
      where: {
        marketId: String(marketId),
        session: String(session),
        status: 'won',
        bidDate: { gte: dayStart, lte: dayEnd },
      },
    });

    for (const b of wonBids) {
      const txn = await prisma.transaction.findFirst({
        where: { gameId: b.id, type: 1 },
      });
      if (txn) {
        const user = await prisma.user.findUnique({ where: { id: b.userId } });
        if (user) {
          const before = Number(user.wallet);
          const after = Math.max(0, before - Number(txn.amount));
          await prisma.user.update({
            where: { id: user.id },
            data: { wallet: after },
          });
          await prisma.transaction.create({
            data: {
              userId: user.id,
              amount: Number(txn.amount),
              type: 0,
              remark: `Result reverse refund (${session})`,
              balanceBefore: before,
              balanceAfter: after,
              gameId: b.id,
            },
          });
        }
        await prisma.transaction.delete({ where: { id: txn.id } });
      }
    }

    await prisma.bid.updateMany({
      where: {
        marketId: String(marketId),
        session: String(session),
        status: 'won',
        bidDate: { gte: dayStart, lte: dayEnd },
      },
      data: { status: 'pending' },
    });

    await prisma.result.delete({ where: { id: result.id } });

    await prisma.auditLog.create({
      data: {
        adminId: req.admin!.sub,
        action: 'result.reverse',
        details: `${marketId} ${session} ${date}${force ? ' (forced)' : ''}`,
        ipAddress: req.ip,
      },
    });
    return ok(res, { wonBids: wonBids.length }, 'Result reversed');
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

// ============================================================
// DASHBOARD
// ============================================================
router.get('/dashboard', async (req, res) => {
  try {
    const refDate  = todayIST_1215();
    const dayStart = new Date(refDate + 'T00:00:00.000+05:30');
    const dayEnd   = new Date(refDate + 'T23:59:59.999+05:30');
    const today    = { gte: dayStart, lte: dayEnd };

    const [
      totalUsers, activeUsers, todayUsers, bannedUsers,
      totalBids, todayBids, pendingWithdrawals, pendingDeposits,
      walletSum, totalBidSum,
      todayBidAgg,               // 🚀 today's bid amount
      todayWinAgg,               // today's win payouts
      todayAmountPaidAgg,        // approved withdrawals today
      todayDepositBonusAgg,      // bonus credited today
      todayDepositsAgg,          // 🚀 FIXED — Points added by admin + deposit + bonus (NO wins)
      todayWithdrawalsAgg,       // all statuses
      todayManualDepositsAgg,    // 🚀 FIXED — Points added by admin
      todayManualWithdrawalsAgg, // 🚀 FIXED — Points withdrawn by admin
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { active: true } }),
      prisma.user.count({ where: { createdAt: today } }),
      prisma.user.count({ where: { active: false } }),
      prisma.bid.count(),
      prisma.bid.count({ where: { bidDate: today } }),
      prisma.withdrawal.count({ where: { status: 'pending' } }),
      prisma.upiVerification.count({ where: { status: 'pending' } }),
      prisma.user.aggregate({ _sum: { wallet: true } }),
      prisma.bid.aggregate({ _sum: { amount: true } }),

      // 🚀 Today's bid amount
      prisma.bid.aggregate({
        where: { bidDate: today },
        _sum: { amount: true },
      }),

      // Today's win amount — win payouts credited today
      prisma.transaction.aggregate({
        where: {
          type: 1,
          createdAt: today,
          remark: { contains: 'win', mode: 'insensitive' },
        },
        _sum: { amount: true },
      }),

      // 🚀 Today Amount Paid — APPROVED withdrawals today
      prisma.withdrawal.aggregate({
        where: { status: 'approved', acceptedAt: today },
        _sum: { amount: true },
      }),

      // Today Total Deposit Bonus — bonus credits today
      prisma.transaction.aggregate({
        where: {
          type: 1,
          createdAt: today,
          remark: { contains: 'bonus', mode: 'insensitive' },
        },
        _sum: { amount: true },
      }),

      // 🚀 FIXED — Today Total Deposits = Points added by admin + UPI deposit + bonus
      // (EXCLUDES wins, cashback, refunds)
      prisma.transaction.aggregate({
        where: {
          type: 1,
          createdAt: today,
          OR: [
            { remark: { contains: 'Points added by admin', mode: 'insensitive' } },
            { remark: { contains: 'UPI deposit', mode: 'insensitive' } },
            { remark: { contains: 'deposit', mode: 'insensitive' } },
            { remark: { contains: 'bonus', mode: 'insensitive' } },
          ],
        },
        _sum: { amount: true },
      }),

      // 🚀 Today Total Withdraw — ALL statuses (accept + reject + pending)
      prisma.withdrawal.aggregate({
        where: { createdAt: today },
        _sum: { amount: true },
      }),

      // 🚀 FIXED — Today Manual Deposits = "Points added by admin"
      prisma.transaction.aggregate({
        where: {
          type: 1,
          createdAt: today,
          remark: { contains: 'Points added by admin', mode: 'insensitive' },
        },
        _sum: { amount: true },
      }),

      // 🚀 FIXED — Today Manual Withdraw = "Points withdrawn by admin"
      prisma.transaction.aggregate({
        where: {
          type: 0,
          createdAt: today,
          remark: { contains: 'Points withdrawn by admin', mode: 'insensitive' },
        },
        _sum: { amount: true },
      }),
    ]);

    return ok(res, {
      totalUsers, activeUsers, todayUsers, bannedUsers,
      totalBids, todayBids,

      todayBidAmount:        Number(todayBidAgg._sum.amount || 0),
      todayWinAmount:        Number(todayWinAgg._sum.amount || 0),
      todayAmountPaid:       Number(todayAmountPaidAgg._sum.amount || 0),
      todayDepositBonus:     Number(todayDepositBonusAgg._sum.amount || 0),
      todayDeposits:         Number(todayDepositsAgg._sum.amount || 0),
      todayWithdrawals:      Number(todayWithdrawalsAgg._sum.amount || 0),
      todayManualDeposits:   Number(todayManualDepositsAgg._sum.amount || 0),
      todayManualWithdrawals:Number(todayManualWithdrawalsAgg._sum.amount || 0),

      pendingWithdrawals,
      pendingDeposits,
      walletAmount:    Number(walletSum._sum.wallet || 0),
      totalBidAmount:  Number(totalBidSum._sum.amount || 0),
    });
  } catch (e: any) {
    console.error('[admin/dashboard]', e);
    return serverError(res, e.message);
  }
});

// ============================================================
// USERS
// ============================================================
router.get('/users', async (req, res) => {
  try {
    const { search, status, sort } = req.query;
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 20, 200);

    const where: any = {};
    if (search) {
      where.OR = [
        { mobile: { contains: String(search) } },
        { name: { contains: String(search), mode: 'insensitive' } },
        { referCode: { contains: String(search), mode: 'insensitive' } },
      ];
    }
    if (status === 'active') where.active = true;
    if (status === 'inactive') where.active = false;
    if (status === 'unverified') where.verified = false;

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'name') orderBy = { name: 'asc' };
    if (sort === 'wallet') orderBy = { wallet: 'desc' };
    if (sort === 'mobile') orderBy = { mobile: 'asc' };

    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        select: {
          id: true, mobile: true, name: true, wallet: true,
          active: true, verified: true, referCode: true,
          referredBy: true, createdAt: true, lastSeen: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return ok(res, { rows, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.get('/users/unapproved', async (req, res) => {
  try {
    const rows = await prisma.user.findMany({
      where: { verified: false },
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        id: true, mobile: true, name: true, wallet: true,
        verified: true, active: true, createdAt: true,
      },
    });
    return ok(res, rows);
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: String(req.params.id) },
      include: {
        transactions: { orderBy: { createdAt: 'desc' }, take: 20 },
        bids: {
          orderBy: { bidDate: 'desc' },
          take: 20,
          include: { market: { select: { name: true } } },
        },
        withdrawals: { orderBy: { createdAt: 'desc' }, take: 20 },
        bankDetails: true,
      },
    });
    if (!user) return notFound(res);
    return ok(res, user);
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.get('/users/:id/summary', async (req, res) => {
  try {
    const userId = String(req.params.id);
    const [totalDeposits, totalWithdrawals, totalBids, totalWins] = await Promise.all([
      prisma.transaction.aggregate({ where: { userId, type: 1 }, _sum: { amount: true } }),
      prisma.withdrawal.aggregate({ where: { userId, status: 'approved' }, _sum: { amount: true } }),
      prisma.bid.aggregate({ where: { userId }, _sum: { amount: true }, _count: true }),
      prisma.bid.aggregate({ where: { userId, status: 'won' }, _sum: { payout: true } }),
    ]);

    return ok(res, {
      totalDeposit: totalDeposits._sum.amount || 0,
      totalWithdraw: totalWithdrawals._sum.amount || 0,
      totalBidAmount: totalBids._sum.amount || 0,
      totalBidCount: totalBids._count || 0,
      totalWinAmount: totalWins._sum.payout || 0,
    });
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.get('/users/:id/transactions', async (req, res) => {
  try {
    const userId = String(req.params.id);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 20, 200);
    const typeFilter = req.query.type;

    const where: any = { userId };
    if (typeFilter === 'credit') where.type = 1;
    if (typeFilter === 'debit') where.type = 0;

    const [rows, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    // 🚀 ADDED: Enrich with bid details (digits, session) so the frontend can show them
    const gameIds = rows.map((t) => t.gameId).filter(Boolean) as string[];
    const bids = gameIds.length
      ? await prisma.bid.findMany({
          where: { id: { in: gameIds } },
          select: { id: true, digits: true, session: true },
        })
      : [];
      
    const bidMap = Object.fromEntries(bids.map((b) => [b.id, b]));

    const enriched = rows.map((t) => {
      const b = t.gameId ? bidMap[t.gameId] : null;
      return {
        ...t,
        digits: b?.digits ?? null,
        session: b?.session ?? null,
      };
    });

    return ok(res, { rows: enriched, total, page, pages: Math.ceil(total / limit) });
  } catch (e: any) {
    return serverError(res, e.message);
  }
});
router.get('/users/:id/bids', async (req, res) => {
  try {
    const userId = String(req.params.id);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 20, 200);

    const [rows, total] = await Promise.all([
      prisma.bid.findMany({
        where: { userId },
        include: { market: { select: { name: true } } },
        orderBy: { bidDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.bid.count({ where: { userId } }),
    ]);
    return ok(res, { rows, total, page, pages: Math.ceil(total / limit) });
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.get('/users/:id/withdrawals', async (req, res) => {
  try {
    const userId = String(req.params.id);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 20, 200);

    const [rows, total] = await Promise.all([
      prisma.withdrawal.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.withdrawal.count({ where: { userId } }),
    ]);
    return ok(res, { rows, total, page, pages: Math.ceil(total / limit) });
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.post('/users/:id/active', async (req, res) => {
  try {
    const { active } = req.body;
    const user = await prisma.user.update({
      where: { id: String(req.params.id) },
      data: { active: Boolean(active) },
    });
    await prisma.auditLog.create({
      data: {
        adminId: req.admin!.sub,
        action: 'user.active',
        details: `${user.mobile} -> ${active}`,
        ipAddress: req.ip,
      },
    });
    return ok(res, user, 'Updated');
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.post('/users/:id/verify', async (req, res) => {
  try {
    const { verified } = req.body;
    const user = await prisma.user.update({
      where: { id: String(req.params.id) },
      data: { verified: Boolean(verified) },
    });
    await prisma.auditLog.create({
      data: {
        adminId: req.admin!.sub,
        action: 'user.verified',
        details: `${user.mobile} -> ${verified}`,
        ipAddress: req.ip,
      },
    });
    return ok(res, user, 'Updated');
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.post('/users/:id/mpin', async (req, res) => {
  try {
    const { mPin } = req.body;
    if (!mPin || !/^\d{4}$/.test(String(mPin))) {
      return badRequest(res, 'M-Pin must be 4 digits');
    }

    const mPinHash = await bcrypt.hash(String(mPin), 12);

    const user = await prisma.user.update({
      where: { id: String(req.params.id) },
      data: { mPinHash },
    });

    await prisma.auditLog.create({
      data: {
        adminId: req.admin!.sub,
        action: 'user.mpin.change',
        details: user.mobile,
        ipAddress: req.ip,
      },
    });
    return ok(res, {}, 'M-Pin updated');
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.post('/users/:id/password', requireSuperAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return badRequest(res, 'Password min 6 chars');
    }
    const hash = await bcrypt.hash(newPassword, 12);
    const user = await prisma.user.update({
      where: { id: String(req.params.id) },
      data: { passwordHash: hash },
    });
    await prisma.userSession.updateMany({
      where: { userId: user.id },
      data: { expiresAt: new Date() },
    });
    await prisma.auditLog.create({
      data: {
        adminId: req.admin!.sub,
        action: 'user.password.reset',
        details: user.mobile,
        ipAddress: req.ip,
      },
    });
    return ok(res, {}, 'Password reset. User must login again.');
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.delete('/users/:id', requireSuperAdmin, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: String(req.params.id) } });
    if (!user) return notFound(res);
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.auditLog.create({
      data: {
        adminId: req.admin!.sub,
        action: 'user.delete',
        details: `${user.mobile} (${user.name})`,
        ipAddress: req.ip,
      },
    });
    return ok(res, {}, 'User deleted');
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

// ============================================================
// WALLET
// ============================================================
router.post('/wallet/add', async (req, res) => {
  try {
    const { userId, amount, type, remark, skipBonus } = req.body;
    const amt = Number(amount);
    if (!userId || !amt || amt <= 0) return badRequest(res, 'Invalid amount');
    if (type !== 0 && type !== 1) return badRequest(res, 'Type must be 0 or 1');

    const finalRemark = remark || (type === 1 ? 'Points added by admin' : 'Points withdrawn by admin');

    let bonus = 0;
    let totalCredited = amt;

    if (type === 1) {
      // 🚀 If skipBonus is true → credit WITHOUT bonus lookup (Add Points page)
      if (skipBonus === true) {
        await updateWallet({
          userId,
          amount: amt,
          type: 1,
          remark: finalRemark,
        });
        bonus = 0;
        totalCredited = amt;
      } else {
        // Normal credit path — auto bonus if a deposit tier matches
        const result = await creditDepositWithBonus({
          userId,
          amount: amt,
          remark: finalRemark,
        });
        bonus = result.bonus;
        totalCredited = result.total;
      }
    } else {
      // Debit — no bonus
      await updateWallet({
        userId,
        amount: amt,
        type: 0,
        remark: finalRemark,
      });
    }

    await prisma.auditLog.create({
      data: {
        adminId: req.admin!.sub,
        action: type === 1 ? 'wallet.credit' : 'wallet.debit',
        details: `${userId} -> Rs ${amt}${bonus > 0 ? ` (+₹${bonus} bonus)` : ''}${skipBonus === true ? ' [no-bonus]' : ''}`,
        ipAddress: req.ip,
      },
    });

    // 🚀 FCM push for both credit AND debit
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, wallet: true },
      });

      const balance = Math.round(Number(user?.wallet ?? 0));

      if (type === 1) {
        // Credit
        const title = bonus > 0
          ? `💰 ₹${amt} + ₹${bonus} Bonus Credited`
          : `💰 ₹${amt} Added to Wallet`;
        const body = bonus > 0
          ? `₹${amt} + ₹${bonus} bonus added. New balance: ₹${balance}`
          : `₹${amt} added. New balance: ₹${balance}`;
        sendToUser(userId, title, body, {
          type: 'credit',
          amount: String(amt),
          bonus: String(bonus),
        }).catch((e) => console.error('[fcm] credit push failed:', e?.message));
      } else {
        // 🚀 Debit
        const title = `⚠️ ₹${amt} Deducted from Wallet`;
        const body = `₹${amt} has been deducted by Admin. New balance: ₹${balance}`;
        sendToUser(userId, title, body, {
          type: 'debit',
          amount: String(amt),
        }).catch((e) => console.error('[fcm] debit push failed:', e?.message));
      }
    } catch (e: any) {
      console.error('[fcm] push prep failed:', e?.message);
    }

    return ok(
      res,
      { bonus, totalCredited },
      bonus > 0
        ? `₹${amt} + ₹${bonus} bonus = ₹${totalCredited} credited`
        : 'Wallet updated',
    );
  } catch (e: any) {
    return badRequest(res, e.message);
  }
});

// ============================================================
// TRANSACTIONS / DEPOSITS / WITHDRAWALS
// ============================================================
router.get('/transactions', async (req, res) => {
  try {
    const { userId, from, to, type, search } = req.query;
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 50, 500);

    const where: any = {};
    if (userId) where.userId = String(userId);
    if (type === 'credit') where.type = 1;
    if (type === 'debit') where.type = 0;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(String(from));
      if (to) where.createdAt.lte = new Date(String(to));
    }
    if (search) {
      where.user = {
        OR: [
          { mobile: { contains: String(search) } },
          { name: { contains: String(search), mode: 'insensitive' } },
        ],
      };
    }

    const [rows, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: { user: { select: { mobile: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    // 🚀 Enrich with bid details (digits + session + gameType + market)
    const gameIds = rows.map((t) => t.gameId).filter(Boolean) as string[];
    const bids = gameIds.length
      ? await prisma.bid.findMany({
          where: { id: { in: gameIds } },
          select: {
            id: true,
            digits: true,
            gameType: true,
            status: true,
            session: true,
            market: { select: { name: true } },
          },
        })
      : [];
    const bidMap = Object.fromEntries(bids.map((b) => [b.id, b]));

    const enriched = rows.map((t) => {
      const b = t.gameId ? bidMap[t.gameId] : null;
      return {
        id: t.id,
        amount: Number(t.amount),
        type: t.type,
        remark: t.remark,
        balanceBefore: t.balanceBefore != null ? Number(t.balanceBefore) : null,
        balanceAfter: t.balanceAfter != null ? Number(t.balanceAfter) : null,
        createdAt: t.createdAt,
        user: t.user ? { name: t.user.name, mobile: t.user.mobile } : null,
        // 🚀 New fields — null when txn isn't linked to a bid
        digits: b?.digits ?? null,
        gameType: b?.gameType ?? null,
        marketName: b?.market?.name ?? null,
        bidStatus: b?.status ?? null,
        session: b?.session ?? null,
      };
    });

    return ok(res, { rows: enriched, total, page, pages: Math.ceil(total / limit) });
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.get('/deposits', async (req, res) => {
  try {
    const from = req.query.from
      ? new Date(String(req.query.from) + 'T00:00:00.000+05:30')
      : (() => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d; })();
    const to = req.query.to
      ? new Date(String(req.query.to) + 'T23:59:59.999+05:30')
      : (() => { const d = new Date(); d.setUTCHours(23, 59, 59, 999); return d; })();

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 50, 500);

    const where: any = {
      type: 1,
      createdAt: { gte: from, lte: to },
      OR: [
        { remark: { contains: 'Deposit', mode: 'insensitive' } },
        { remark: { contains: 'Points Added By Admin', mode: 'insensitive' } },
      ],
    };

    const [rows, total, sumAgg] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: { user: { select: { mobile: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transaction.count({ where }),
      prisma.transaction.aggregate({ where, _sum: { amount: true } }),
    ]);

    return ok(res, {
      rows, total, page, pages: Math.ceil(total / limit),
      totalDeposit: Number(sumAgg._sum.amount || 0),
    });
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.get('/withdrawals', async (req, res) => {
  try {
    const where: any = {};
    if (req.query.status) where.status = String(req.query.status);
    const rows = await prisma.withdrawal.findMany({
      where,
      include: { user: { select: { mobile: true, name: true, wallet: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    return ok(res, rows);
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.post('/withdrawals/:id/approve', async (req, res) => {
  try {
    const wd = await prisma.withdrawal.findUnique({ where: { id: String(req.params.id) } });
    if (!wd) return notFound(res);
    if (wd.status !== 'pending') return badRequest(res, 'Already processed');

    const updated = await prisma.withdrawal.update({
      where: { id: wd.id },
      data: { status: 'approved', acceptedAt: new Date() },
    });
    await prisma.auditLog.create({
      data: {
        adminId: req.admin!.sub,
        action: 'withdrawal.approve',
        details: `${wd.id} -> Rs ${wd.amount}`,
        ipAddress: req.ip,
      },
    });

    try {
      const title = `✅ Withdrawal Approved`;
      const body = `Your withdrawal of ₹${Number(wd.amount)} has been approved. Admin will pay you shortly.`;
      sendToUser(wd.userId, title, body, {
        type: 'withdrawal',
        status: 'approved',
        amount: String(wd.amount),
      }).catch((e) =>
        console.error('[fcm] withdrawal approve push failed:', e?.message),
      );
    } catch (e: any) {
      console.error('[fcm] withdrawal approve prep failed:', e?.message);
    }

    return ok(res, updated, 'Approved');
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.post('/withdrawals/:id/reject', async (req, res) => {
  try {
    const { remark } = req.body;
    const wd = await prisma.withdrawal.findUnique({
      where: { id: String(req.params.id) },
    });
    if (!wd) return notFound(res);
    if (wd.status !== 'pending') return badRequest(res, 'Already processed');

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.withdrawal.update({
        where: { id: wd.id },
        data: {
          status: 'rejected',
          remark: remark || null,
          acceptedAt: new Date(),
        },
      });

      const user = await tx.user.findUnique({ where: { id: wd.userId } });
      if (!user) throw new Error('User not found');

      const before = Number(user.wallet);
      const refund = Number(wd.amount);
      const after = before + refund;

      await tx.user.update({
        where: { id: wd.userId },
        data: { wallet: after },
      });

      await tx.transaction.create({
        data: {
          userId: wd.userId,
          amount: refund,
          type: 1,
          remark: `Withdrawal refund (${remark || 'rejected'})`,
          balanceBefore: before,
          balanceAfter: after,
        },
      });

      return row;
    });

    await prisma.auditLog.create({
      data: {
        adminId: req.admin!.sub,
        action: 'withdrawal.reject',
        details: `${wd.id} -> Rs ${wd.amount} - ${remark || 'no remark'}`,
        ipAddress: req.ip,
      },
    });

    try {
      const user = await prisma.user.findUnique({
        where: { id: wd.userId },
        select: { name: true, wallet: true },
      });

      const title = `↩️ Withdrawal Rejected`;
      const body =
        `Your withdrawal of ₹${Number(wd.amount)} was rejected. ` +
        `₹${Number(wd.amount)} has been refunded to your wallet. ` +
        `New balance: ₹${Math.round(Number(user?.wallet ?? 0))}`;

      sendToUser(wd.userId, title, body, {
        type: 'withdrawal',
        status: 'rejected',
        amount: String(wd.amount),
        remark: remark || '',
      }).catch((e) =>
        console.error('[fcm] withdrawal reject push failed:', e?.message),
      );
    } catch (e: any) {
      console.error('[fcm] withdrawal reject prep failed:', e?.message);
    }

    return ok(res, updated, 'Rejected + refunded');
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

// ============================================================
// BIDS — REVERT
// ============================================================
router.post('/bids/revert', requireSuperAdmin, async (req, res) => {
  try {
    const { date, marketId } = req.body;
    if (!date || !marketId) {
      return badRequest(res, 'date and marketId required');
    }

    const dayStart = new Date(String(date) + 'T00:00:00.000Z');
    const dayEnd = new Date(String(date) + 'T23:59:59.999Z');

    const bids = await prisma.bid.findMany({
      where: {
        marketId: String(marketId),
        bidDate: { gte: dayStart, lte: dayEnd },
      },
      include: { user: { select: { id: true, mobile: true, name: true } } },
    });

    if (bids.length === 0) {
      return ok(res, { refunded: 0, totalRefund: 0 }, 'No bids to revert');
    }

    let refunded = 0;
    let totalRefund = 0;

    await prisma.$transaction(async (tx) => {
      for (const bid of bids) {
        if (!bid.user) continue;

        const user = await tx.user.findUnique({
          where: { id: bid.userId },
        });
        if (!user) continue;

        const before = Number(user.wallet);
        const amount = Number(bid.amount);
        const after = before + amount;

        await tx.user.update({
          where: { id: user.id },
          data: { wallet: after },
        });

        await tx.transaction.create({
          data: {
            userId: user.id,
            amount,
            type: 1,
            remark: 'Bid revert refund',
            balanceBefore: before,
            balanceAfter: after,
            gameId: bid.id,
          },
        });

        await tx.bid.delete({ where: { id: bid.id } });

        refunded++;
        totalRefund += amount;
      }
    });

    await prisma.auditLog.create({
      data: {
        adminId: req.admin!.sub,
        action: 'bids.revert',
        details: `${marketId} ${date} - ${refunded} bids - Rs ${totalRefund}`,
        ipAddress: req.ip,
      },
    });

    return ok(res, { refunded, totalRefund }, `Refunded ${refunded} bids`);
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.get('/bids/by-market', async (req, res) => {
  try {
    const { marketId, date } = req.query;
    if (!marketId || !date) {
      return badRequest(res, 'marketId and date required');
    }

    const dayStart = new Date(String(date) + 'T00:00:00.000Z');
    const dayEnd = new Date(String(date) + 'T23:59:59.999Z');

    const bids = await prisma.bid.findMany({
      where: {
        marketId: String(marketId),
        bidDate: { gte: dayStart, lte: dayEnd },
      },
      include: {
        user: { select: { id: true, mobile: true, name: true } },
        market: { select: { name: true } },
      },
      orderBy: { bidDate: 'desc' },
      take: 500,
    });

    const rows = bids.map((b) => ({
      id: b.id,
      userName: b.user?.name || '—',
      userMobile: b.user?.mobile || '—',
      amount: Number(b.amount),
      digits: b.digits,
      gameType: b.gameType,
      session: b.session,
      bidDate: b.bidDate,
    }));

    return ok(res, rows);
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

// ============================================================
// BIDS — main list
// ============================================================
router.get('/bids', async (req, res) => {
  try {
    const {
      date, market, marketId, gameType, custom,
      status, search, from, to,
    } = req.query;

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 50, 500);

    const where: any = {};

    if (marketId) where.marketId = String(marketId);
    if (market) where.market = { name: String(market) };

    if (custom === 'true') {
      where.gameType = { notIn: STANDARD_GAME_TYPES };
    } else if (gameType) {
      where.gameType = String(gameType);
    }

    if (status) where.status = String(status);

    if (from || to) {
      where.bidDate = {};
      if (from) where.bidDate.gte = new Date(String(from) + 'T00:00:00.000+05:30');
      if (to) where.bidDate.lte = new Date(String(to) + 'T23:59:59.999+05:30');
    } else if (date) {
      const dateStr = String(date);
      where.bidDate = {
        gte: new Date(dateStr + 'T00:00:00.000+05:30'),
        lte: new Date(dateStr + 'T23:59:59.999+05:30'),
      };
    }

    if (search) {
      where.user = {
        OR: [
          { mobile: { contains: String(search) } },
          { name: { contains: String(search), mode: 'insensitive' } },
        ],
      };
    }

    const [rows, total, totalAgg, wonAgg, lostAgg, pendingAgg] = await Promise.all([
      prisma.bid.findMany({
        where,
        include: {
          user: { select: { mobile: true, name: true } },
          market: { select: { name: true } },
        },
        orderBy: { bidDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.bid.count({ where }),
      prisma.bid.aggregate({ where, _sum: { amount: true } }),
      prisma.bid.aggregate({
        where: { ...where, status: 'won' },
        _sum: { amount: true, payout: true },
      }),
      prisma.bid.aggregate({
        where: { ...where, status: 'lost' },
        _sum: { amount: true },
      }),
      prisma.bid.aggregate({
        where: { ...where, status: 'pending' },
        _sum: { amount: true },
      }),
    ]);

    const shaped = rows.map((b, idx) => ({
      id: b.id,
      index: (page - 1) * limit + idx + 1,
      userName: b.user?.name || 'N/A',
      userMobile: b.user?.mobile || 'N/A',
      bidTxId: b.id,
      gameName: b.market?.name || 'N/A',
      gameType: b.gameType || 'N/A',
      session: b.session || null,
      number: b.digits || 'N/A',
      digits: b.digits || 'N/A',
      points: Number(b.amount) || 0,
      amount: Number(b.amount) || 0,
      payout: Number(b.payout) || 0,
      status: b.status,
      bidDate: b.bidDate,
    }));

    return ok(res, {
      rows: shaped,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      summary: {
        totalAmount: Number(totalAgg._sum.amount || 0),
        wonAmount: Number(wonAgg._sum.amount || 0),
        wonPayout: Number(wonAgg._sum.payout || 0),
        lostAmount: Number(lostAgg._sum.amount || 0),
        pendingAmount: Number(pendingAgg._sum.amount || 0),
      },
    });
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

// ============================================================
// RESULT — declare
// ============================================================
router.post('/result/declare', async (req, res) => {
  try {
    const {
      marketId, session,
      openResult, closeResult, jodiResult, pannaResult,
      resultDate, force,
    } = req.body;
    if (!marketId || !session) return badRequest(res, 'marketId and session required');

    // force only allowed for superadmins (bypasses result lock)
    const canForce = req.admin?.role === 'superadmin';
    const useForce = Boolean(force) && canForce;

    const result = await declareResult({
      marketId,
      session,
      openResult,
      closeResult,
      jodiResult,
      pannaResult,
      resultDate,
      force: useForce,
    });
    await prisma.auditLog.create({
      data: {
        adminId: req.admin!.sub,
        action: 'result.declare',
        details: `${marketId} ${session}${useForce ? ' (forced)' : ''}`,
        ipAddress: req.ip,
      },
    });
    return ok(res, result, 'Result declared');
  } catch (e: any) {
    return badRequest(res, e.message);
  }
});

router.get('/result', async (req, res) => {
  try {
    const where: any = {};
    if (req.query.marketId) where.marketId = String(req.query.marketId);
    if (req.query.date) where.resultDate = new Date(String(req.query.date));
    const rows = await prisma.result.findMany({
      where,
      include: { market: { select: { name: true } } },
      orderBy: { resultDate: 'desc' },
      take: 500,
    });
    return ok(res, rows);
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.get('/auto-status', async (req, res) => {
  try {
    const rows = await prisma.autoHistory.findMany({
      orderBy: { runAt: 'desc' },
      take: 50,
    });
    return ok(res, rows);
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

// ============================================================
// REPORTS
// ============================================================
router.get('/reports/profit-loss', async (req, res) => {
  try {
    const from = req.query.from
      ? new Date(String(req.query.from) + 'T00:00:00.000+05:30')
      : (() => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d; })();
    const to = req.query.to
      ? new Date(String(req.query.to) + 'T23:59:59.999+05:30')
      : (() => { const d = new Date(); d.setUTCHours(23, 59, 59, 999); return d; })();

    const depositOr = [
      { remark: { contains: 'Deposit', mode: 'insensitive' as const } },
      { remark: { contains: 'Points Added By Admin', mode: 'insensitive' as const } },
      { remark: { contains: 'UPI deposit approved', mode: 'insensitive' as const } },
      { remark: { contains: 'Admin credit', mode: 'insensitive' as const } },
    ];
    const withdrawOr = [
      { remark: { contains: 'Withdraw', mode: 'insensitive' as const } },
      { remark: { contains: 'Points Withdraw By Admin', mode: 'insensitive' as const } },
      { remark: { contains: 'Deducted by admin', mode: 'insensitive' as const } },
      { remark: { contains: 'Admin debit', mode: 'insensitive' as const } },
    ];

    const [depositAgg, withdrawAgg, rows] = await Promise.all([
      prisma.transaction.aggregate({
        where: { createdAt: { gte: from, lte: to }, OR: depositOr },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { createdAt: { gte: from, lte: to }, OR: withdrawOr },
        _sum: { amount: true },
      }),
      prisma.transaction.findMany({
        where: {
          createdAt: { gte: from, lte: to },
          OR: [...depositOr, ...withdrawOr],
        },
        include: { user: { select: { name: true, mobile: true } } },
        orderBy: { createdAt: 'desc' },
        take: 2000,
      }),
    ]);

    const totalDeposit = Number(depositAgg._sum.amount || 0);
    const totalWithdraw = Number(withdrawAgg._sum.amount || 0);

    return ok(res, {
      date: {
        from: from.toISOString().split('T')[0],
        to: to.toISOString().split('T')[0],
      },
      summary: {
        totalDeposit,
        totalWithdraw,
        profit: totalDeposit - totalWithdraw,
      },
      rows: rows.map((t) => ({
        id: t.id,
        userName: t.user?.name || 'N/A',
        userMobile: t.user?.mobile || 'N/A',
        type: t.type === 1 ? 'Credit' : 'Debit',
        amount: Number(t.amount),
        remark: t.remark,
        createdAt: t.createdAt,
      })),
    });
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.get('/reports/fund', async (req, res) => {
  try {
    const from = req.query.from
      ? new Date(String(req.query.from) + 'T00:00:00.000+05:30')
      : (() => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d; })();
    const to = req.query.to
      ? new Date(String(req.query.to) + 'T23:59:59.999+05:30')
      : (() => { const d = new Date(); d.setUTCHours(23, 59, 59, 999); return d; })();

    const depositOr = [
      { remark: { contains: 'Deposit', mode: 'insensitive' as const } },
      { remark: { contains: 'Points Added By Admin', mode: 'insensitive' as const } },
    ];
    const withdrawOr = [
      { remark: { contains: 'Withdraw', mode: 'insensitive' as const } },
      { remark: { contains: 'Points Withdraw By Admin', mode: 'insensitive' as const } },
      { remark: { contains: 'Deducted by admin', mode: 'insensitive' as const } },
    ];

    const [depositAgg, withdrawAgg, rows] = await Promise.all([
      prisma.transaction.aggregate({
        where: { createdAt: { gte: from, lte: to }, OR: depositOr },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { createdAt: { gte: from, lte: to }, OR: withdrawOr },
        _sum: { amount: true },
      }),
      prisma.transaction.findMany({
        where: {
          createdAt: { gte: from, lte: to },
          OR: [...depositOr, ...withdrawOr],
        },
        include: { user: { select: { name: true, mobile: true } } },
        orderBy: { createdAt: 'desc' },
        take: 2000,
      }),
    ]);

    const totalDeposit = Number(depositAgg._sum.amount || 0);
    const totalWithdraw = Number(withdrawAgg._sum.amount || 0);

    return ok(res, {
      date: {
        from: from.toISOString().split('T')[0],
        to: to.toISOString().split('T')[0],
      },
      summary: {
        totalDeposit,
        totalWithdraw,
        profit: totalDeposit - totalWithdraw,
      },
      rows: rows.map((t) => ({
        id: t.id,
        userName: t.user?.name || 'N/A',
        userMobile: t.user?.mobile || 'N/A',
        type: t.type === 1 ? 'Credit' : 'Debit',
        amount: Number(t.amount),
        remark: t.remark,
        createdAt: t.createdAt,
      })),
    });
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

// ============================================================
// TRANSACTIONS — Delete
// ============================================================
router.delete('/transactions/:id', requireSuperAdmin, async (req, res) => {
  try {
    const transaction = await prisma.transaction.findUnique({ where: { id: String(req.params.id) } });
    if (!transaction) return notFound(res);

    await prisma.transaction.delete({ where: { id: transaction.id } });

    await prisma.auditLog.create({
      data: {
        adminId: req.admin!.sub,
        action: 'transaction.delete',
        details: `Deleted transaction ${transaction.id} of amount ${transaction.amount}`,
        ipAddress: req.ip,
      },
    });

    return ok(res, {}, 'Transaction deleted');
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

// ============================================================
// WINNING DETAILS
// ============================================================
router.get('/reports/winning-details', async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 10, 100);
    const skip = (page - 1) * limit;

    const { from, to, search } = req.query;

    // 🚀 FIXED — match actual "Win payout" remarks, not "winning"
    const where: any = {
      type: 1,
      OR: [
        { remark: { contains: 'Win payout', mode: 'insensitive' } },
        { remark: { contains: 'winning', mode: 'insensitive' } },
        { remark: { contains: 'won', mode: 'insensitive' } },
      ],
    };

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(String(from) + 'T00:00:00.000+05:30');
      if (to) where.createdAt.lte = new Date(String(to) + 'T23:59:59.999+05:30');
    }

    if (search) {
      where.user = {
        OR: [
          { mobile: { contains: String(search) } },
          { name: { contains: String(search), mode: 'insensitive' } },
        ],
      };
    }

    const [rows, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, mobile: true, name: true },
          },
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    const enriched = await Promise.all(
      rows.map(async (t) => {
        let marketName = '—';
        let gameName = '—';
        let bidNumber = '—';
        let bidPoints = 0;

        if (t.gameId) {
          const bid = await prisma.bid.findUnique({
            where: { id: t.gameId },
            include: {
              market: { select: { name: true } },
            },
          });
          if (bid) {
            marketName = bid.market?.name || '—';
            gameName = bid.gameType || '—';
            bidNumber = bid.digits || '—';
            bidPoints = Number(bid.amount) || 0;
          }
        }

        return {
          id: t.id,
          userName: t.user?.name || 'N/A',
          userMobile: t.user?.mobile || 'N/A',
          bidPoints,
          winningPoints: Number(t.amount) || 0,
          marketName,
          gameName,
          bidNumber,
          date: t.createdAt,
          remark: t.remark,
        };
      })
    );

    return ok(res, {
      rows: enriched,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

// ============================================================
// BET FILTER
// ============================================================
router.get('/reports/bet-filter', async (req, res) => {
  try {
    const { date, market, amount } = req.query;

    if (!date) {
      return badRequest(res, 'Date is required');
    }

    const dateStr = String(date);
    const dayStart = new Date(dateStr + 'T00:00:00.000+05:30');
    const dayEnd = new Date(dateStr + 'T23:59:59.999+05:30');

    const where: any = {
      bidDate: { gte: dayStart, lte: dayEnd },
    };

    const amt = Number(amount);
    if (amount !== undefined && amount !== '' && amt > 0) {
      where.amount = { gte: amt };
    }

    if (market) {
      where.market = { name: String(market) };
    }

    const bids = await prisma.bid.findMany({
      where,
      include: {
        user: { select: { mobile: true, name: true } },
        market: { select: { name: true } },
      },
      orderBy: { bidDate: 'desc' },
      take: 1000,
    });

    const rows = bids.map((b, idx) => ({
      id: b.id,
      index: idx + 1,
      userName: b.user?.name || 'N/A',
      userMobile: b.user?.mobile || 'N/A',
      points: Number(b.amount),
      gameName: b.gameType || '—',
      number: b.digits || '—',
      marketName: b.market?.name || '—',
      createdAt: b.bidDate,
    }));

    return ok(res, {
      rows,
      total: rows.length,
      date: dateStr,
      market: market || null,
      amount: amt || null,
    });
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

// ============================================================
// SELL REPORT
// ============================================================
router.get('/reports/sell', async (req, res) => {
  try {
    const { date, marketId, session, type } = req.query;

    if (!date || !marketId || !session) {
      return badRequest(res, 'date, marketId, session required');
    }

    const dateStr = String(date);
    const dayStart = new Date(dateStr + 'T00:00:00.000+05:30');
    const dayEnd = new Date(dateStr + 'T23:59:59.999+05:30');
    const sessionFilter = String(session);
    const typeFilter = String(type || 'all');

    const bids = await prisma.bid.findMany({
      where: {
        marketId: String(marketId),
        bidDate: { gte: dayStart, lte: dayEnd },
        OR: [
          { session: sessionFilter },
          { session: null },
          { gameType: { in: ['jodi', 'half_sangam', 'full_sangam'] } },
        ],
      },
      select: {
        id: true,
        gameType: true,
        digits: true,
        amount: true,
        userId: true,
      },
      orderBy: { bidDate: 'desc' },
    });

    const columns: Record<
      string,
      { total: number; rows: { digit: string; amount: number }[] }
    > = {};

    const aggregate = (gameTypes: string[], key: string) => {
      const filtered = bids.filter((b) => gameTypes.includes(b.gameType));
      const digitMap = new Map<string, number>();
      let total = 0;

      filtered.forEach((b) => {
        const d = b.digits || '—';
        const amt = Number(b.amount);
        digitMap.set(d, (digitMap.get(d) || 0) + amt);
        total += amt;
      });

      const rows = Array.from(digitMap.entries())
        .map(([digit, amount]) => ({ digit, amount }))
        .sort((a, b) => b.amount - a.amount);

      columns[key] = { total, rows };
    };

    if (typeFilter === 'all' || typeFilter === 'single') {
      aggregate(['single'], 'single');
    }
    if (typeFilter === 'all' || typeFilter === 'jodi') {
      aggregate(['jodi'], 'jodi');
    }
    if (typeFilter === 'all' || typeFilter === 'panna') {
      aggregate(['single_panna'], 'single_panna');
      aggregate(['double_panna'], 'double_panna');
      aggregate(['triple_panna'], 'triple_panna');
    }
    if (typeFilter === 'all' || typeFilter === 'sangam') {
      aggregate(['half_sangam'], 'half_sangam');
      aggregate(['full_sangam'], 'full_sangam');
    }

    return ok(res, {
      date: dateStr,
      session: sessionFilter,
      type: typeFilter,
      columns,
      totalBids: bids.length,
      totalAmount: bids.reduce((s, b) => s + Number(b.amount), 0),
    });
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

// ============================================================
// WITHDRAW REPORT  — 🚀 FIXED: todayApproved added
// ============================================================
router.get('/reports/withdraw', async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 10, 200);
    const { status, from, to, search } = req.query;

    const where: any = {};

    if (status) {
      where.status = String(status);
    } else {
      where.status = 'approved';
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(String(from) + 'T00:00:00.000+05:30');
      if (to) where.createdAt.lte = new Date(String(to) + 'T23:59:59.999+05:30');
    }

    if (search) {
      where.user = {
        OR: [
          { mobile: { contains: String(search) } },
          { name: { contains: String(search), mode: 'insensitive' } },
        ],
      };
    }

    const [rows, total] = await Promise.all([
      prisma.withdrawal.findMany({
        where,
        include: {
          user: { select: { id: true, mobile: true, name: true, wallet: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.withdrawal.count({ where }),
    ]);

    const bankIds = rows.map((r) => r.bankId).filter(Boolean) as string[];
    const banks = bankIds.length
      ? await prisma.bankDetail.findMany({ where: { id: { in: bankIds } } })
      : [];
    const bankMap = Object.fromEntries(banks.map((b) => [b.id, b]));

    const shaped = rows.map((r, idx) => {
      const bank = r.bankId ? bankMap[r.bankId] : null;
      return {
        id: r.id,
        index: (page - 1) * limit + idx + 1,
        userName: r.user?.name || 'N/A',
        userMobile: r.user?.mobile || 'N/A',
        userId: r.user?.id || null,
        currentWallet: Number(r.user?.wallet || 0),
        amount: Number(r.amount),
        requestNo: r.id.slice(0, 8).toUpperCase(),
        date: r.createdAt,
        acceptedAt: r.acceptedAt,
        status: r.status,
        remark: r.remark,
        bank: bank
          ? {
              holderName: bank.holderName,
              accountNo: bank.accountNo,
              ifsc: bank.ifsc,
              upi: bank.upi,
              phonepe: bank.phonepe,
              gpay: bank.gpay,
              paytm: bank.paytm,
            }
          : null,
      };
    });

    const totals = await prisma.withdrawal.aggregate({
      where: { status: 'approved' },
      _sum: { amount: true },
      _count: true,
    });

    // 🚀 Sum of ALL rows matching the current filter (not just the page)
    const filteredAgg = await prisma.withdrawal.aggregate({
      where,
      _sum: { amount: true },
      _count: true,
    });

    // 🚀 TODAY's approved total (independent of user's date filter)
    const todayISTStr = new Date(
      Date.now() + IST_OFFSET_MS
    ).toISOString().split('T')[0];
    const todayStart = new Date(todayISTStr + 'T00:00:00.000+05:30');
    const todayEnd = new Date(todayISTStr + 'T23:59:59.999+05:30');

    const todayAgg = await prisma.withdrawal.aggregate({
      where: {
        status: 'approved',
        acceptedAt: { gte: todayStart, lte: todayEnd },
      },
      _sum: { amount: true },
      _count: true,
    });

    return ok(res, {
      rows: shaped,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      lifetimeApproved: Number(totals._sum.amount || 0),
      lifetimeCount: totals._count || 0,
      // 🚀 filtered total across all pages
      filteredAmount: Number(filteredAgg._sum.amount || 0),
      filteredCount: filteredAgg._count || 0,
      // 🚀 NEW — today's approved withdrawals (for the "Today Approved" card)
      todayApprovedAmount: Number(todayAgg._sum.amount || 0),
      todayApprovedCount: todayAgg._count || 0,
    });
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

// ============================================================
// SETTINGS
// ============================================================
router.get('/settings', async (req, res) => {
  try {
    const rows = await prisma.setting.findMany();
    const settings = Object.fromEntries(rows.map(r => [r.key, r.value]));
    return ok(res, settings);
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.post('/settings', requireSuperAdmin, async (req, res) => {
  try {
    const updates = req.body as Record<string, string>;
    for (const [key, value] of Object.entries(updates)) {
      await prisma.setting.upsert({
        where: { key },
        create: { key, value: String(value) },
        update: { value: String(value) },
      });
    }
    return ok(res, {}, 'Settings saved');
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

// ============================================================
// SITE NOTICE
// ============================================================
router.get('/site-notice', async (req, res) => {
  try {
    const row = await prisma.content.findUnique({ where: { slug: 'notice' } });
    return ok(res, {
      content: row?.body || '',
      title: row?.title || 'Site Notice',
      updatedAt: row?.updatedAt || null,
    });
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.post('/site-notice', requireSuperAdmin, async (req, res) => {
  try {
    const body = req.body as Record<string, any>;
    const content = String(body.content || '');
    if (content.length > 20000) return badRequest(res, 'Content too long (max 20k)');

    const existing = await prisma.content.findUnique({ where: { slug: 'notice' } });
    const row = existing
      ? await prisma.content.update({
          where: { slug: 'notice' },
          data: { body: content, active: true },
        })
      : await prisma.content.create({
          data: {
            slug: 'notice',
            title: 'Site Notice',
            body: content,
            active: true,
          },
        });

    await prisma.auditLog.create({
      data: {
        adminId: req.admin!.sub,
        action: 'site_notice.update',
        details: `length=${content.length}`,
        ipAddress: req.ip,
      },
    });

    return ok(res, {
      content: row.body,
      updatedAt: row.updatedAt,
    }, 'Notice saved');
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

// ============================================================
// NOTICE (list)
// ============================================================
router.get('/notice', async (req, res) => {
  try {
    const rows = await prisma.notice.findMany({ orderBy: { createdAt: 'desc' } });
    return ok(res, rows);
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.post('/notice', async (req, res) => {
  try {
    const { title, content, active } = req.body;
    if (!title || !content) return badRequest(res, 'Missing fields');
    const n = await prisma.notice.create({
      data: { title, content, active: active !== false },
    });
    return created(res, n, 'Notice created');
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.delete('/notice/:id', async (req, res) => {
  try {
    await prisma.notice.delete({ where: { id: String(req.params.id) } });
    return ok(res, {}, 'Deleted');
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

// ============================================================
// BONUS
// ============================================================
router.get('/bonus', async (req, res) => {
  try {
    const { search, sort } = req.query;
    const where: any = {};

    if (search) {
      const s = String(search);
      const num = Number(s);
      if (!isNaN(num)) {
        where.OR = [
          { min: { equals: num } },
          { max: { equals: num } },
          { bonus: { equals: num } },
        ];
      }
    }

    let orderBy: any = { min: 'asc' };
    if (sort === 'min') orderBy = { min: 'asc' };
    if (sort === 'max') orderBy = { max: 'asc' };
    if (sort === 'bonus') orderBy = { bonus: 'asc' };

    const rows = await prisma.depositBonus.findMany({ where, orderBy });
    return ok(res, rows);
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.post('/bonus', requireSuperAdmin, async (req, res) => {
  try {
    const { min, max, bonus } = req.body;
    if (min == null || max == null || bonus == null) {
      return badRequest(res, 'Missing fields');
    }

    const minN = Number(min);
    const maxN = Number(max);
    const bonusN = Number(bonus);

    if (minN < 0 || maxN <= minN || bonusN <= 0) {
      return badRequest(res, 'Invalid range: max must be greater than min');
    }

    const existing = await prisma.depositBonus.findMany();
    const overlaps = existing.some((b) => {
      const bMin = Number(b.min);
      const bMax = Number(b.max);
      return (
        (minN >= bMin && minN <= bMax) ||
        (maxN >= bMin && maxN <= bMax) ||
        (bMin >= minN && bMin <= maxN) ||
        (bMax >= minN && bMax <= maxN)
      );
    });

    if (overlaps) {
      return badRequest(
        res,
        'The deposit range overlaps with an existing bonus range.'
      );
    }

    const newBonus = await prisma.depositBonus.create({
      data: { min: minN, max: maxN, bonus: bonusN },
    });

    await prisma.auditLog.create({
      data: {
        adminId: req.admin!.sub,
        action: 'bonus.create',
        details: `${minN}-${maxN} -> Rs ${bonusN}`,
        ipAddress: req.ip,
      },
    });

    return created(res, newBonus, 'Bonus tier added');
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.delete('/bonus/:id', requireSuperAdmin, async (req, res) => {
  try {
    const row = await prisma.depositBonus.findUnique({
      where: { id: String(req.params.id) },
    });
    if (!row) return notFound(res);

    await prisma.depositBonus.delete({ where: { id: row.id } });

    await prisma.auditLog.create({
      data: {
        adminId: req.admin!.sub,
        action: 'bonus.delete',
        details: `${row.min}-${row.max} -> Rs ${row.bonus}`,
        ipAddress: req.ip,
      },
    });

    return ok(res, {}, 'Deleted');
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

// ============================================================
// GAMES
// ============================================================
router.get('/games', async (req, res) => {
  try {
    const rows = await prisma.market.findMany({
      include: { rates: true },
      orderBy: { name: 'asc' },
    });
    return ok(res, rows);
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.post('/games', requireSuperAdmin, async (req, res) => {
  try {
    const { name, slug, type, openTime, closeTime, days, autoResult, active } = req.body;
    if (!name || !slug) return badRequest(res, 'name and slug required');
    const m = await prisma.market.create({
      data: {
        name,
        slug,
        type: type || 'regular',
        openTime: openTime ?? null,
        closeTime: closeTime ?? null,
        days: days ?? null,
        autoResult: autoResult === undefined ? false : Boolean(autoResult),
        active: active === undefined ? true : Boolean(active),
      },
    });
    return created(res, m, 'Market created');
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.post('/games/:id/rates', async (req, res) => {
  try {
    const { gameType, payout, minBet, maxBet } = req.body;
    if (!gameType || payout == null) return badRequest(res, 'Missing fields');
    const r = await prisma.rate.upsert({
      where: {
        marketId_gameType: { marketId: String(req.params.id), gameType },
      },
      create: {
        marketId: String(req.params.id),
        gameType,
        payout: Number(payout),
        minBet: Number(minBet ?? 10),
        maxBet: Number(maxBet ?? 10000),
      },
      update: {
        payout: Number(payout),
        minBet: Number(minBet ?? 10),
        maxBet: Number(maxBet ?? 10000),
      },
    });
    return ok(res, r, 'Rate saved');
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

// ============================================================
// UPI
// ============================================================
router.get('/upi', async (req, res) => {
  try {
    const where: any = {};
    if (req.query.status) where.status = String(req.query.status);
    const rows = await prisma.upiVerification.findMany({
      where,
      include: { user: { select: { mobile: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    return ok(res, rows);
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.post('/upi/:id/approve', async (req, res) => {
  try {
    const u = await prisma.upiVerification.findUnique({ where: { id: String(req.params.id) } });
    if (!u) return notFound(res);
    if (u.status !== 'pending') return badRequest(res, 'Already processed');

    const depositAmount = Number(u.amount);

    // 🚀 Credit deposit + auto-apply bonus
    const { bonus, total } = await creditDepositWithBonus({
      userId: u.userId,
      amount: depositAmount,
      remark: `UPI deposit approved (UTR ${u.utr || '-'})`,
    });

    const updated = await prisma.upiVerification.update({
      where: { id: u.id },
      data: { status: 'approved' },
    });

    // FCM push
    try {
      const user = await prisma.user.findUnique({
        where: { id: u.userId },
        select: { name: true, wallet: true },
      });
      const title = bonus > 0
        ? `💰 ₹${depositAmount} + ₹${bonus} Bonus Credited`
        : `💰 Deposit Approved`;
      const body = bonus > 0
        ? `₹${depositAmount} + ₹${bonus} bonus added. Balance: ₹${Math.round(Number(user?.wallet ?? 0))}`
        : `₹${depositAmount} added. Balance: ₹${Math.round(Number(user?.wallet ?? 0))}`;
      sendToUser(u.userId, title, body, {
        type: 'credit',
        amount: String(depositAmount),
        bonus: String(bonus),
      }).catch((e) => console.error('[fcm] push failed:', e?.message));
    } catch (e: any) {
      console.error('[fcm] prep failed:', e?.message);
    }

    return ok(
      res,
      { ...updated, bonusCredited: bonus, totalCredited: total },
      bonus > 0
        ? `Approved — ₹${depositAmount} + ₹${bonus} bonus = ₹${total}`
        : `Approved — ₹${depositAmount}`,
    );
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.post('/upi/:id/reject', async (req, res) => {
  try {
    const u = await prisma.upiVerification.update({
      where: { id: String(req.params.id) },
      data: { status: 'rejected' },
    });
    return ok(res, u, 'Rejected');
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

// ============================================================
// REFERRALS
// ============================================================
router.get('/referrals', async (req, res) => {
  try {
    const { status, search } = req.query;
    const where: any = {};
    if (status) where.status = String(status);
    if (search) {
      where.OR = [
        { referrerMobile: { contains: String(search) } },
        { refereeMobile: { contains: String(search) } },
      ];
    }

    const rows = await prisma.referral.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const totalPending = rows.filter((r) => r.status === 'pending')
      .reduce((s, r) => s + Number(r.cashbackAmount || 0), 0);
    const totalEligible = rows.filter((r) => r.status === 'eligible')
      .reduce((s, r) => s + Number(r.cashbackAmount || 0), 0);
    const totalPaid = rows.filter((r) => r.status === 'paid')
      .reduce((s, r) => s + Number(r.cashbackAmount || 0), 0);

    return ok(res, { rows, total: rows.length, totalPending, totalEligible, totalPaid });
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.post('/referrals/:id/pay', async (req, res) => {
  try {
    const { cashbackAmount } = req.body;
    const { payCashback } = await import('../services/referral.service');
    const updated = await payCashback(
      String(req.params.id),
      cashbackAmount ? Number(cashbackAmount) : undefined
    );
    await prisma.auditLog.create({
      data: {
        adminId: req.admin!.sub,
        action: 'referral.pay',
        details: `${updated.referrerMobile} <- Rs ${updated.cashbackAmount}`,
        ipAddress: req.ip,
      },
    });
    return ok(res, updated, 'Cashback paid');
  } catch (e: any) {
    return badRequest(res, e.message);
  }
});

router.post('/referrals/:id/reject', async (req, res) => {
  try {
    const ref = await prisma.referral.update({
      where: { id: String(req.params.id) },
      data: { status: 'rejected' },
    });
    return ok(res, ref, 'Rejected');
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.post('/referrals/:id/recheck', async (req, res) => {
  try {
    const ref = await prisma.referral.findUnique({ where: { id: String(req.params.id) } });
    if (!ref) return notFound(res);
    const { checkEligibility } = await import('../services/referral.service');
    await checkEligibility(ref.refereeMobile);
    const updated = await prisma.referral.findUnique({ where: { id: ref.id } });
    return ok(res, updated, 'Rechecked');
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.get('/referrals/settings', async (req, res) => {
  try {
    const { getConfig } = await import('../services/referral.service');
    const cfg = await getConfig();
    return ok(res, cfg);
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.post('/referrals/settings', requireSuperAdmin, async (req, res) => {
  try {
    const body = req.body as Record<string, any>;
    const map: Record<string, string> = {
      referral_enabled: body.enabled ? '1' : '0',
      referral_type: String(body.type || 'first_deposit'),
      referral_fixed_amount: String(body.fixedAmount ?? 20),
      referral_percent: String(body.percent ?? 5),
      referral_first_deposit_min: String(body.firstDepositMin ?? 100),
      referral_play_required: body.playRequired ? '1' : '0',
      referral_play_threshold_pct: String(body.playThresholdPct ?? 100),
      referral_max_cashback: String(body.maxCashback ?? 500),
    };

    for (const [key, value] of Object.entries(map)) {
      await prisma.setting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      });
    }

    await prisma.auditLog.create({
      data: {
        adminId: req.admin!.sub,
        action: 'referral.settings.update',
        details: JSON.stringify(body),
        ipAddress: req.ip,
      },
    });
    return ok(res, {}, 'Settings saved');
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

// ============================================================
// NOTIFICATIONS
// ============================================================
router.post('/notification/send', async (req, res) => {
  try {
    const body = req.body as Record<string, any>;
    const title = String(body.title || '').trim();
    const message = String(body.body || '').trim();
    const topic = String(body.topic || 'all').trim();
    const userId = body.userId ? String(body.userId) : null;

    if (!title) return badRequest(res, 'Title required');
    if (!message) return badRequest(res, 'Message required');
    if (title.length > 200) return badRequest(res, 'Title too long (max 200)');
    if (message.length > 2000) return badRequest(res, 'Message too long (max 2000)');

    const n = await prisma.notification.create({
      data: {
        userId,
        title,
        body: message,
        type: 'push',
      },
    });

    let fcmMessageId: string | null = null;
    let fcmError: string | null = null;

    try {
      if (userId) {
        const result = await sendToUser(userId, title, message, {
          type: 'admin',
          notificationId: n.id,
        });
        fcmMessageId = `sent:${result.successCount},failed:${result.failureCount}`;
      } else {
        fcmMessageId = await sendToTopic(topic, title, message, {
          type: 'admin',
          notificationId: n.id,
        });
      }
    } catch (e: any) {
      fcmError = e.message || 'FCM failed';
      console.error('[notification/send] FCM error:', fcmError);
    }

    await prisma.auditLog.create({
      data: {
        adminId: req.admin!.sub,
        action: 'notification.send',
        details: userId
          ? `user=${userId} title="${title}" fcm=${fcmMessageId ? 'sent' : 'failed'}`
          : `topic=${topic} title="${title}" fcm=${fcmMessageId ? 'sent' : 'failed'}`,
        ipAddress: req.ip,
      },
    });

    if (fcmMessageId) {
      return created(
        res,
        { id: n.id, fcmSent: true, fcmMessageId, topic, userId },
        userId ? 'Notification sent to user' : 'Notification sent to all devices'
      );
    } else {
      return created(
        res,
        { id: n.id, fcmSent: false, fcmError, topic, userId },
        `Saved to log (FCM not sent: ${fcmError || 'not configured'})`
      );
    }
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

router.get('/notification/history', async (req, res) => {
  try {
    const rows = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return ok(res, rows);
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

// ============================================================
// SLIDER
// ============================================================
router.get('/slider', async (req, res) => {
  try {
    const rows = await prisma.imageSlider.findMany({ orderBy: { sortOrder: 'asc' } });
    return ok(res, rows);
  } catch (e: any) { return serverError(res, e.message); }
});

router.post('/slider', requireSuperAdmin, async (req, res) => {
  try {
    const body = req.body as Record<string, any>;
    if (!body.imageUrl) return badRequest(res, 'imageUrl required');
    const s = await prisma.imageSlider.create({
      data: {
        title: body.title ? String(body.title) : null,
        imageUrl: String(body.imageUrl),
        linkUrl: body.linkUrl ? String(body.linkUrl) : null,
        sortOrder: Number(body.sortOrder) || 0,
        active: body.active !== false,
      },
    });
    await prisma.auditLog.create({
      data: {
        adminId: req.admin!.sub,
        action: 'slider.create',
        details: String(body.imageUrl),
        ipAddress: req.ip,
      },
    });
    return created(res, s, 'Slider added');
  } catch (e: any) { return serverError(res, e.message); }
});

router.put('/slider/:id', requireSuperAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    const body = req.body as Record<string, any>;
    const existing = await prisma.imageSlider.findUnique({ where: { id } });
    if (!existing) return notFound(res);
    const updated = await prisma.imageSlider.update({
      where: { id },
      data: {
        title: body.title !== undefined ? (body.title ? String(body.title) : null) : existing.title,
        imageUrl: body.imageUrl !== undefined ? String(body.imageUrl) : existing.imageUrl,
        linkUrl: body.linkUrl !== undefined ? (body.linkUrl ? String(body.linkUrl) : null) : existing.linkUrl,
        sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : existing.sortOrder,
        active: body.active !== undefined ? Boolean(body.active) : existing.active,
      },
    });
    await prisma.auditLog.create({
      data: {
        adminId: req.admin!.sub,
        action: 'slider.update',
        details: updated.id,
        ipAddress: req.ip,
      },
    });
    return ok(res, updated, 'Slider updated');
  } catch (e: any) { return serverError(res, e.message); }
});

router.delete('/slider/:id', requireSuperAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    await prisma.imageSlider.delete({ where: { id } });
    await prisma.auditLog.create({
      data: {
        adminId: req.admin!.sub,
        action: 'slider.delete',
        details: id,
        ipAddress: req.ip,
      },
    });
    return ok(res, {}, 'Deleted');
  } catch (e: any) { return serverError(res, e.message); }
});

router.get('/slider-website', async (req, res) => {
  try {
    const rows = await prisma.imageSliderWebsite.findMany({ orderBy: { sortOrder: 'asc' } });
    return ok(res, rows);
  } catch (e: any) { return serverError(res, e.message); }
});

router.post('/slider-website', requireSuperAdmin, async (req, res) => {
  try {
    const body = req.body as Record<string, any>;
    if (!body.imageUrl) return badRequest(res, 'imageUrl required');
    const s = await prisma.imageSliderWebsite.create({
      data: {
        title: body.title ? String(body.title) : null,
        imageUrl: String(body.imageUrl),
        linkUrl: body.linkUrl ? String(body.linkUrl) : null,
        sortOrder: Number(body.sortOrder) || 0,
        active: body.active !== false,
      },
    });
    return created(res, s, 'Slider added');
  } catch (e: any) { return serverError(res, e.message); }
});

router.put('/slider-website/:id', requireSuperAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    const body = req.body as Record<string, any>;
    const existing = await prisma.imageSliderWebsite.findUnique({ where: { id } });
    if (!existing) return notFound(res);
    const updated = await prisma.imageSliderWebsite.update({
      where: { id },
      data: {
        title: body.title !== undefined ? (body.title ? String(body.title) : null) : existing.title,
        imageUrl: body.imageUrl !== undefined ? String(body.imageUrl) : existing.imageUrl,
        linkUrl: body.linkUrl !== undefined ? (body.linkUrl ? String(body.linkUrl) : null) : existing.linkUrl,
        sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : existing.sortOrder,
        active: body.active !== undefined ? Boolean(body.active) : existing.active,
      },
    });
    return ok(res, updated, 'Slider updated');
  } catch (e: any) { return serverError(res, e.message); }
});

router.delete('/slider-website/:id', requireSuperAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    await prisma.imageSliderWebsite.delete({ where: { id } });
    return ok(res, {}, 'Deleted');
  } catch (e: any) { return serverError(res, e.message); }
});

export default router;