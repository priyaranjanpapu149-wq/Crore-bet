import prisma from '../config/db';
import { istDayBoundsUTC, todayIST } from '../utils/dateIST';

export async function runStarline() {
  const markets = await prisma.starlineMarket.findMany({ where: { active: true } });

  const todayStr = todayIST();
  const { dayStart, dayEnd } = istDayBoundsUTC(todayStr);

  for (const m of markets) {
    if (!m.closeTime) continue;

    const [h, mm] = m.closeTime.split(':').map(Number);
    const closeAtUTC = new Date(
      `${todayStr}T${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00.000+05:30`
    );

    if (new Date() < closeAtUTC) continue;

    const existing = await prisma.starlineResult.findFirst({
      where: {
        marketName: m.name,
        resultDate: { gte: dayStart, lte: dayEnd },
      },
    });
    if (existing) continue;

    console.log(`[starline] ${m.name} awaiting manual result`);
  }
}