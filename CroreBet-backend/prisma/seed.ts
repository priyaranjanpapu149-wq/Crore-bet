import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // ═══════════════════════════════════════════════════════
  // ADMIN
  // ═══════════════════════════════════════════════════════
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
  }

  const existingAdmin = await prisma.admin.findUnique({ where: { email } });
  if (existingAdmin) {
    console.log('Admin already exists:', email);
  } else {
    const admin = await prisma.admin.create({
      data: {
        email,
        name: 'Super Admin',
        passwordHash: await bcrypt.hash(password, 12),
        role: 'superadmin',
      },
    });
    console.log('✅ Admin created:', admin.email);
  }

  // ═══════════════════════════════════════════════════════
  // MARKETS — 15 total
  // ═══════════════════════════════════════════════════════
  const markets = [
    { name: 'KALYAN',           slug: 'kalyan',           openTime: '15:45', closeTime: '17:45', days: 'Mon-Sun' },
    { name: 'KALYAN NIGHT',     slug: 'kalyan-night',     openTime: '21:30', closeTime: '23:30', days: 'Mon-Sun' },
    { name: 'MILAN DAY',        slug: 'milan-day',        openTime: '15:00', closeTime: '17:00', days: 'Mon-Sun' },
    { name: 'MILAN NIGHT',      slug: 'milan-night',      openTime: '21:00', closeTime: '23:00', days: 'Mon-Sun' },
    { name: 'RAJDHANI DAY',     slug: 'rajdhani-day',     openTime: '13:00', closeTime: '15:00', days: 'Mon-Sun' },
    { name: 'RAJDHANI NIGHT',   slug: 'rajdhani-night',   openTime: '21:30', closeTime: '23:30', days: 'Mon-Sun' },
    { name: 'MAIN BAZAR',       slug: 'main-bazar',       openTime: '09:30', closeTime: '11:30', days: 'Mon-Sun' },
    { name: 'MADHUR DAY',       slug: 'madhur-day',       openTime: '13:30', closeTime: '15:30', days: 'Mon-Sun' },
    { name: 'MADHUR NIGHT',     slug: 'madhur-night',     openTime: '21:30', closeTime: '23:30', days: 'Mon-Sun' },
    { name: 'SRIDEVI',          slug: 'sridevi',          openTime: '11:30', closeTime: '13:30', days: 'Mon-Sun' },
    { name: 'SRIDEVI NIGHT',    slug: 'sridevi-night',    openTime: '19:30', closeTime: '21:30', days: 'Mon-Sun' },
    { name: 'TIME BAZAR',       slug: 'time-bazar',       openTime: '13:00', closeTime: '15:00', days: 'Mon-Sun' },
    { name: 'NIGHT TIME BAZAR', slug: 'night-time-bazar', openTime: '20:30', closeTime: '22:30', days: 'Mon-Sun' },
    { name: 'SUPREME DAY',      slug: 'supreme-day',      openTime: '14:00', closeTime: '16:00', days: 'Mon-Sun' },
    { name: 'SUPREME NIGHT',    slug: 'supreme-night',    openTime: '21:00', closeTime: '23:00', days: 'Mon-Sun' },
  ];

  for (const m of markets) {
    await prisma.market.upsert({
      where: { name: m.name },
      update: {},
      create: { ...m, active: true, autoResult: false },
    });
  }
  console.log(`✅ ${markets.length} markets seeded`);

  // ═══════════════════════════════════════════════════════
  // SETTINGS
  // ═══════════════════════════════════════════════════════
  const settings = [
    { key: 'site_name',        value: 'Crorebet' },
    { key: 'tagline',          value: 'Play Big. Win Big.' },
    { key: 'app_download_url', value: '/apk/Crorebet.apk' },
    { key: 'whatsapp_number',  value: '' },
    { key: 'telegram_link',    value: '' },
    { key: 'telegram_label',   value: 'Telegram Channel' },
    { key: 'min_deposit',      value: '100' },
    { key: 'min_withdrawal',   value: '500' },
    { key: 'referral_bonus',   value: '' },
  ];

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log(`✅ ${settings.length} settings seeded`);

  // ═══════════════════════════════════════════════════════
  // GAME RATES — 15 types
  // ═══════════════════════════════════════════════════════
  const rates = [
    { key: 'rate_single',      value: '10' },
    { key: 'rate_jodi',        value: '100' },
    { key: 'rate_singlepatti', value: '150' },
    { key: 'rate_doublepatti', value: '300' },
    { key: 'rate_triplepatti', value: '700' },
    { key: 'rate_familypanna', value: '1400' },
    { key: 'rate_cyclepatti',  value: '1500' },
    { key: 'rate_groupjodi',   value: '100' },
    { key: 'rate_sp_dp_tp',    value: '3000' },
    { key: 'rate_sp_motor',    value: '150' },
    { key: 'rate_dp_motor',    value: '300' },
    { key: 'rate_odd_even',    value: '2' },
    { key: 'rate_red_bracket', value: '100' },
    { key: 'rate_halfsangam',  value: '1200' },
    { key: 'rate_fullsangam',  value: '10000' },
  ];

  for (const r of rates) {
    await prisma.setting.upsert({
      where: { key: r.key },
      update: {},
      create: r,
    });
  }
  console.log(`✅ ${rates.length} game rates seeded`);

  // ═══════════════════════════════════════════════════════
  // NOTICES
  // ═══════════════════════════════════════════════════════
  const noticeCount = await prisma.notice.count();
  if (noticeCount === 0) {
    await prisma.notice.create({
      data: {
        title: 'Welcome to Crorebet',
        content: 'Play smart. Win big. Start bidding today!',
        active: true,
      },
    });
    console.log('✅ 1 notice created');
  } else {
    console.log(`ℹ️  ${noticeCount} notices already exist — skipped`);
  }

  console.log('\n🎉 Seed complete');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
