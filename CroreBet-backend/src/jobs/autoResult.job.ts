// backend/src/jobs/autoResult.job.ts
import prisma from '../config/db';
import { declareResult } from '../services/game.service';
import * as cheerio from 'cheerio';

interface ParsedCard {
  name: string;
  openPanna: string | null;
  openDigit: string | null;
  closeDigit: string | null;
  closePanna: string | null;
}

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

function isClosedDay(market: any, istDayOfWeek: number): boolean {
  const list = parseClosedDays(market?.days);
  if (list.length === 0) return false;
  return list.includes(DAY_NAMES[istDayOfWeek]);
}

function parseCardText(rawText: string): Omit<ParsedCard, 'name'> | null {
  let clean = rawText.replace(/loading\.*/gi, '').replace(/\s+/g, ' ').trim();
  clean = clean.replace(/[-–*\s]+$/, '');
  if (!clean) return null;

  let m = clean.match(/(\d{3})-(\d)(\d)-(\d{3})/);
  if (m) return { openPanna: m[1], openDigit: m[2], closeDigit: m[3], closePanna: m[4] };

  m = clean.match(/(\d{3})-(\d)/);
  if (m) return { openPanna: m[1], openDigit: m[2], closeDigit: null, closePanna: null };

  return null;
}

export async function runAutoResult() {
  const g = await prisma.setting.findUnique({ where: { key: 'auto_result' } });
  if (g?.value !== '1') return;

  const configs = await prisma.autoResultConfig.findMany({
    where: { active: true },
    orderBy: [{ priority: 'asc' }, { site: 'asc' }],
  });
  if (configs.length === 0) return;

  const now = new Date();
  const istRaw = new Date(now.getTime() + 5.5 * 3600 * 1000);
  const nowMin = istRaw.getUTCHours() * 60 + istRaw.getUTCMinutes();
  const istDayOfWeek = istRaw.getUTCDay(); // current IST calendar day

  const isNightShift = istRaw.getUTCHours() < 3;
  const ist = isNightShift ? new Date(istRaw.getTime() - 24 * 3600 * 1000) : istRaw;
  const dateStr = ist.toISOString().split('T')[0];
  const dayStart = new Date(dateStr + 'T00:00:00.000+05:30');
  const dayEnd   = new Date(dateStr + 'T23:59:59.999+05:30');

  console.log(
    `🔍 [autoResult] ${dateStr} IST ${String(istRaw.getUTCHours()).padStart(2, '0')}:${String(istRaw.getUTCMinutes()).padStart(2, '0')}${isNightShift ? ' (night shift)' : ''} day=${DAY_NAMES[istDayOfWeek]}`
  );

  for (const cfg of configs) {
    try {
      if (!cfg.siteUrl) continue;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(cfg.siteUrl, {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
        },
      });
      clearTimeout(timer);
      if (!res.ok) {
        console.log(`⚠️  ${cfg.site}: HTTP ${res.status}`);
        continue;
      }

      const html = await res.text();
      const $ = cheerio.load(html);
      const cards = $('.tkt-card');
      console.log(`📋 [autoResult] ${cfg.site}: ${cards.length} card(s) in HTML`);

      const parsed: ParsedCard[] = [];
      cards.each((_, el) => {
        const $card = $(el);
        const name = $card.find('h4').first().text().trim();
        const rawText = $card.find('span').first().text().trim();
        if (!name || !rawText) return;
        const p = parseCardText(rawText);
        if (!p) return;
        parsed.push({ name, ...p });
      });

      console.log(`📋 [autoResult] ${cfg.site}: ${parsed.length} card(s) parsed`);

      // ══════════════════════════════════════════════════════
      // LOCK MARKETS — close betting when a result appears
      // ══════════════════════════════════════════════════════
      let lockedCount = 0;
      for (const row of parsed) {
        const hasAnyResult =
          (row.openPanna && row.openDigit) ||
          (row.closePanna && row.closeDigit);
        if (!hasAnyResult) continue;

        const m = await findMarket(row.name);
        if (!m) continue;
        if (m.resultLockedDate === dateStr) continue;

        await prisma.market.update({
          where: { id: m.id },
          data: { resultLockedAt: new Date(), resultLockedDate: dateStr },
        });
        console.log(`🔒 [autoResult] LOCKED ${m.name} — result scraped at IST ${String(istRaw.getUTCHours()).padStart(2, '0')}:${String(istRaw.getUTCMinutes()).padStart(2, '0')}`);
        lockedCount++;
      }
      if (lockedCount > 0) {
        console.log(`🔒 [autoResult] Locked ${lockedCount} market(s) this run`);
      }

      // ══════════════════════════════════════════════════════
      // DECLARE — with result-lock + value-change + special-day rules
      //
      //  • Same value as existing → skip entirely (no FCM)
      //  • At/after openTime + existing → skip (locked)
      //  • Special closed day for this market → skip
      //  • Otherwise → declare and broadcast
      // ══════════════════════════════════════════════════════
      let declaredOpen = 0;
      let declaredClose = 0;
      let skippedMarket = 0;
      let alreadyDone = 0;
      let lockedSkips = 0;
      let unchangedSkips = 0;
      let closedDaySkips = 0;

      for (const row of parsed) {
        const market = await findMarket(row.name);
        if (!market) {
          skippedMarket++;
          continue;
        }

        // 🚀 Skip admin-configured closed days
        if (isClosedDay(market, istDayOfWeek)) {
          closedDaySkips++;
          continue;
        }

        const [oh, om] = String(market.openTime || '00:00').split(':').map(Number);
        const openMin = oh * 60 + om;
        const isLockedNow = nowMin >= openMin;

        // ── OPEN ──
        if (row.openPanna && row.openDigit) {
          const exists = await prisma.result.findFirst({
            where: {
              marketId: market.id,
              session: 'open',
              resultDate: { gte: dayStart, lte: dayEnd },
            },
          });

          const sameValue =
            !!exists &&
            String(exists.pannaResult || '') === String(row.openPanna) &&
            String(exists.openResult  || '') === String(row.openDigit);

          if (exists && isLockedNow) {
            lockedSkips++;
          } else if (sameValue) {
            unchangedSkips++;
          } else {
            try {
              await declareResult({
                marketId: market.id,
                session: 'open',
                openResult: row.openDigit,
                pannaResult: row.openPanna,
                resultDate: dateStr,
              });
              if (exists) {
                console.log(`✏️  [autoResult] ${market.name} OPEN changed = ${row.openPanna}-${row.openDigit}`);
              } else {
                console.log(`✅ [autoResult] ${market.name} OPEN = ${row.openPanna}-${row.openDigit}`);
              }
              declaredOpen++;
            } catch (e: any) {
              console.error(`❌ declare ${market.name} open:`, e.message);
            }
          }
        }

        // ── CLOSE ──
        if (row.closePanna && row.closeDigit) {
          const exists = await prisma.result.findFirst({
            where: {
              marketId: market.id,
              session: 'close',
              resultDate: { gte: dayStart, lte: dayEnd },
            },
          });

          const sameValue =
            !!exists &&
            String(exists.pannaResult || '') === String(row.closePanna) &&
            String(exists.closeResult || '') === String(row.closeDigit);

          if (exists && isLockedNow) {
            lockedSkips++;
          } else if (sameValue) {
            unchangedSkips++;
          } else {
            try {
              await declareResult({
                marketId: market.id,
                session: 'close',
                closeResult: row.closeDigit,
                pannaResult: row.closePanna,
                resultDate: dateStr,
              });
              if (exists) {
                console.log(`✏️  [autoResult] ${market.name} CLOSE changed = ${row.closeDigit}-${row.closePanna}`);
              } else {
                console.log(`✅ [autoResult] ${market.name} CLOSE = ${row.closeDigit}-${row.closePanna}`);
              }
              declaredClose++;
            } catch (e: any) {
              console.error(`❌ declare ${market.name} close:`, e.message);
            }
          }
        }
      }

      console.log(
        `📊 [autoResult] ${cfg.site}: open=${declaredOpen} close=${declaredClose} skipped=${skippedMarket} alreadyDone=${alreadyDone} locked=${lockedSkips} unchanged=${unchangedSkips} closedDay=${closedDaySkips}`
      );

      await prisma.autoResultConfig.update({
        where: { id: cfg.id },
        data: { status: 'working', lastCheck: new Date() },
      });
    } catch (e: any) {
      console.error(`❌ [autoResult] ${cfg.site}:`, e.message);
    }
  }
}

async function findMarket(raw: string) {
  const c = raw.trim();
  return (
    (await prisma.market.findFirst({ where: { name: c, active: true } })) ||
    (await prisma.market.findFirst({ where: { name: c.toUpperCase(), active: true } })) ||
    (await prisma.market.findFirst({
      where: { active: true, name: { equals: c, mode: 'insensitive' } },
    }))
  );
}