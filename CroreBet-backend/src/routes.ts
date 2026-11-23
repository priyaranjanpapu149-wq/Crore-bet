import { Router } from 'express';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import gameRoutes from './routes/game.routes';
import walletRoutes from './routes/wallet.routes';
import adminRoutes from './routes/admin.routes';
import referralRoutes from './routes/referral.routes';
import publicRoutes from './routes/public.routes';
import uploadRoutes from './routes/upload.routes';

const router = Router();

router.use('/public', publicRoutes);
router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/games', gameRoutes);
router.use('/wallet', walletRoutes);
router.use('/admin', adminRoutes);
router.use('/referral', referralRoutes);
router.use('/admin', uploadRoutes);

export default router;
