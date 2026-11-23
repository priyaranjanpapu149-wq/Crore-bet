// backend/src/utils/dateIST.ts

/** IST is UTC + 5:30 = 5.5 hours in milliseconds. */
export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Returns "YYYY-MM-DD" for the current IST trading day.
 *
 * ✅ Night-shift rule:
 *   Before 3 AM IST  → yesterday's trading day (results declared in this
 *                      window belong to the previous day's market)
 *   At/after 3 AM IST → today's trading day
 *
 * This is the single source of truth for "what day is it in the market".
 * Used by:
 *   - declareResult() — decides which day's results to write
 *   - autoResult.job — decides which day to fetch results for
 *   - any other place that needs "the current IST trading day"
 *
 * MUST match the logic in public.routes.ts::istDateString() so the /home
 * endpoint and the declare handler always agree on the trading day.
 */
export function todayIST(d = new Date()): string {
  const ist = new Date(d.getTime() + IST_OFFSET_MS);

  // 00:00 – 02:59 IST → still yesterday's trading day
  if (ist.getUTCHours() < 3) {
    return new Date(ist.getTime() - 24 * 3600 * 1000)
      .toISOString()
      .split('T')[0];
  }

  return ist.toISOString().split('T')[0];
}

/**
 * Given a "YYYY-MM-DD" string that represents an IST calendar day,
 * return the UTC boundaries that capture that whole IST day.
 *
 * Example:
 *   Input : "2026-09-22" (a day in IST)
 *   Output: {
 *     dayStart: 2026-09-21T18:30:00.000Z,   // IST 00:00 = UTC prev day 18:30
 *     dayEnd  : 2026-09-22T18:29:59.999Z,   // IST 23:59:59.999 = UTC 18:29:59.999
 *   }
 */
export function istDayBoundsUTC(dateStr: string): {
  dayStart: Date;
  dayEnd: Date;
} {
  const refUTC = new Date(dateStr + 'T00:00:00.000Z');
  const dayStart = new Date(refUTC.getTime() - IST_OFFSET_MS);
  const dayEnd = new Date(refUTC.getTime() + 86400000 - IST_OFFSET_MS - 1);
  return { dayStart, dayEnd };
}

/**
 * Same as istDayBoundsUTC but for a full range of two IST dates (inclusive).
 */
export function istRangeBoundsUTC(
  fromStr: string,
  toStr: string
): { from: Date; to: Date } {
  const from = new Date(
    new Date(fromStr + 'T00:00:00.000Z').getTime() - IST_OFFSET_MS
  );
  const to = new Date(
    new Date(toStr + 'T00:00:00.000Z').getTime() + 86400000 - IST_OFFSET_MS - 1
  );
  return { from, to };
}