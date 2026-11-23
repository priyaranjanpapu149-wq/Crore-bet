import { Router } from 'express';
import prisma from '../config/db';
import { ok, badRequest, serverError, notFound } from '../utils/response';
import { registerToken, sendToTopic } from '../services/fcm.service';
import { getGameOptions } from '../services/game.service';

const router = Router();

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// ═══════════════════════════════════════════════════════════
// 🚀 SPECIAL-DAY HELPERS
// ═══════════════════════════════════════════════════════════
const DAY_NAMES = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];

function parseClosedDays(raw: any): string[] {
  if (!raw) return [];
  const s = String(raw).trim();
  if (!s) return [];

  if (s.startsWith('[')) {
    try {
      const arr = JSON.parse(s);
      if (Array.isArray(arr)) {
        return arr
          .map((x) => String(x).toUpperCase().replace(/\(.*?\)/g, '').trim())
          .filter(Boolean);
      }
    } catch {}
  }

  return s
    .toUpperCase()
    .split(',')
    .map((x) => x.replace(/\(.*?\)/g, '').trim())
    .filter(Boolean);
}

function isClosedDayToday(market: any, istDayOfWeek: number): boolean {
  const list = parseClosedDays(market?.days);
  if (list.length === 0) return false;
  return list.includes(DAY_NAMES[istDayOfWeek]);
}

// ═══════════════════════════════════════════════════════════
// 🚀 RESULT-DAY DATE — 3 AM rollback
// ═══════════════════════════════════════════════════════════
function istDateString(d = new Date()): string {
  const istRaw = new Date(d.getTime() + IST_OFFSET_MS);
  if (istRaw.getUTCHours() < 3) {
    return new Date(istRaw.getTime() - 24 * 3600 * 1000)
      .toISOString().split('T')[0];
  }
  return istRaw.toISOString().split('T')[0];
}

function utcDayBounds(dateStr: string) {
  return {
    dayStart: new Date(dateStr + 'T00:00:00.000+05:30'),
    dayEnd: new Date(dateStr + 'T23:59:59.999+05:30'),
  };
}

function fmt12(t: string | null): string {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  const h12 = h % 12 || 12;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}

function shiftTime(hhmm: string | null, minutes: number): string | null {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  let total = h * 60 + m + minutes;
  total = ((total % 1440) + 1440) % 1440;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

function buildResultMap(results: any[]) {
  const map: Record<string, { open?: any; close?: any }> = {};
  for (const r of results) {
    const key = String(r.session).toLowerCase().trim() as 'open' | 'close';
    if (!map[r.marketId]) map[r.marketId] = {};
    if (!map[r.marketId][key]) map[r.marketId][key] = r;
  }
  return map;
}

// ============================================================
// 🚀 CHARTS HELPERS
// ============================================================
function getISTDateString(dateObj: Date): string {
  const istDate = new Date(dateObj.getTime() + IST_OFFSET_MS);
  return istDate.toISOString().split('T')[0];
}

// 🚀 FIXED: Filters out future dates so Web UI doesn't show data for days that haven't happened yet
function buildStrictWeeksFromDaily(dailyList: any[]): any[][] {
  const weeksMap = new Map<string, any[]>();
  
  // Get today's date in IST (YYYY-MM-DD)
  const todayIST = getISTDateString(new Date());

  const sortedDates = dailyList
    .filter(d => d.date && d.date !== 'Invalid Date' && d.date <= todayIST) // 🚀 Filter future
    .map(d => d.date)
    .sort();

  for (const dateKey of sortedDates) {
    const data = dailyList.find(d => d.date === dateKey);
    const d = new Date(`${dateKey}T00:00:00Z`);
    if (isNaN(d.getTime())) continue;
    
    const dayOfWeek = d.getUTCDay(); // 0 = Sun, 1 = Mon
    
    const monday = new Date(d);
    const diff = d.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    monday.setUTCDate(diff);
    const weekKey = monday.toISOString().split('T')[0];

    if (!weeksMap.has(weekKey)) {
      const sunday = new Date(monday);
      sunday.setUTCDate(monday.getUTCDate() + 6);

      // 🚀 OUTPUT ISO FORMAT: YYYY-MM-DD
      const startStr = monday.toISOString().split('T')[0];
      const endStr = sunday.toISOString().split('T')[0];
      const rangeStr = `${startStr} to ${endStr}`;

      const weekArray = Array(7).fill(null).map(() => ({
        date: startStr,
        startDate: startStr,
        endDate: endStr,
        dateRange: rangeStr,
        openPanna: '', openDigit: '', closePanna: '', closeDigit: '', jodi: ''
      }));
      
      weekArray[0].date = startStr; 
      weekArray[6].date = endStr; 

      weeksMap.set(weekKey, weekArray);
    }

    const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekArray = weeksMap.get(weekKey)!;
    
    weekArray[dayIndex] = { 
      ...weekArray[dayIndex], 
      ...data,
      date: dateKey,
      startDate: weekArray[dayIndex].startDate,
      endDate: weekArray[dayIndex].endDate,
      dateRange: weekArray[dayIndex].dateRange
    };
  }

  return Array.from(weeksMap.values());
}

async function findMarket(param: string) {
  return prisma.market.findFirst({
    where: {
      OR: [
        { slug: { equals: param, mode: 'insensitive' } },
        { name: { equals: param, mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, slug: true },
  });
}

function normalizeWhatsapp(raw: any): string {
  let n = String(raw ?? '').replace(/\D/g, '');
  if (n.length === 10) n = '91' + n;
  return n;
}

function normalizeTelegram(raw: any): string {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  if (s.startsWith('http')) return s;
  if (s.startsWith('@')) return 'https://t.me/' + s.substring(1);
  return 'https://t.me/' + s;
}

// ============================================================
// GET /api/public/game-options/:gameType
// ============================================================
router.get('/game-options/:gameType', async (req, res) => {
  try {
    const { gameType } = req.params;
    const options = getGameOptions(gameType);
    return ok(res, { options });
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

// ============================================================
// GET /api/public/home
// ============================================================
router.get('/home', async (req, res) => {
  try {
    const displayDateStr = istDateString();
    const { dayStart, dayEnd } = utcDayBounds(displayDateStr);

    const [markets, notices, sliders, settings, results] = await Promise.all([
      prisma.market.findMany({
        where: { active: true, type: 'regular' },
        orderBy: [{ openTime: 'asc' }, { name: 'asc' }],
      }),
      prisma.notice.findMany({ where: { active: true }, orderBy: { createdAt: 'desc' }, take: 5 }),
      prisma.imageSlider.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' }, take: 8 }),
      prisma.setting.findMany({
        where: {
          OR: [
            { key: { startsWith: 'rate_' } },
            { key: { startsWith: 'site_' } },
            { key: { startsWith: 'stat_' } },
            { key: 'app_download_url' },
            { key: 'whatsapp' },
            { key: 'whatsapp2' },
            { key: 'telegram_details' },
            { key: 'whatsappNumber' },
            { key: 'telegramLink' },
            { key: 'telegramLabel' },
          ],
        },
      }),
      prisma.result.findMany({
        where: { resultDate: { gte: dayStart, lte: dayEnd } },
        orderBy: { declaredAt: 'desc' },
      }),
    ]);

    const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    const displayResultMap = buildResultMap(results);

    const istNowForStatus = new Date(Date.now() + IST_OFFSET_MS);
    const nowMin = istNowForStatus.getUTCHours() * 60 + istNowForStatus.getUTCMinutes();
    const istDayOfWeek = istNowForStatus.getUTCDay();
    const isBefore3AM = istNowForStatus.getUTCHours() < 3;

    const BID_GAP_START = 0;
    const BID_GAP_END = 5;
    const isBidGap = nowMin >= BID_GAP_START && nowMin < BID_GAP_END;

    const enriched = markets.map((m) => {
      const r = displayResultMap[m.id] || {};
      const open = r.open;
      const close = r.close;

      const hasOpenResult  = isBefore3AM ? false : !!open;
      const hasCloseResult = isBefore3AM ? false : !!close;

      const openBidLastTime = shiftTime(m.openTime, -5);
      const closeBidLastTime = shiftTime(m.closeTime, -5);

      const [ch, cm] = (m.closeTime || '23:59').split(':').map(Number);
      const closeMin = ch * 60 + cm;
      const isCloseTimePassed = nowMin >= closeMin;

      const [oh, om] = (m.openTime || '00:00').split(':').map(Number);
      const openMin = oh * 60 + om;
      const isOpenTimePassed = nowMin >= openMin;

      const isShutdown = (m as any).shutdown === true;
      const isSpecialClosedDay = isClosedDayToday(m, istDayOfWeek);

      let status: 'open' | 'open_result' | 'closed';
      let openSessionOpen = false;
      let closeSessionOpen = false;

      if (isBidGap) {
        status = 'closed';
      } else if (isShutdown) {
        status = 'closed';
      } else if (isSpecialClosedDay) {
        status = 'closed';
      } else if (hasCloseResult) {
        status = 'closed';
      } else if (isCloseTimePassed) {
        status = 'closed';
      } else if (hasOpenResult || isOpenTimePassed) {
        status = 'open_result';
        openSessionOpen = false;
        closeSessionOpen = true;
      } else {
        status = 'open';
        openSessionOpen = true;
        closeSessionOpen = true;
      }

      return {
        id: m.id,
        name: m.name,
        slug: m.slug,
        openTime: m.openTime,
        closeTime: m.closeTime,
        openTime12: fmt12(m.openTime),
        closeTime12: fmt12(m.closeTime),
        openBidLastTime,
        closeBidLastTime,
        openBidLastTime12: fmt12(openBidLastTime),
        closeBidLastTime12: fmt12(closeBidLastTime),
        days: m.days ?? null,
        status,
        openSessionOpen,
        closeSessionOpen,
        shutdown: isShutdown,
        specialClosedDay: isSpecialClosedDay,
        openResult: open ? { panna: open.pannaResult || '***', digit: open.openResult || '*' } : null,
        closeResult: close ? { panna: close.pannaResult || '***', digit: close.closeResult || '*' } : null,
      };
    });

    const rates: Record<string, string> = {};
    for (const [k, v] of Object.entries(settingsMap)) {
      if (k.startsWith('rate_')) {
        rates[k] = String(v);
      }
    }

    const whatsappRaw = settingsMap.whatsappNumber || settingsMap.whatsapp || settingsMap.whatsapp2 || '';
    const telegramRaw = settingsMap.telegramLink || settingsMap.telegram_details || '';

    return ok(res, {
      date: displayDateStr,
      markets: enriched,
      notices,
      sliders,
      rates: rates,
      settings: {
        siteName: settingsMap.site_name || 'Shivaay',
        tagline: settingsMap.site_tagline || 'Play Big. Win Big.',
        appDownloadUrl: settingsMap.app_download_url || '/apk/shivaay.apk',
        whatsappNumber: normalizeWhatsapp(whatsappRaw),
        telegramLink:   normalizeTelegram(telegramRaw),
        telegramLabel:  settingsMap.telegramLabel || 'Telegram Channel',
        stats: {
          players: Number(settingsMap.stat_players || 5000),
          games: Number(settingsMap.stat_games || 25),
          dailyWinnings: settingsMap.stat_daily_winnings || '1 Cr',
        },
      },
    });
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

// ============================================================
// GET /api/public/markets
// ============================================================
router.get('/markets', async (req, res) => {
  try {
    const markets = await prisma.market.findMany({
      where: { active: true },
      orderBy: [{ openTime: 'asc' }, { name: 'asc' }],
    });
    return ok(res, markets);
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

// ============================================================
// GET /api/public/market/:slug
// ============================================================
router.get('/market/:slug', async (req, res) => {
  try {
    const market = await prisma.market.findUnique({
      where: { slug: req.params.slug },
      include: { rates: true },
    });
    if (!market) return notFound(res, 'Market not found');
    return ok(res, market);
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

// ============================================================
// GET /api/public/market/:slug/live
// ============================================================
router.get('/market/:slug/live', async (req, res) => {
  try {
    const market = await prisma.market.findUnique({ where: { slug: req.params.slug } });
    if (!market) return notFound(res, 'Market not found');

    const dateStr = istDateString();
    const { dayStart, dayEnd } = utcDayBounds(dateStr);

    const [openRow, closeRow] = await Promise.all([
      prisma.result.findFirst({
        where: { marketId: market.id, session: 'open', resultDate: { gte: dayStart, lte: dayEnd } },
        orderBy: { declaredAt: 'desc' },
      }),
      prisma.result.findFirst({
        where: { marketId: market.id, session: 'close', resultDate: { gte: dayStart, lte: dayEnd } },
        orderBy: { declaredAt: 'desc' },
      }),
    ]);

    const istNow = new Date(Date.now() + IST_OFFSET_MS);
    const nowMin = istNow.getUTCHours() * 60 + istNow.getUTCMinutes();
    const istDayOfWeek = istNow.getUTCDay();
    const isBefore3AM = istNow.getUTCHours() < 3;

    const [ch, cm] = (market.closeTime || '23:59').split(':').map(Number);
    const closeMin = ch * 60 + cm;

    const [oh, om] = (market.openTime || '00:00').split(':').map(Number);
    const openMin = oh * 60 + om;
    const isOpenTimePassed = nowMin >= openMin;

    const isBidGap = nowMin >= 0 && nowMin < 5;
    const isCloseTimePassed = nowMin >= closeMin;
    const isShutdown = (market as any).shutdown === true;
    const isSpecialClosedDay = isClosedDayToday(market, istDayOfWeek);
    const hasCloseResult = !isBefore3AM && !!closeRow;

    const openSessionOpen = !isBidGap && !isShutdown && !isSpecialClosedDay && !hasCloseResult && !isCloseTimePassed && !isOpenTimePassed;
    const closeSessionOpen = !isBidGap && !isShutdown && !isSpecialClosedDay && !hasCloseResult && !isCloseTimePassed;
    const isRunning = openSessionOpen || closeSessionOpen;

    return ok(res, {
      market: {
        id: market.id,
        name: market.name,
        slug: market.slug,
        openTime: market.openTime,
        closeTime: market.closeTime,
        openTime12: fmt12(market.openTime),
        closeTime12: fmt12(market.closeTime),
        openBidLastTime12: fmt12(shiftTime(market.openTime, -5)),
        closeBidLastTime12: fmt12(shiftTime(market.closeTime, -5)),
        days: market.days ?? null,
      },
      openResult: openRow ? { panna: openRow.pannaResult || '***', digit: openRow.openResult || '*' } : null,
      closeResult: closeRow ? { panna: closeRow.pannaResult || '***', digit: closeRow.closeResult || '*' } : null,
      openSessionOpen,
      closeSessionOpen,
      isRunning,
    });
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

// ============================================================
// GET /api/public/charts
// ============================================================
router.get('/charts', async (req, res) => {
  try {
    const markets = await prisma.market.findMany({
      where: { active: true },
      select: { id: true, name: true, slug: true },
      orderBy: [{ openTime: 'asc' }, { name: 'asc' }],
    });
    return ok(res, markets);
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

// ============================================================
// GET /api/public/charts/:market/jodi
// ============================================================
router.get('/charts/:market/jodi', async (req, res) => {
  try {
    const market = await findMarket(req.params.market);
    if (!market) return notFound(res, 'Market not found');

    const chartRows = await prisma.chartOpenClose.findMany({
      where: { marketName: market.name },
    });

    const liveResults = await prisma.result.findMany({
      where: { marketId: market.id },
    });

    const unifiedData = new Map<string, any>();

    for (const row of chartRows) {
      if (!row.resultDate) continue;
      const dateObj = new Date(row.resultDate);
      if (isNaN(dateObj.getTime())) continue;
      
      const dateKey = getISTDateString(dateObj);
      unifiedData.set(dateKey, {
        date: dateKey,
        openPanna: row.openPanna || '',
        openDigit: row.openDigit || '',
        closePanna: row.closePanna || '',
        closeDigit: row.closeDigit || '',
        jodi: (row.jodi || '').replace(/-/g, ''), // 🚀 STRIP DASH FROM HISTORY
      });
    }

    for (const r of liveResults) {
      const dateKey = getISTDateString(r.resultDate);
      if (!unifiedData.has(dateKey)) {
        unifiedData.set(dateKey, {
          date: dateKey, openPanna: '', openDigit: '', closePanna: '', closeDigit: '', jodi: ''
        });
      }
      const day = unifiedData.get(dateKey);
      if (r.session === 'open') {
        day.openPanna = r.pannaResult || '';
        day.openDigit = r.openResult || '';
      } else if (r.session === 'close') {
        day.closePanna = r.pannaResult || '';
        day.closeDigit = r.closeResult || '';
      }
      if (day.openDigit && day.closeDigit) {
        day.jodi = `${day.openDigit}${day.closeDigit}`;
      }
    }

    const weeks = buildStrictWeeksFromDaily(Array.from(unifiedData.values()));
    return ok(res, { market: market.name, weeks });
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

// ============================================================
// GET /api/public/charts/:market/pana
// ============================================================
router.get('/charts/:market/pana', async (req, res) => {
  try {
    const market = await findMarket(req.params.market);
    if (!market) return notFound(res, 'Market not found');

    const chartRows = await prisma.chartOpenClose.findMany({
      where: { marketName: market.name },
    });

    const liveResults = await prisma.result.findMany({
      where: { marketId: market.id },
    });

    const unifiedData = new Map<string, any>();

    for (const row of chartRows) {
      if (!row.resultDate) continue;
      const dateObj = new Date(row.resultDate);
      if (isNaN(dateObj.getTime())) continue;

      const dateKey = getISTDateString(dateObj);
      unifiedData.set(dateKey, {
        date: dateKey,
        openPanna: row.openPanna || '',
        openDigit: row.openDigit || '',
        closePanna: row.closePanna || '',
        closeDigit: row.closeDigit || '',
        jodi: (row.jodi || '').replace(/-/g, ''), // 🚀 STRIP DASH FROM HISTORY
      });
    }

    for (const r of liveResults) {
      const dateKey = getISTDateString(r.resultDate);
      if (!unifiedData.has(dateKey)) {
        unifiedData.set(dateKey, {
          date: dateKey, openPanna: '', openDigit: '', closePanna: '', closeDigit: '', jodi: ''
        });
      }
      const day = unifiedData.get(dateKey);
      if (r.session === 'open') {
        day.openPanna = r.pannaResult || '';
        day.openDigit = r.openResult || '';
      } else if (r.session === 'close') {
        day.closePanna = r.pannaResult || '';
        day.closeDigit = r.closeResult || '';
      }
      if (day.openDigit && day.closeDigit) {
        day.jodi = `${day.openDigit}${day.closeDigit}`;
      }
    }

    const weeks = buildStrictWeeksFromDaily(Array.from(unifiedData.values()));
    return ok(res, { market: market.name, weeks });
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

// ============================================================
// GET /api/public/privacy
// ============================================================
router.get('/privacy', async (req, res) => {
  try {
    const content = await prisma.content.findUnique({ where: { slug: 'privacy' } });
    if (!content) {
      return ok(res, {
        title: 'Privacy Policy',
        body: 'Privacy policy content will be added soon.',
        updatedAt: new Date(),
      });
    }
    return ok(res, content);
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

// ============================================================
// GET /api/public/notice
// ============================================================
router.get('/notice', async (req, res) => {
  try {
    const row = await prisma.content.findUnique({ where: { slug: 'notice' } });
    return ok(res, {
      content: row?.body || '',
      updatedAt: row?.updatedAt || null,
    });
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

// ============================================================
// POST /api/public/notify/register
// ============================================================
router.post('/notify/register', async (req, res) => {
  try {
    const { token, userId, platform, topics } = req.body;
    if (!token) return badRequest(res, 'token required');
    const record = await registerToken({
      token,
      userId,
      platform: platform || 'android',
      topics: Array.isArray(topics) ? topics : [],
    });
    return ok(res, { id: record.id }, 'Registered');
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

// ============================================================
// POST /api/public/notify/test
// ============================================================
router.post('/notify/test', async (req, res) => {
  try {
    const { topic, title, body } = req.body;
    if (!topic || !title) return badRequest(res, 'topic and title required');
    const id = await sendToTopic(topic, title, body || '');
    return ok(res, { id: id }, 'Sent');
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

export default router;