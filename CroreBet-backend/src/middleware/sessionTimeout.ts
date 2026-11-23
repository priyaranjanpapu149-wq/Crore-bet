import prisma from '../config/db';

const TIMEOUT_MIN = 10;

export function sessionTimeout(req: any, res: any, next: any) {
  if (!req.user?.sub) return next();

  const lastActivity = req.user.lastActivity
    ? Number(req.user.lastActivity)
    : null;

  if (lastActivity && Date.now() - lastActivity > TIMEOUT_MIN * 60 * 1000) {
    return res.status(401).json({
      success: false,
      message: 'Session expired due to inactivity. Please login again.',
    });
  }

  req.user.lastActivity = Date.now();

  prisma.user.update({
    where: { id: req.user.sub },
    data: { lastSeen: new Date() },
  }).catch(() => {});

  next();
}