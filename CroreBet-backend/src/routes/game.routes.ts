import { Router } from 'express';
import prisma from '../config/db';
import { requireUser } from '../middleware/auth';
import { placeBid, placeBids, isValidGameType } from '../services/game.service';
import { ok, badRequest, serverError, notFound } from '../utils/response';

const router = Router();

function istToday(): string {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 3600 * 1000);
  if (ist.getUTCHours() < 3) {
    return new Date(ist.getTime() - 86400000).toISOString().split('T')[0];
  }
  return ist.toISOString().split('T')[0];
}

router.get('/home', async (req, res) => {
  try {
    const [markets, notices, sliders] = await Promise.all([
      prisma.market.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
      prisma.notice.findMany({ where: { active: true }, orderBy: { createdAt: 'desc' }, take: 5 }),
      prisma.imageSlider.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
    ]);
    return ok(res, { markets, notices, sliders });
  } catch (e: any) { return serverError(res, e.message); }
});

router.get('/markets', async (req, res) => {
  try {
    const type = (req.query.type as string) || undefined;
    const where: any = { active: true };
    if (type) where.type = type;
    const markets = await prisma.market.findMany({ where, orderBy: { name: 'asc' } });
    return ok(res, markets);
  } catch (e: any) { return serverError(res, e.message); }
});

router.get('/market/:slug', async (req, res) => {
  try {
    const market = await prisma.market.findUnique({
      where: { slug: req.params.slug },
      include: { rates: true },
    });
    if (!market) return notFound(res, 'Market not found');
    return ok(res, market);
  } catch (e: any) { return serverError(res, e.message); }
});

router.get('/timings', async (req, res) => {
  try {
    const list = await prisma.market.findMany({
      where: { active: true },
      select: { id: true, name: true, slug: true, type: true, openTime: true, closeTime: true },
    });
    return ok(res, list);
  } catch (e: any) { return serverError(res, e.message); }
});

router.get('/rates/:marketId', async (req, res) => {
  try {
    const rates = await prisma.rate.findMany({ where: { marketId: req.params.marketId } });
    return ok(res, rates);
  } catch (e: any) { return serverError(res, e.message); }
});

router.get('/result', async (req, res) => {
  try {
    const { marketName, date } = req.query;
    const where: any = {};
    if (date) where.resultDate = new Date(String(date));
    if (marketName) {
      const m = await prisma.market.findFirst({ where: { name: String(marketName) } });
      if (!m) return notFound(res, 'Market not found');
      where.marketId = m.id;
    }
    const results = await prisma.result.findMany({
      where,
      include: { market: { select: { name: true, slug: true } } },
      orderBy: { resultDate: 'desc' },
      take: 100,
    });
    return ok(res, results);
  } catch (e: any) { return serverError(res, e.message); }
});

router.get('/charts', async (req, res) => {
  try {
    const { marketName, limit } = req.query;
    const where: any = {};
    if (marketName) where.marketName = String(marketName);
    const rows = await prisma.chartOpenClose.findMany({
      where,
      orderBy: { resultDate: 'desc' },
      take: Math.min(Number(limit) || 50, 200),
    });
    return ok(res, rows);
  } catch (e: any) { return serverError(res, e.message); }
});

// 🔒 SECURITY: amount bounds + digits length cap + session whitelist.
// No rate limit — business wants unlimited bids.
//
// 🚀 NO `resultLockedDate` check here. The service layer's
//    `assertBidEligible()` handles every case correctly:
//      • Close time passed → blocked
//      • Close result declared → blocked
//      • Open result declared + open-session game → blocked
//      • Open time passed + jodi/half_sangam_a/full_sangam → blocked
//    Removing the market-level lock so CLOSE bids work even
//    after OPEN result is declared.
router.post('/bid/batch', requireUser, async (req, res) => {
  try {
    const { marketId, gameType, session, bids } = req.body;
    if (typeof marketId !== 'string' || !marketId || typeof gameType !== 'string' || !isValidGameType(gameType)) {
      return badRequest(res, 'Invalid market or game type');
    }
    if (session && !['open', 'close'].includes(session)) return badRequest(res, 'Invalid session');
    if (!Array.isArray(bids) || bids.length === 0 || bids.length > 500) return badRequest(res, 'A batch must contain between 1 and 500 bids');
    const normalized = bids.map((bid: any) => ({ digits: String(bid?.digits ?? ''), amount: Number(bid?.amount) }));
    if (normalized.some((bid: { digits: string; amount: number }) => !bid.digits || bid.digits.length > 20 || !Number.isFinite(bid.amount) || bid.amount <= 0)) {
      return badRequest(res, 'Invalid digits or amount');
    }
    const result = await placeBids({ userId: req.user!.sub, marketId, gameType, session, bids: normalized });
    return ok(res, { bidIds: result.bids.map(bid => bid.id), wallet: result.wallet }, 'Bids placed');
  } catch (e: any) {
    return badRequest(res, e.message);
  }
});

router.post('/bid', requireUser, async (req, res) => {
  try {
    const { marketId, gameType, session, digits, amount } = req.body;
    if (!marketId || !gameType || !digits || !amount) return badRequest(res, 'Missing fields');
    if (!isValidGameType(gameType)) return badRequest(res, 'Invalid game type');

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 10) return badRequest(res, 'Minimum bid is 10');
    if (amt > 100000) return badRequest(res, 'Maximum bid is 100000');

    const digitsStr = String(digits);
    if (digitsStr.length > 20) return badRequest(res, 'Invalid digits');

    if (session && !['open', 'close'].includes(String(session))) {
      return badRequest(res, 'Invalid session');
    }

    const market = await prisma.market.findUnique({
      where: { id: marketId },
      select: { id: true, name: true, active: true },   // 🚀 removed resultLockedDate
    });
    if (!market) return badRequest(res, 'Market not found');
    if (!market.active) return badRequest(res, 'Market not active');

    // 🚀 Removed the resultLockedDate check here — see comment above.

    const bid = await placeBid({
      userId: req.user!.sub,
      marketId, gameType,
      session,
      digits: digitsStr,
      amount: amt,
    });
    return ok(res, bid, 'Bid placed');
  } catch (e: any) { return badRequest(res, e.message); }
});
// 🚀 BULK BID ROUTE (For SP/DP Common)
router.post('/bids', requireUser, async (req, res) => {
  try {
    const { marketId, gameType, session, bids } = req.body;

    if (!bids || !Array.isArray(bids) || bids.length === 0) {
      return badRequest(res, 'No bids provided');
    }
    if (!marketId || !gameType) return badRequest(res, 'Missing fields');
    if (!isValidGameType(gameType)) return badRequest(res, 'Invalid game type');

    const market = await prisma.market.findUnique({
      where: { id: marketId },
      select: { id: true, name: true, active: true },
    });
    if (!market || !market.active) return badRequest(res, 'Market not active');

    // Calculate total amount to check wallet
    const totalAmount = bids.reduce((sum: number, b: any) => sum + Number(b.amount), 0);
    
    // You can add wallet check here if not handled inside placeBid
    // const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    // if (Number(user.wallet) < totalAmount) return badRequest(res, 'Insufficient balance');

    let successCount = 0;
    const errors: string[] = [];

    // Loop through and place each bid using your existing service logic
    for (const b of bids) {
      try {
        await placeBid({
          userId: req.user!.sub,
          marketId,
          gameType,
          session: session || 'open',
          digits: String(b.digits),
          amount: Number(b.amount),
        });
        successCount++;
      } catch (err: any) {
        errors.push(err.message);
      }
    }

    if (successCount === 0) {
      return badRequest(res, errors[0] || 'Failed to place any bids');
    }

    return ok(res, { count: successCount }, `${successCount} Bids placed successfully`);
  } catch (e: any) { 
    return serverError(res, e.message); 
  }
});
// ═══════════════════════════════════════════════════════════
// 🚀 BID HISTORY — full lifetime (no pagination limit)
// ═══════════════════════════════════════════════════════════
router.get('/bid-history', requireUser, async (req, res) => {
  try {
    const { from, to, status } = req.query;
    const where: any = { userId: req.user!.sub };
    if (from || to) {
      where.bidDate = {};
      if (from) where.bidDate.gte = new Date(String(from));
      if (to) where.bidDate.lte = new Date(String(to));
    }
    if (status) where.status = status;

    const bids = await prisma.bid.findMany({
      where,
      include: { market: { select: { name: true, slug: true } } },
      orderBy: { bidDate: 'desc' },
      // 🚀 No take limit — returns full lifetime of bids
    });
    return ok(res, bids);
  } catch (e: any) { return serverError(res, e.message); }
});

export default router;
