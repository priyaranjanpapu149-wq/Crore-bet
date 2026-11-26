// src/services/wallet.service.ts
import prisma from '../config/db';
import { sendToUser } from './fcm.service'; // 🚀 IMPORT FCM SERVICE

interface WalletChange {
  userId: string;
  amount: number;
  type: 0 | 1;
  remark: string;
  gameId?: string;
  reference?: string;
}

const REFERRAL_TRIGGER = /deposit|admin credit|points added/i;
const REFERRAL_EXCLUDE = /bonus|cashback|refund|win payout|withdrawal/i;
const BONUS_EXCLUDE_REMARKS =
  /refund|reversal|reverse|correction|cashback|win payout|withdrawal|bonus/i;

export async function updateWallet(change: WalletChange) {
  if (!Number.isFinite(change.amount) || change.amount <= 0) throw new Error('Invalid amount');
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: change.userId },
      select: { id: true, wallet: true, mobile: true },
    });
    if (!user) throw new Error('User not found');

    const delta = change.type === 1 ? change.amount : -change.amount;
    const updated = await tx.user.update({
      where: { id: change.userId },
      data: { wallet: { increment: delta } },
    });
    const after = Number(updated.wallet);
    if (after < 0) throw new Error('Insufficient balance');
    const before = after - delta;

    const txn = await tx.transaction.create({
      data: {
        userId: change.userId,
        amount: change.amount,
        type: change.type,
        remark: change.remark,
        balanceBefore: before,
        balanceAfter: after,
        gameId: change.gameId,
        reference: change.reference,
      },
    });

    return { before, after, txn, userMobile: user.mobile };
  });

  // Send after the wallet transaction commits; a push failure must not retry the credit.
  const isCredit = change.type === 1;
  const isWin = change.remark.toLowerCase().includes('win payout');
  let title = isCredit ? 'Wallet Credited 💰' : 'Wallet Debited 💸';
  if (isWin) title = 'Congratulations! You Won 🎉';

  const body = isCredit
    ? `₹${change.amount} added to your wallet. New balance: ₹${result.after}`
    : `₹${change.amount} deducted from your wallet. New balance: ₹${result.after}`;

  void sendToUser(
    change.userId,
    title,
    body,
    { type: 'wallet', amount: String(change.amount) }
  ).catch((error) => console.error('[fcm:wallet-notification]', error));

  // Trigger referral on genuine deposit credits only
  const isDepositCredit =
    change.type === 1 &&
    REFERRAL_TRIGGER.test(change.remark) &&
    !REFERRAL_EXCLUDE.test(change.remark);

  if (isDepositCredit) {
    try {
      const { recordDeposit } = await import('./referral.service.js');
      await recordDeposit({
        userId: change.userId,
        mobile: result.userMobile,
        amount: change.amount,
      });
    } catch (e) {
      console.error('[referral:recordDeposit]', (e as Error).message);
    }
  }

  return result;
}

// ═══════════════════════════════════════════════════════════
// 🚀 CREDIT DEPOSIT + AUTO-BONUS
//
// Credits the base deposit, then looks up a matching tier in
// deposit_bonuses and credits the bonus automatically.
//
// Used by:
//   - POST /admin/upi/:id/approve     (admin approves UPI deposit)
//   - POST /admin/wallet/add          (admin manual credit — bonus fires)
//   - auto-deposit webhook handler    (gateway credits wallet)
//
// Skips bonus for non-deposit remarks (refunds, corrections, etc.)
//
// Returns: { deposit, bonus, total }
// ═══════════════════════════════════════════════════════════
export async function creditDepositWithBonus(params: {
  userId: string;
  amount: number;
  remark: string;
}) {
  const { userId, amount, remark } = params;

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Invalid deposit amount');
  }

  // ─── 1. Credit the base deposit ─────────────────────────
  await updateWallet({
    userId,
    amount,
    type: 1,
    remark,
  });

  // ─── 2. Skip bonus for non-deposit remarks ──────────────
  // Refunds, reversals, corrections, cashbacks, existing bonuses,
  // win payouts — these should NOT get a bonus on top.
  if (BONUS_EXCLUDE_REMARKS.test(remark)) {
    console.log(
      `[deposit-bonus] skipped (non-deposit remark): user=${userId} remark="${remark}"`,
    );
    return { deposit: amount, bonus: 0, total: amount };
  }

  // ─── 3. Look up matching bonus tier ─────────────────────
  // Picks the tier whose [min, max] range contains the deposit.
  // If multiple tiers overlap, the one with the highest min wins.
  const tier = await prisma.depositBonus.findFirst({
    where: {
      active: true,
      min: { lte: amount },
      max: { gte: amount },
    },
    orderBy: { min: 'desc' },
  });

  let bonus = 0;

  if (tier && Number(tier.bonus) > 0) {
    bonus = Number(tier.bonus);

    // 🚀 Remark contains "bonus" → REFERRAL_EXCLUDE regex catches it,
    //    so the referral system won't double-count this credit.
    await updateWallet({
      userId,
      amount: bonus,
      type: 1,
      remark: `Deposit bonus (₹${amount} → ₹${bonus} bonus)`,
    });

    console.log(
      `[deposit-bonus] user=${userId} deposit=₹${amount} bonus=₹${bonus} total=₹${amount + bonus}`,
    );
  } else {
    console.log(
      `[deposit-bonus] user=${userId} deposit=₹${amount} — no matching tier`,
    );
  }

  return {
    deposit: amount,
    bonus,
    total: amount + bonus,
  };
}
