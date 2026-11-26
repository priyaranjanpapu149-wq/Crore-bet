import prisma from '../config/db';
import { Prisma } from '@prisma/client';
import { todayIST } from '../utils/dateIST';
import { sendToTopic, sendToUser } from './fcm.service';

// ============================================================
// RATE RESOLUTION
// ============================================================
const SETTING_KEY_MAP: Record<string, string> = {
  single:         'rate_single',
  jodi:           'rate_jodi',
  single_panna:   'rate_singlepatti',
  double_panna:   'rate_doublepatti',
  triple_panna:   'rate_triplepatti',
  family_panna:   'rate_familypanna',
  cycle_patti:    'rate_cyclepatti',   // kept for legacy/fallback
  group_jodi:     'rate_groupjodi',
  sp_dp_tp:       'rate_sp_dp_tp',     // fallback only — dynamic resolver takes priority
  sp_motor:       'rate_sp_motor',
  dp_motor:       'rate_dp_motor',
  odd_even:       'rate_odd_even',
  red_bracket:    'rate_red_bracket',
  half_sangam:    'rate_halfsangam',
  half_sangam_a:  'rate_halfsangam',
  half_sangam_b:  'rate_halfsangam',
  full_sangam:    'rate_fullsangam',
};

// 🚀 Global bet limits (per single bid, NOT subtotal)
const MIN_BET = 10;
const MAX_BET = 100000;

// 🚀 Games with no session — always forced to null regardless of what the app sends.
//    (app historically sent 'jodi' as a marker; backend must ignore that)
const SESSIONLESS_GAMES = ['jodi', 'group_jodi', 'red_bracket'];

export const VALID_GAME_TYPES: string[] = Object.keys(SETTING_KEY_MAP);
export type GameType = string;

export function isValidGameType(t: unknown): t is string {
  return typeof t === 'string' && Object.prototype.hasOwnProperty.call(SETTING_KEY_MAP, t);
}

// ============================================================
// 🚀 GAME VALID LISTS — single source of truth
// ============================================================

/**
 * CYCLE PATTI — 55 two-digit pattern codes.
 *
 * Expansion rule (validated by both subsequences):
 *   A 3-digit panna `xyz` is valid iff
 *     xy ∈ CYCLE_PATTI_LIST  AND  yz ∈ CYCLE_PATTI_LIST
 *
 * Example (pattern 23):
 *   ✓ 123, 223, 230, 233, 234, 235, 236, 237, 238, 239
 *   ✗ 023 (02 not in list), 323 (32 not in list), 231 (31 not in list)
 */
export const CYCLE_PATTI_LIST: string[] = [
  '00',
  '10','11','12','13','14','15','16','17','18','19',
  '20','22','23','24','25','26','27','28','29',
  '30','33','34','35','36','37','38','39',
  '40','44','45','46','47','48','49',
  '50','55','56','57','58','59',
  '60','66','67','68','69',
  '70','77','78','79',
  '80','88','89',
  '90','99',
];

export const SP_MOTOR_LIST: string[] = [];
export const DP_MOTOR_LIST: string[] = [];

function isThreeDistinct(d: string): boolean {
  return /^\d{3}$/.test(d) && new Set(d.split('')).size === 3;
}
function isExactlyTwoSame(d: string): boolean {
  return /^\d{3}$/.test(d) && new Set(d.split('')).size === 2;
}
function isAllSame(d: string): boolean {
  return /^\d{3}$/.test(d) && new Set(d.split('')).size === 1;
}

export function getGameOptions(gameType: string): string[] {
  switch (gameType) {
    case 'cycle_patti': return CYCLE_PATTI_LIST;
    case 'sp_motor':    return SP_MOTOR_LIST;
    case 'dp_motor':    return DP_MOTOR_LIST;
    case 'odd_even':    return ['ODD', 'EVEN'];
    case 'red_bracket': return ['HALF', 'FULL'];
    case 'triple_panna':
      return ['000','111','222','333','444','555','666','777','888','999'];
    default: return [];
  }
}

// ============================================================
// 🚀 RATE RESOLUTION
//
// For cycle_patti, resolve to the underlying panna rate based on
// the panna's digit pattern:
//   3 distinct digits → rate_singlepatti
//   exactly 2 same    → rate_doublepatti
//   all 3 same        → rate_triplepatti
//
// For sp_dp_tp, resolve dynamically by panna types in the digits:
//   single panna (3 distinct)  → ₹160 per ₹1
//   double panna (2 same)      → ₹320 per ₹1
//   triple panna (all same)    → ₹1000 per ₹1
//   Mixed → higher tier wins (triple > double > single)
// ============================================================
async function getRateForGameType(
  tx: any,
  marketId: string,
  gameType: string,
  digits?: string,
): Promise<number> {
  // 🚀 cycle_patti → resolve to underlying panna rate
  if (gameType === 'cycle_patti') {
    if (!digits) {
      throw new Error('cycle_patti requires digits to resolve rate');
    }
    const d = String(digits).replace(/\D/g, '');
    if (!/^\d{3}$/.test(d)) {
      throw new Error('cycle_patti digits must be 3-digit panna');
    }
    const unique = new Set(d.split('')).size;
    const underlying =
      unique === 1 ? 'triple_panna' :
      unique === 2 ? 'double_panna' :
                     'single_panna';
    return getRateForGameType(tx, marketId, underlying);
  }

  // ═══════════════════════════════════════════════════════════
  // 🚀 sp_dp_tp → dynamic rate based on panna types
  //
  //   digits format: "OC-OPENPANNA-CLOSEPANNA"  e.g. "18-125678"
  //   Rate depends on the RAREST panna among the two:
  //     single panna (3 distinct) → ₹160 per ₹1
  //     double panna (2 same)     → ₹320 per ₹1
  //     triple panna (all same)   → ₹1000 per ₹1
  //   Mixed tier → higher tier wins (triple > double > single).
  // ═══════════════════════════════════════════════════════════
  if (gameType === 'sp_dp_tp') {
    if (!digits || !digits.includes('-')) {
      throw new Error('sp_dp_tp requires digits in format OC-OPENPANNA-CLOSEPANNA');
    }
    const parts = digits.split('-');
    if (parts.length < 3) {
      throw new Error('sp_dp_tp digits must be OC-OPENPANNA-CLOSEPANNA');
    }
    const openPanna  = String(parts[1]).replace(/\D/g, '');
    const closePanna = String(parts[2]).replace(/\D/g, '');

    const tierOf = (p: string): 'single' | 'double' | 'triple' => {
      if (!/^\d{3}$/.test(p)) {
        throw new Error('sp_dp_tp pannas must be 3-digit each');
      }
      const u = new Set(p.split('')).size;
      return u === 3 ? 'single' : u === 2 ? 'double' : 'triple';
    };

    const ot = tierOf(openPanna);
    const ct = tierOf(closePanna);

    const RATE: Record<string, number> = {
      single: 160,
      double: 320,
      triple: 1000,
    };

    const order = ['single', 'double', 'triple'];
    const chosen = order[Math.max(order.indexOf(ot), order.indexOf(ct))];
    return RATE[chosen];
  }

  // ─── Standard resolution: per-market rate → global setting ──
  const rateRow = await tx.rate.findUnique({
    where: { marketId_gameType: { marketId, gameType } },
  });
  if (rateRow?.payout) {
    const n = Number(rateRow.payout);
    if (!isNaN(n) && n > 0) return n;
  }

  const settingKey = SETTING_KEY_MAP[gameType];
  if (settingKey) {
    const s = await tx.setting.findUnique({ where: { key: settingKey } });
    if (s?.value) {
      const n = Number(s.value);
      if (!isNaN(n) && n > 0) return n;
    }
  }

  throw new Error(
    `No rate configured for ${gameType}. Set it at /games/rates (key: ${settingKey || 'n/a'}) ` +
      `or add a per-market rate for this market.`,
  );
}

// ============================================================
// DIGIT VALIDATION — strict per-game
// ============================================================
export function validateDigits(gameType: string, digits: string): boolean {
  const d = digits.replace(/\D/g, '');
  switch (gameType) {
    case 'single':        return /^\d$/.test(d);
    case 'jodi':
    case 'group_jodi':    return /^\d{2}$/.test(d);

    case 'single_panna':  return isThreeDistinct(d);

    case 'family_panna':
      // 🚀 Family panna accepts ANY 3-digit panna.
      //    The app expands input 111 → 111, 116, 166, 666 etc.
      //    (some non-distinct) — all must pass validation.
      return /^\d{3}$/.test(d);

    case 'double_panna':  return isExactlyTwoSame(d);
    case 'triple_panna':  return isAllSame(d);

    case 'cycle_patti': {
      // 🚀 Both 2-digit subsequences must be in the list
      if (!/^\d{3}$/.test(d)) return false;
      const a = d.slice(0, 2);
      const b = d.slice(1, 3);
      return CYCLE_PATTI_LIST.includes(a) && CYCLE_PATTI_LIST.includes(b);
    }

    case 'sp_motor':
      return SP_MOTOR_LIST.length > 0 ? SP_MOTOR_LIST.includes(d) : isThreeDistinct(d);

    case 'dp_motor':
      return DP_MOTOR_LIST.length > 0 ? DP_MOTOR_LIST.includes(d) : isExactlyTwoSame(d);

    case 'half_sangam':
    case 'half_sangam_a': return /^\d{3}-\d$/.test(digits);
    case 'half_sangam_b': return /^\d-\d{3}$/.test(digits);
    case 'full_sangam':
    case 'sp_dp_tp':      return /^\d{3}-\d{3}$/.test(digits);
    case 'odd_even':      return /^(odd|even)$/i.test(digits);

    // 🚀 RED BRACKET — app expands FULL/HALF into 10 individual jodis.
    //    Each jodi arrives as a 2-digit string: '00','05','11',…,'99'
    case 'red_bracket':   return /^\d{2}$/.test(d);

    default:              return false;
  }
}

// ============================================================
// 🚀 BID ELIGIBILITY — market-wide + session-aware + open-time gate
// ============================================================
function assertBidEligible(params: {
  market: any;
  session?: string | null;
  gameType: string;
  nowMin: number;
  dayStart: Date;
  dayEnd: Date;
  existingOpen: any;
  existingClose: any;
}) {
  const { market, session, gameType, nowMin, existingOpen, existingClose } = params;

  // 1. Bid gap 00:00 – 00:05 IST
  if (nowMin >= 0 && nowMin < 5) {
    throw new Error('Bidding paused (00:00–00:05 IST) — try again in a moment');
  }

  // 2. Close time passed → market fully closed
  const [ch, cm] = String(market.closeTime || '23:59').split(':').map(Number);
  const closeMin = ch * 60 + cm;
  if (nowMin >= closeMin) {
    throw new Error(`${market.name}: closed — bid time is over`);
  }

  // 3. Close result dropped → market fully closed
  if (existingClose) {
    throw new Error(`${market.name}: closed — close result already declared`);
  }

  // ─── Classify game type ───
  const usesOpenSession = session === 'open';

  // 🚀 Games that become unfair / half-known once the open result drops:
  //   • jodi / group_jodi / red_bracket  → need open+close digits (open now known)
  //   • half_sangam_a                    → needs open panna (now known)
  //   • half_sangam_b                    → needs open ank  (now known)  🚀 NEW
  //   • full_sangam                      → needs open panna + close panna
  //
  // SP DP TP is NOT in this list — it's session-based and stays playable
  // until close time / close result drop.
  const BLOCKED_AFTER_OPEN: string[] = [
    'jodi',
    'group_jodi',
    'red_bracket',
    'half_sangam',
    'half_sangam_a',
    'half_sangam_b',   // 🚀 NEW — open ank is revealed, block Half Sangam B
    'full_sangam',
    // 🚀 REMOVED: sp_dp_tp — has CLOSE session, stays playable after open
  ];
  const blockedAfterOpen = BLOCKED_AFTER_OPEN.includes(gameType);

  const dependsOnOpen =
    usesOpenSession || blockedAfterOpen;

  // ═══════════════════════════════════════════════════════════
  // 4. 🚀 Open time passed → block every game that depends on open
  //
  //    e.g. Sridevi openTime = 11:35 AM → after 11:35, these are
  //    ALL blocked:
  //      • open session games (single, panna with session='open')
  //      • jodi, group_jodi, red_bracket
  //      • half_sangam_a, half_sangam_b, full_sangam
  //
  //    STILL PLAYABLE:
  //      • CLOSE session games (single, panna with session='close')
  //      • sp_dp_tp (has CLOSE session)
  //      • odd_even, family_panna, cycle_patti, motors (session-based)
  // ═══════════════════════════════════════════════════════════
  const [oh, om] = String(market.openTime || '00:00').split(':').map(Number);
  const openMin = oh * 60 + om;
  if (nowMin >= openMin && dependsOnOpen) {
    throw new Error(
      `${market.name}: open bid time is over — only CLOSE session playable`,
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 5. Open result declared → same block (belt + suspenders —
  //    catches the edge case where open result is declared early)
  // ═══════════════════════════════════════════════════════════
  if (existingOpen && dependsOnOpen) {
    throw new Error(
      `${market.name}: open result declared — ` +
      (blockedAfterOpen
        ? `${gameType} not available`
        : 'only CLOSE session playable'),
    );
  }
}

// ============================================================
// PLACE BID
// ============================================================
type BidParams = {
  userId: string;
  marketId: string;
  gameType: string;
  session?: string;
  digits: string;
  amount: number;
};

async function placeBidInTransaction(tx: Prisma.TransactionClient, params: BidParams) {
  const { userId, marketId, gameType, session, digits, amount } = params;

  if (!validateDigits(gameType, digits)) throw new Error('Invalid digits for ' + gameType);

  // 🚀 Per-bid min/max from Rate table (falls back to global MIN_BET/MAX_BET)
  //    Checked OUTSIDE the transaction for a fast fail before touching DB writes.
  //    Re-checked INSIDE the transaction below to guard against rate changes mid-flight.
  if (!Number.isFinite(amount) || amount < 1) {
    throw new Error('Invalid amount');
  }

  // 🚀 Normalize session for sessionless games (jodi / group_jodi / red_bracket).
  //    Force null no matter what the app sent ('jodi', '', undefined, etc.),
  //    so:
  //      • assertBidEligible uses the correct blockedAfterOpen check
  //      • DB stores null (not 'jodi')
  //      • checkWin uses combined open+close jodi as intended
  const normalizedSession: string | null = SESSIONLESS_GAMES.includes(gameType)
    ? null
    : (session || null);



    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user || !user.active) throw new Error('User not active');
    if (Number(user.wallet) < amount) throw new Error('Insufficient balance');

    const market = await tx.market.findUnique({ where: { id: marketId } });
    if (!market || !market.active) throw new Error('Market not active');
    if ((market as any).shutdown === true) throw new Error('Market closed (shutdown)');

    // ─── Current IST time ─────────────────────────────
    const _now = new Date();
    const _ist = new Date(_now.getTime() + 5.5 * 3600 * 1000);
    const nowMin = _ist.getUTCHours() * 60 + _ist.getUTCMinutes();

    // ─── Result-day (3 AM rollback) ───────────────────
    const _istToday =
      _ist.getUTCHours() < 3
        ? new Date(_ist.getTime() - 86400000).toISOString().split('T')[0]
        : _ist.toISOString().split('T')[0];

    const dayStart = new Date(_istToday + 'T00:00:00.000+05:30');
    const dayEnd   = new Date(_istToday + 'T23:59:59.999+05:30');

    // ─── Look up today's results for this market ──────
    const [existingOpen, existingClose] = await Promise.all([
      tx.result.findFirst({
        where: { marketId, session: 'open',
                 resultDate: { gte: dayStart, lte: dayEnd } },
      }),
      tx.result.findFirst({
        where: { marketId, session: 'close',
                 resultDate: { gte: dayStart, lte: dayEnd } },
      }),
    ]);

    // ─── Bid eligibility (uses normalized session) ────
    assertBidEligible({
      market,
      session: normalizedSession,
      gameType,
      nowMin,
      dayStart,
      dayEnd,
      existingOpen,
      existingClose,
    });

    // ═══════════════════════════════════════════════════════
    // 🚀 FIX 2 — Min/max bet enforcement (per single bid)
    //    Reads per-market Rate.minBet / Rate.maxBet.
    //    Falls back to MIN_BET (10) / MAX_BET (100000) if not configured.
    //    This is PER-BID — the subtotal for cart items is NOT checked here;
    //    each individual bid request must satisfy this.
    // ═══════════════════════════════════════════════════════
    const rateRow = await tx.rate.findUnique({
      where: { marketId_gameType: { marketId, gameType } },
    });

    let minB = MIN_BET;
    let maxB = MAX_BET;
    if (rateRow) {
      const rMin = Number(rateRow.minBet);
      const rMax = Number(rateRow.maxBet);
      if (Number.isFinite(rMin) && rMin > 0) minB = rMin;
      if (Number.isFinite(rMax) && rMax > 0) maxB = rMax;
    }

    if (amount < minB) {
      throw new Error(`Minimum bid is ₹${minB}`);
    }
    if (amount > maxB) {
      throw new Error(`Maximum bid is ₹${maxB}`);
    }

    // 🚀 Pass digits so cycle_patti AND sp_dp_tp can resolve dynamic rate
    const rateNum = await getRateForGameType(tx, marketId, gameType, digits);
    const payout  = amount * rateNum;

    // ═══════════════════════════════════════════════════════
    // 🚀 FIX 1 — Atomic wallet decrement (race-condition safe)
    //    Using { decrement } instead of { wallet: after } makes the DB
    //    perform a single UPDATE ... SET wallet = wallet - $amount
    //    which is atomic at the row level. Concurrent bids from the
    //    same user will serialize on the row lock, so the second
    //    transaction sees the already-decremented wallet.
    // ═══════════════════════════════════════════════════════
    const before = Number(user.wallet);

    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: { wallet: { decrement: amount } },
    });

    const after = Number(updatedUser.wallet);

    // 🚀 Post-decrement safety net — if wallet went negative, roll back
    if (after < 0) {
      throw new Error('Insufficient balance');
    }

    const bid = await tx.bid.create({
      data: {
        userId,
        marketId,
        gameType,
        session: normalizedSession,   // 🚀 uses the normalized value
        digits,
        amount,
        payout,
        status: 'pending',
      },
    });

    await tx.transaction.create({
      data: {
        userId,
        amount,
        type: 0,
        remark: `Bid placed on ${market.name} (${gameType})`,
        balanceBefore: before,
        balanceAfter: after,
        gameId: bid.id,
      },
    });

    return { bid, mobile: user.mobile };
}

export async function placeBids(params: Omit<BidParams, 'digits' | 'amount'> & {
  bids: Array<{ digits: string; amount: number }>;
}) {
  if (params.bids.length === 0 || params.bids.length > 500) {
    throw new Error('A batch must contain between 1 and 500 bids');
  }
  const placed = await prisma.$transaction(async (tx) => {
    const items = [];
    for (const item of params.bids) {
      items.push(await placeBidInTransaction(tx, { ...params, ...item }));
    }
    const user = await tx.user.findUniqueOrThrow({ where: { id: params.userId }, select: { wallet: true } });
    return { items, wallet: Number(user.wallet) };
  }, { timeout: 15000 });

  void import('./referral.service.js')
    .then(({ checkEligibility }) => checkEligibility(placed.items[0].mobile))
    .catch((e) => console.error('[referral:eligibility]', (e as Error).message));
  void sendToUser(params.userId, 'Bid placed',
    'Placed ' + placed.items.length + ' bid(s) successfully',
    { type: 'bid_placed', marketId: params.marketId },
  ).catch((e) => console.error('[fcm] bid notification failed:', e?.message));

  return { bids: placed.items.map(item => item.bid), wallet: placed.wallet };
}

export async function placeBid(params: BidParams) {
  const result = await placeBids({ ...params, bids: [{ digits: params.digits, amount: params.amount }] });
  return result.bids[0];
}

// ============================================================
// CHECK WIN — session-aware
// ============================================================
function checkWin(
  gameType: string,
  digits: string,
  session: string | null,
  r: {
    openResult?: string | null;
    closeResult?: string | null;
    jodiResult?: string | null;
    openPanna?: string | null;
    closePanna?: string | null;
  },
): boolean {
  const o = r.openResult || '';
  const c = r.closeResult || '';
  const j = r.jodiResult || (o && c ? o + c : '');
  const op = r.openPanna || '';
  const cp = r.closePanna || '';

  switch (gameType) {
    case 'single':
      if (session === 'open') return digits === o;
      if (session === 'close') return digits === c;
      return digits === o || digits === c;

    case 'jodi':
    case 'group_jodi':
      return !!j && digits === j;

    case 'single_panna':
    case 'family_panna':
    case 'cycle_patti':
    case 'sp_motor':
    case 'double_panna':
    case 'dp_motor':
    case 'triple_panna':
      if (session === 'open') return !!op && digits === op;
      if (session === 'close') return !!cp && digits === cp;
      return (!!op && digits === op) || (!!cp && digits === cp);

    case 'half_sangam':
    case 'half_sangam_a': {
      if (!digits.includes('-')) return false;
      const [panna, ank] = digits.split('-');
      return !!op && !!c && panna === op && ank === c;
    }

    case 'half_sangam_b': {
      if (!digits.includes('-')) return false;
      const [ank, panna] = digits.split('-');
      return !!o && !!cp && ank === o && panna === cp;
    }

    case 'full_sangam':
      return !!op && !!cp && digits === `${op}-${cp}`;

    case 'sp_dp_tp':
      return !!op && !!cp && digits === `${o}${c}-${op}${cp}`;

    case 'odd_even': {
      const wantsOdd = digits.toLowerCase() === 'odd';
      let targetDigit = '';
      if (session === 'open') targetDigit = o;
      else if (session === 'close') targetDigit = c;
      else targetDigit = j;
      if (!targetDigit) return false;
      let sum = 0;
      for (const ch of targetDigit) {
        const n = parseInt(ch, 10);
        if (isNaN(n)) return false;
        sum += n;
      }
      return wantsOdd ? sum % 2 === 1 : sum % 2 === 0;
    }

    // 🚀 RED BRACKET — app expands FULL/HALF into 10 individual jodis.
    //    Each bid is a normal jodi match against open+close combined.
    case 'red_bracket':
      return !!j && digits === j;

    default:
      return false;
  }
}

// ============================================================
// Helper: UTC day bounds
// ============================================================
function utcDayBounds(dateStr: string) {
  return {
    dayStart: new Date(dateStr + 'T00:00:00.000+05:30'),
    dayEnd:   new Date(dateStr + 'T23:59:59.999+05:30'),
    refDate:  new Date(dateStr + 'T00:00:00.000+05:30'),
  };
}

// ============================================================
// 🚀 DECLARE RESULT — with single-capture lock
// ============================================================
export async function declareResult(params: {
  marketId: string;
  session: 'open' | 'close';
  openResult?: string;
  closeResult?: string;
  jodiResult?: string;
  pannaResult?: string;
  resultDate?: string;
  force?: boolean;             // 🚀 admin override for the dev window
}) {
  const winnersToNotify: Array<{
    userId: string;
    payout: number;
    gameType: string;
    digits: string;
  }> = [];
  const lossesToNotify = new Map<string, number>();

  const outcome = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM markets WHERE id = ${params.marketId} FOR UPDATE`;
    const market = await tx.market.findUnique({ where: { id: params.marketId } });
    if (!market) throw new Error('Market not found');

    const dateStr = params.resultDate || todayIST();
    const { dayStart, dayEnd, refDate } = utcDayBounds(dateStr);

    // ─── Result-lock check ────────────────────────────
    const istNow = new Date(Date.now() + 5.5 * 3600 * 1000);
    const nowMin = istNow.getUTCHours() * 60 + istNow.getUTCMinutes();
    const [oh, om] = String(market.openTime || '00:00').split(':').map(Number);
    const openMin = oh * 60 + om;

    const existing = await tx.result.findFirst({
      where: {
        marketId: params.marketId,
        session: params.session,
        resultDate: { gte: dayStart, lte: dayEnd },
      },
    });

    // 🚀 After openTime: single capture only — no edits
    if (existing && nowMin >= openMin && !params.force) {
      throw new Error(
        `${market.name}: ${params.session} result already declared today — locked till next 3 AM`,
      );
    }

    const result = existing
      ? await tx.result.update({
          where: { id: existing.id },
          data: {
            openResult:  params.openResult  !== undefined ? params.openResult  : existing.openResult,
            closeResult: params.closeResult !== undefined ? params.closeResult : existing.closeResult,
            jodiResult:  params.jodiResult  !== undefined ? params.jodiResult  : existing.jodiResult,
            pannaResult: params.pannaResult !== undefined ? params.pannaResult : existing.pannaResult,
            declaredAt: new Date(),
          },
        })
      : await tx.result.create({
          data: {
            marketId: params.marketId,
            session: params.session,
            openResult:  params.openResult  ?? null,
            closeResult: params.closeResult ?? null,
            jodiResult:  params.jodiResult  ?? null,
            pannaResult: params.pannaResult ?? null,
            resultDate: refDate,
            declaredAt: new Date(),
          },
        });

    const otherSession = params.session === 'open' ? 'close' : 'open';
    const otherResult = await tx.result.findFirst({
      where: {
        marketId: params.marketId,
        session: otherSession,
        resultDate: { gte: dayStart, lte: dayEnd },
      },
    });

    const openDigit = params.session === 'open' ? params.openResult : otherResult?.openResult ?? null;
    const closeDigit = params.session === 'close' ? params.closeResult : otherResult?.closeResult ?? null;
    const openPanna = params.session === 'open' ? params.pannaResult : otherResult?.pannaResult ?? null;
    const closePanna = params.session === 'close' ? params.pannaResult : otherResult?.pannaResult ?? null;

    const bothDigitsReady = !!openDigit && !!closeDigit;

    const bidWhere: any = {
      marketId: params.marketId,
      status: 'pending',
      bidDate: { gte: dayStart, lte: dayEnd },
    };

    if (!bothDigitsReady) {
      bidWhere.session = params.session;
      bidWhere.gameType = {
        notIn: [
          'jodi', 'group_jodi',
          'half_sangam', 'half_sangam_a', 'half_sangam_b',
          'full_sangam', 'sp_dp_tp', 'red_bracket',
        ],
      };
    }

    const bids = await tx.bid.findMany({ where: bidWhere });

    let wonCount = 0;
    for (const bid of bids) {
      const win = checkWin(bid.gameType, bid.digits, bid.session, {
        openResult: openDigit,
        closeResult: closeDigit,
        jodiResult: bothDigitsReady ? `${openDigit}${closeDigit}` : null,
        openPanna: openPanna,
        closePanna: closePanna,
      });

      if (win) {
        const user = await tx.user.findUnique({ where: { id: bid.userId } });
        if (!user) continue;
        const before = Number(user.wallet);
        const payout = Number(bid.payout) || 0;

        // 🚀 Atomic credit — prevents race when many winners in one batch
        const updatedUser = await tx.user.update({
          where: { id: bid.userId },
          data: { wallet: { increment: payout } },
        });
        const after = Number(updatedUser.wallet);

        await tx.transaction.create({
          data: {
            userId: bid.userId,
            amount: payout,
            type: 1,
            remark: `Win payout — ${market.name} (${bid.gameType})`,
            balanceBefore: before,
            balanceAfter: after,
            gameId: bid.id,
          },
        });
        await tx.bid.update({ where: { id: bid.id }, data: { status: 'won' } });
        wonCount++;

        winnersToNotify.push({
          userId: bid.userId,
          payout,
          gameType: bid.gameType,
          digits: bid.digits,
        });
      } else {
        await tx.bid.update({ where: { id: bid.id }, data: { status: 'lost' } });
        lossesToNotify.set(bid.userId, (lossesToNotify.get(bid.userId) ?? 0) + 1);
      }
    }

    return {
      result,
      totalBids: bids.length,
      wonCount,
      marketName: market.name,
      openPanna, openDigit, closePanna, closeDigit,
    };
  });

  // ─── FCM broadcasts ────────────────────────────────
  try {
    const sessionLabel = params.session === 'open' ? 'OPEN' : 'CLOSE';
    const title = `${outcome.marketName} — ${sessionLabel}`;

    let body: string;
    if (params.session === 'open') {
      const op = outcome.openPanna ?? '***';
      const od = outcome.openDigit ?? '?';
      body = `${op}-${od}*-***`;
    } else {
      const op = outcome.openPanna ?? '***';
      const od = outcome.openDigit ?? '?';
      const cd = outcome.closeDigit ?? '?';
      const cp = outcome.closePanna ?? '***';
      body = `${op}-${od}${cd}-${cp}`;
    }

    await sendToTopic('all', title, body, {
      type: 'result',
      marketId: params.marketId,
      session: params.session,
    });
    console.log(`[fcm] result drop broadcast: ${title} | ${body}`);
  } catch (e: any) {
    console.error('[fcm] result broadcast failed:', e?.message);
  }

  for (const w of winnersToNotify) {
    try {
      const title = `🎉 You won ₹${w.payout}`;
      const body = `${outcome.marketName} • ${w.gameType.toUpperCase()} • ${w.digits}`;
      await sendToUser(w.userId, title, body, {
        type: 'win',
        marketId: params.marketId,
        amount: String(w.payout),
      });
      console.log(`[fcm] win notification sent to ${w.userId}`);
    } catch (e: any) {
      console.error(`[fcm] win notification failed for ${w.userId}:`, e?.message);
    }
  }

  for (const [userId, count] of lossesToNotify) {
    try {
      await sendToUser(userId, 'Bid result', `${outcome.marketName}: ${count} bid(s) did not win`, {
        type: 'loss', marketId: params.marketId, session: params.session,
      });
    } catch (e: any) {
      console.error(`[fcm] loss notification failed for ${userId}:`, e?.message);
    }
  }

  return {
    result: outcome.result,
    totalBids: outcome.totalBids,
    wonCount: outcome.wonCount,
  };
}
