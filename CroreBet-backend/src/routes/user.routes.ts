import { Router } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../config/db';
import { requireUser } from '../middleware/auth';
import { ok, badRequest, serverError, notFound } from '../utils/response';
import { registerToken, unsubscribeTokenFromTopic } from '../services/fcm.service';

const router = Router();
router.use(requireUser);

// 🚀 Extract client IP + device ID from request
function captureClientInfo(req: any) {
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    null;
  const deviceId = String(req.headers['x-device-id'] || '').trim().slice(0, 128);
  return { ip, deviceId };
}

router.get('/profile', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: {
        id: true, mobile: true, name: true, email: true,
        wallet: true, referCode: true, referredBy: true,
        verified: true, createdAt: true,
        // 🚀 tracking fields
        lastSeen: true,
        lastLat: true,
        lastLng: true,
        lastLocation: true,
        lastLocationAt: true,
        lastIp: true,
        lastDeviceId: true,
      },
    });
    if (!user) return notFound(res);
    return ok(res, user);
  } catch (e: any) { return serverError(res, e.message); }
});

router.post('/change-password', async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return badRequest(res, 'Missing fields');
    if (newPassword.length < 6) return badRequest(res, 'Min 6 chars');

    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) return notFound(res);

    const okPwd = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!okPwd) return badRequest(res, 'Old password incorrect');

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(newPassword, 12) },
    });
    return ok(res, {}, 'Password updated');
  } catch (e: any) { return serverError(res, e.message); }
});

// ═══════════════════════════════════════════════════════════
// 🚀 PASSBOOK — full lifetime + bid details joined
//
// Returns every transaction for the user, enriched with:
//   • digits       — bid number (e.g. "00", "125")
//   • gameType     — jodi / single_panna / etc.
//   • marketName   — MAHALAXMI, SRIDEVI, etc.
//   • bidStatus    — pending / won / lost
//   • session      — 'open' | 'close' | null  🚀 NEW
//
// These extra fields are null for non-bid transactions
// (deposits, withdrawals, admin credits, etc.)
// ═══════════════════════════════════════════════════════════
router.get('/passbook', async (req, res) => {
  try {
    const txns = await prisma.transaction.findMany({
      where: { userId: req.user!.sub },
      orderBy: { createdAt: 'desc' },
      // 🚀 No take limit — returns full lifetime
    });

    // 🚀 Enrich each transaction with bid details via gameId join
    const gameIds = txns.map((t) => t.gameId).filter(Boolean) as string[];
    const bids = gameIds.length
      ? await prisma.bid.findMany({
          where: { id: { in: gameIds } },
          select: {
            id: true,
            digits: true,
            gameType: true,
            status: true,
            session: true,   // 🚀 NEW
            market: { select: { name: true } },
          },
        })
      : [];
    const bidMap = Object.fromEntries(bids.map((b) => [b.id, b]));

    const enriched = txns.map((t) => {
      const b = t.gameId ? bidMap[t.gameId] : null;
      return {
        id: t.id,
        amount: Number(t.amount),
        type: t.type,
        remark: t.remark,
        balanceBefore: t.balanceBefore != null ? Number(t.balanceBefore) : null,
        balanceAfter: t.balanceAfter != null ? Number(t.balanceAfter) : null,
        createdAt: t.createdAt,
        // 🚀 New fields — null when txn isn't tied to a bid
        digits: b?.digits ?? null,
        gameType: b?.gameType ?? null,
        marketName: b?.market?.name ?? null,
        bidStatus: b?.status ?? null,
        session: b?.session ?? null,   // 🚀 NEW — 'open' | 'close' | null
      };
    });

    return ok(res, { items: enriched });
  } catch (e: any) { return serverError(res, e.message); }
});

router.get('/transactions', async (req, res) => {
  try {
    const { from, to, type } = req.query;
    const where: any = { userId: req.user!.sub };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(String(from));
      if (to) where.createdAt.lte = new Date(String(to));
    }
    if (type === 'credit') where.type = 1;
    if (type === 'debit') where.type = 0;

    const txns = await prisma.transaction.findMany({
      where, orderBy: { createdAt: 'desc' }, take: 200,
    });
    return ok(res, txns);
  } catch (e: any) { return serverError(res, e.message); }
});

router.get('/bank', async (req, res) => {
  try {
    const bank = await prisma.bankDetail.findUnique({ where: { userId: req.user!.sub } });
    return ok(res, bank || {});
  } catch (e: any) { return serverError(res, e.message); }
});

router.post('/bank', async (req, res) => {
  try {
    const { holderName, accountNo, ifsc, upi, phonepe, gpay, paytm } = req.body;

    // 🚀 Upsert — creates on first save, updates on subsequent saves.
    // Only overwrite fields that were actually provided (not undefined).
    const bank = await prisma.bankDetail.upsert({
      where: { userId: req.user!.sub },
      create: {
        userId: req.user!.sub,
        holderName: holderName || null,
        accountNo: accountNo || null,
        ifsc: ifsc || null,
        upi: upi || null,
        phonepe: phonepe || null,
        gpay: gpay || null,
        paytm: paytm || null,
      },
      update: {
        holderName: holderName ?? undefined,
        accountNo: accountNo ?? undefined,
        ifsc: ifsc ?? undefined,
        upi: upi ?? undefined,
        phonepe: phonepe ?? undefined,
        gpay: gpay ?? undefined,
        paytm: paytm ?? undefined,
      },
    });

    await prisma.user.update({
      where: { id: req.user!.sub },
      data: { lastSeen: new Date() },
    }).catch(() => {});

    return ok(res, bank, 'Bank details saved');
  } catch (e: any) { return serverError(res, e.message); }
});

router.get('/withdrawals', async (req, res) => {
  try {
    const list = await prisma.withdrawal.findMany({
      where: { userId: req.user!.sub },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return ok(res, list);
  } catch (e: any) { return serverError(res, e.message); }
});

router.post('/fcm-token', async (req, res) => {
  try {
    const { token, platform = 'android', topics = [] } = req.body;
    if (!token || typeof token !== 'string') {
      return badRequest(res, 'Missing token');
    }
    const record = await registerToken({
      token,
      userId: req.user!.sub,
      platform,
      topics: Array.isArray(topics) ? topics : [],
    });
    return ok(res, { id: record.id }, 'Token saved');
  } catch (e: any) { return serverError(res, e.message); }
});

router.post('/fcm-token/remove', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== 'string') return badRequest(res, 'Missing token');
    const result = await prisma.deviceToken.updateMany({
      where: { token, userId: req.user!.sub },
      data: { active: false, userId: null },
    });
    if (result.count) {
      try { await unsubscribeTokenFromTopic(token, 'all'); }
      catch (e) { console.error('[fcm] unsubscribe failed:', (e as Error).message); }
    }
    return ok(res, {}, 'Token removed');
  } catch (e: any) { return serverError(res, e.message); }
});

// ═══════════════════════════════════════════════════════════
// LOCATION — silent report from Flutter on Home load.
// Now captures: lat, lng, human-readable address, client IP,
// device ID. Also touches lastSeen.
// ═══════════════════════════════════════════════════════════
router.post('/location', async (req, res) => {
  try {
    const { lat, lng, address } = req.body;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return badRequest(res, 'Missing or invalid lat/lng');
    }

    const { ip, deviceId } = captureClientInfo(req);

    await prisma.user.update({
      where: { id: req.user!.sub },
      data: {
        lastLat: lat,
        lastLng: lng,
        lastLocation: address ? String(address).slice(0, 255) : null,
        lastLocationAt: new Date(),
        lastIp: ip,
        lastDeviceId: deviceId || undefined,
        lastSeen: new Date(),
      },
    });

    return ok(res, {}, 'Location saved');
  } catch (e: any) { return serverError(res, e.message); }
});

export default router;
