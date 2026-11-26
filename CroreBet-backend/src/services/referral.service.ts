import prisma from '../config/db';

export interface ReferralConfig {
  enabled: boolean;
  type: 'signup' | 'first_deposit' | 'all_deposits' | 'multi';
  fixedAmount: number;
  percent: number;
  firstDepositMin: number;
  playRequired: boolean;
  playThresholdPct: number;
  maxCashback: number;
}

const DEFAULTS: ReferralConfig = {
  enabled: true,
  type: 'first_deposit',
  fixedAmount: 20,
  percent: 5,
  firstDepositMin: 100,
  playRequired: true,
  playThresholdPct: 100,
  maxCashback: 500,
};

export async function getConfig(): Promise<ReferralConfig> {
  const rows = await prisma.setting.findMany({
    where: {
      key: {
        in: [
          'referral_enabled',
          'referral_type',
          'referral_fixed_amount',
          'referral_percent',
          'referral_first_deposit_min',
          'referral_play_required',
          'referral_play_threshold_pct',
          'referral_max_cashback',
        ],
      },
    },
  });
  const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    enabled: m.referral_enabled !== '0',
    type: (m.referral_type as any) || DEFAULTS.type,
    fixedAmount: Number(m.referral_fixed_amount ?? DEFAULTS.fixedAmount),
    percent: Number(m.referral_percent ?? DEFAULTS.percent),
    firstDepositMin: Number(m.referral_first_deposit_min ?? DEFAULTS.firstDepositMin),
    playRequired: m.referral_play_required !== '0',
    playThresholdPct: Number(m.referral_play_threshold_pct ?? DEFAULTS.playThresholdPct),
    maxCashback: Number(m.referral_max_cashback ?? DEFAULTS.maxCashback),
  };
}

export async function createReferral(params: {
  referrerMobile: string;
  refereeMobile: string;
  refereeName: string;
  referralCode: string;
}) {
  const cfg = await getConfig();
  if (!cfg.enabled) return null;

  // Prevent duplicate rows (User B could only be referred once)
  const existing = await prisma.referral.findUnique({
    where: { refereeMobile: params.refereeMobile },
  });
  if (existing) return existing;

  if (cfg.type === 'signup') {
    return prisma.referral.create({
      data: {
        referrerMobile: params.referrerMobile,
        refereeMobile: params.refereeMobile,
        refereeName: params.refereeName,
        referralCode: params.referralCode,
        cashbackAmount: cfg.fixedAmount,
        status: 'eligible',
        notes: 'Signup bonus — ready to pay',
      },
    });
  }

  return prisma.referral.create({
    data: {
      referrerMobile: params.referrerMobile,
      refereeMobile: params.refereeMobile,
      refereeName: params.refereeName,
      referralCode: params.referralCode,
      status: 'pending',
      notes: 'Awaiting first deposit',
    },
  });
}

export async function recordDeposit(params: {
  userId: string;
  mobile: string;
  amount: number;
}) {
  const cfg = await getConfig();
  if (!cfg.enabled) return;
  if (cfg.type === 'signup') return;
  if (params.amount < cfg.firstDepositMin) {
    console.log(`[referral] Deposit ${params.amount} below min ${cfg.firstDepositMin} for ${params.mobile}`);
    return;
  }

  const ref = await prisma.referral.findFirst({
    where: { refereeMobile: params.mobile },
  });
  if (!ref) return; // not a referred user
  if (ref.status === 'paid' || ref.status === 'rejected') return;

  const newDeposit = Number(ref.depositAmount || 0) + params.amount;

  await prisma.referral.update({
    where: { id: ref.id },
    data: {
      depositAmount: newDeposit,
      notes: `Deposit ₹${newDeposit.toFixed(0)} recorded — checking play requirement`,
    },
  });

  console.log(`[referral] Deposit recorded: ${params.mobile} ₹${params.amount} (total ₹${newDeposit})`);

  await checkEligibility(params.mobile);
}

export async function checkEligibility(refereeMobile: string) {
  const cfg = await getConfig();
  if (!cfg.enabled) return;
  if (cfg.type === 'signup') return;

  const ref = await prisma.referral.findFirst({
    where: { refereeMobile },
  });
  if (!ref || ref.status === 'paid' || ref.status === 'rejected') return;

  const depositAmount = Number(ref.depositAmount || 0);
  if (depositAmount <= 0) return;

  // Sum all bids placed by the referee since the referral was created
  const playedAgg = await prisma.bid.aggregate({
    where: {
      user: { mobile: refereeMobile },
      bidDate: { gte: ref.createdAt },
    },
    _sum: { amount: true },
  });
  const playedAmount = Number(playedAgg._sum.amount || 0);

  // Play requirement check
  if (cfg.playRequired) {
    const required = (depositAmount * cfg.playThresholdPct) / 100;
    if (playedAmount < required) {
      await prisma.referral.update({
        where: { id: ref.id },
        data: {
          status: 'pending',
          notes: `Played ₹${playedAmount.toFixed(0)} / needed ₹${required.toFixed(0)}`,
        },
      });
      return;
    }
  }

  // Calculate cashback
  let cashback = 0;
  if (cfg.type === 'first_deposit' || cfg.type === 'all_deposits') {
    cashback = (depositAmount * cfg.percent) / 100;
  } else if (cfg.type === 'multi') {
    cashback = (depositAmount * cfg.percent) / 100 + cfg.fixedAmount;
  }
  cashback = Math.min(cashback, cfg.maxCashback);

  await prisma.referral.update({
    where: { id: ref.id },
    data: {
      cashbackAmount: cashback,
      status: 'eligible',
      notes: `Played ₹${playedAmount.toFixed(0)} — eligible for ₹${cashback.toFixed(2)}`,
    },
  });

  console.log(`[referral] ✅ Eligible: ${refereeMobile} → cashback ₹${cashback}`);
}

export async function payCashback(referralId: string, amount?: number) {
  const ref = await prisma.referral.findUnique({ where: { id: referralId } });
  if (!ref) throw new Error('Referral not found');
  if (ref.status === 'paid') throw new Error('Already paid');
  if (ref.status === 'rejected') throw new Error('Rejected');
  if (ref.status !== 'eligible') throw new Error('Not eligible yet (deposit + play required)');

  const amt = amount ?? Number(ref.cashbackAmount);
  if (!amt || amt <= 0) throw new Error('Invalid cashback amount');

  const referrer = await prisma.user.findUnique({ where: { mobile: ref.referrerMobile } });
  if (!referrer) throw new Error('Referrer not found');

  const { updateWallet } = await import('./wallet.service.js');
  await updateWallet({
    userId: referrer.id,
    amount: amt,
    type: 1,
    remark: `Referral cashback — referee ${ref.refereeMobile}`,
  });

  return prisma.referral.update({
    where: { id: ref.id },
    data: {
      status: 'paid',
      cashbackAmount: amt,
      paidAt: new Date(),
    },
  });
}

export async function getMyReferrals(mobile: string) {
  const refs = await prisma.referral.findMany({
    where: { referrerMobile: mobile },
    orderBy: { createdAt: 'desc' },
  });

  const earned = refs
    .filter((r) => r.status === 'paid')
    .reduce((s, r) => s + Number(r.cashbackAmount || 0), 0);

  const pending = refs
    .filter((r) => r.status === 'eligible' || r.status === 'pending')
    .reduce((s, r) => s + Number(r.cashbackAmount || 0), 0);

  return {
    totalCount: refs.length,
    paidCount: refs.filter((r) => r.status === 'paid').length,
    eligibleCount: refs.filter((r) => r.status === 'eligible').length,
    totalEarned: earned,
    pending,
    referrals: refs,
  };
}