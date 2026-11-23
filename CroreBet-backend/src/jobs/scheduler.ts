import cron from 'node-cron';
import { runAutoResult } from './autoResult.job';
import { runStarline } from './starline.job';

export function startScheduler() {
  console.log('🕐 [scheduler] Starting cron jobs...');

  // Auto result — every minute
  cron.schedule(
    '* * * * *',
    async () => {
      try {
        console.log('🕐 [scheduler] Running autoResult at', new Date().toISOString());
        await runAutoResult();
      } catch (e: any) {
        console.error('❌ [autoResult] error:', e.message);
      }
    },
    { timezone: 'Asia/Kolkata' }
  );

  // Starline — every minute
  cron.schedule(
    '* * * * *',
    async () => {
      try {
        await runStarline();
      } catch (e: any) {
        console.error('❌ [starline] error:', e.message);
      }
    },
    { timezone: 'Asia/Kolkata' }
  );

  // Heartbeat — every 5 min (so you can see scheduler is alive)
  cron.schedule(
    '*/5 * * * *',
    () => {
      console.log('💓 [scheduler] heartbeat', new Date().toISOString());
    },
    { timezone: 'Asia/Kolkata' }
  );

  console.log('✅ [scheduler] All 3 cron jobs registered (timezone: Asia/Kolkata)');
}