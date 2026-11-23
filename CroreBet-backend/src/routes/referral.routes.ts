import { Router } from 'express';
import { requireUser } from '../middleware/auth';
import { getMyReferrals } from '../services/referral.service';
import prisma from '../config/db';
import { ok, serverError, notFound, badRequest } from '../utils/response';

const router = Router();
router.use(requireUser);

router.get('/my', async (req, res) => {
  try {
    const stats = await getMyReferrals(req.user!.mobile);
    const me = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: { referCode: true, referredBy: true },
    });
    return ok(res, { ...stats, myCode: me?.referCode, referredBy: me?.referredBy });
  } catch (e: any) { return serverError(res, e.message); }
});

router.get('/check/:code', async (req, res) => {
  try {
    const code = String(req.params.code).trim();
    if (!code || code.length > 32) return badRequest(res, 'Invalid code');

    const user = await prisma.user.findUnique({
      where: { referCode: code },
      select: { name: true, mobile: true },
    });
    if (!user) return notFound(res, 'Invalid refer code');

    // 🔒 SECURITY: don't leak self-referral — reject if same mobile
    const me = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: { mobile: true },
    });
    if (me?.mobile === user.mobile) {
      return badRequest(res, 'You cannot use your own refer code');
    }

    return ok(res, { name: user.name, mobile: `******${user.mobile.slice(-4)}` });
  } catch (e: any) { return serverError(res, e.message); }
});

export default router;