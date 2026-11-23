import { Router } from 'express';
import prisma from '../config/db';
import { requireUser } from '../middleware/auth';
import { ok, badRequest, serverError } from '../utils/response';

const router = Router();
router.use(requireUser);

// ═══════════════════════════════════════════════════════════
// Business hours: 9:00 AM – 9:00 PM IST
// ═══════════════════════════════════════════════════════════
function istHour(): number {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 3600 * 1000);
  return ist.getUTCHours();
}

function withinBusinessHours(): boolean {
  const h = istHour();
  return h >= 9 && h < 21;
}

// ═══════════════════════════════════════════════════════════
// WITHDRAWAL REQUEST
// 🔒 Atomic: status + debit + passbook all in one transaction
// ═══════════════════════════════════════════════════════════
router.post('/withdraw-request', async (req, res) => {
  try {
    if (!withinBusinessHours()) {
      return badRequest(
        res,
        'Withdrawals are available only between 9:00 AM and 9:00 PM IST',
      );
    }

    const { amount } = req.body;
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 500) {
      return badRequest(res, 'Minimum withdrawal is 500');
    }
    if (amt > 50000) {
      return badRequest(res, 'Maximum withdrawal is 50000');
    }

    const bank = await prisma.bankDetail.findUnique({
      where: { userId: req.user!.sub },
    });
    if (!bank) return badRequest(res, 'Add bank/UPI details first');

    const pending = await prisma.withdrawal.findFirst({
      where: { userId: req.user!.sub, status: 'pending' },
    });
    if (pending) {
      return badRequest(res, 'You already have a pending withdrawal request');
    }

    // 🔒 Single transaction — all or nothing
    const wd = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: req.user!.sub },
      });
      if (!user) throw new Error('User not found');
      if (Number(user.wallet) < amt) throw new Error('Insufficient balance');

      const before = Number(user.wallet);
      const after = before - amt;

      // 1. Debit wallet
      await tx.user.update({
        where: { id: req.user!.sub },
        data: { wallet: after },
      });

      // 2. Passbook entry (debit)
      await tx.transaction.create({
        data: {
          userId: req.user!.sub,
          amount: amt,
          type: 0,
          remark: 'Withdrawal request',
          balanceBefore: before,
          balanceAfter: after,
        },
      });

      // 3. Withdrawal record
      return tx.withdrawal.create({
        data: {
          userId: req.user!.sub,
          amount: amt,
          status: 'pending',
          bankId: bank.id,
        },
      });
    });

    return ok(res, wd, 'Withdrawal requested');
  } catch (e: any) {
    return badRequest(res, e.message);
  }
});

// ═══════════════════════════════════════════════════════════
// WITHDRAWAL HISTORY (for user to see status of their requests)
// ═══════════════════════════════════════════════════════════
router.get('/withdrawals', async (req, res) => {
  try {
    const list = await prisma.withdrawal.findMany({
      where: { userId: req.user!.sub },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return ok(res, list);
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

// ═══════════════════════════════════════════════════════════
// UPI DEPOSIT (manual verification flow — admin approves)
// User pays outside, then submits UTR + screenshot.
// Admin verifies, then credits wallet manually.
// ═══════════════════════════════════════════════════════════
router.post('/upi-deposit', async (req, res) => {
  try {
    if (!withinBusinessHours()) {
      return badRequest(
        res,
        'UPI deposits are available only between 9:00 AM and 9:00 PM IST',
      );
    }

    const { amount, utr, screenshot } = req.body;
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 100) {
      return badRequest(res, 'Minimum deposit 100');
    }
    if (amt > 100000) {
      return badRequest(res, 'Maximum deposit is 100000');
    }
    if (!utr) return badRequest(res, 'UTR required');
    if (String(utr).length > 40) return badRequest(res, 'Invalid UTR');
    if (String(screenshot || '').length > 500000) {
      return badRequest(res, 'Screenshot too large');
    }

    const dup = await prisma.upiVerification.findFirst({
      where: { utr: String(utr) },
    });
    if (dup) return badRequest(res, 'This UTR has already been submitted');

    const rec = await prisma.upiVerification.create({
      data: {
        userId: req.user!.sub,
        amount: amt,
        utr: String(utr),
        screenshot,
        status: 'pending',
      },
    });

    return ok(res, rec, 'Submitted for verification');
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

// ═══════════════════════════════════════════════════════════
// UPI MODES
// ═══════════════════════════════════════════════════════════
router.get('/upi-modes', async (req, res) => {
  try {
    const gateways = await prisma.gatewayConfig.findMany({
      where: { enabled: true },
      select: { name: true, displayName: true, minAmount: true, maxAmount: true },
    });
    return ok(res, gateways);
  } catch (e: any) {
    return serverError(res, e.message);
  }
});

// ═══════════════════════════════════════════════════════════
// P2P TRANSFER — atomic
// ═══════════════════════════════════════════════════════════
router.post('/transfer', async (req, res) => {
  try {
    if (!withinBusinessHours()) {
      return badRequest(
        res,
        'Transfers are available only between 9:00 AM and 9:00 PM IST',
      );
    }

    const { toMobile, amount } = req.body;
    const amt = Number(amount);

    if (!toMobile || !/^\d{10}$/.test(String(toMobile))) {
      return badRequest(res, 'Valid 10-digit mobile required');
    }
    if (!Number.isFinite(amt) || amt < 1) {
      return badRequest(res, 'Invalid amount');
    }
    if (amt > 50000) {
      return badRequest(res, 'Maximum transfer is 50000');
    }
    if (String(toMobile) === req.user!.mobile) {
      return badRequest(res, 'Cannot transfer to yourself');
    }

    const target = await prisma.user.findUnique({
      where: { mobile: String(toMobile) },
    });
    if (!target) return badRequest(res, 'Recipient not found');
    if (!target.active) return badRequest(res, 'Recipient account is not active');

    await prisma.$transaction(async (tx) => {
      const sender = await tx.user.findUnique({ where: { id: req.user!.sub } });
      if (!sender || Number(sender.wallet) < amt) {
        throw new Error('Insufficient balance');
      }

      const sBefore = Number(sender.wallet);
      const sAfter = sBefore - amt;
      await tx.user.update({
        where: { id: sender.id },
        data: { wallet: sAfter },
      });
      await tx.transaction.create({
        data: {
          userId: sender.id,
          amount: amt,
          type: 0,
          remark: `Transfer to ${toMobile}`,
          balanceBefore: sBefore,
          balanceAfter: sAfter,
        },
      });

      const tBefore = Number(target.wallet);
      const tAfter = tBefore + amt;
      await tx.user.update({
        where: { id: target.id },
        data: { wallet: tAfter },
      });
      await tx.transaction.create({
        data: {
          userId: target.id,
          amount: amt,
          type: 1,
          remark: `Transfer from ${req.user!.mobile}`,
          balanceBefore: tBefore,
          balanceAfter: tAfter,
        },
      });
    });

    return ok(res, {}, 'Transferred');
  } catch (e: any) {
    return badRequest(res, e.message);
  }
});

export default router;