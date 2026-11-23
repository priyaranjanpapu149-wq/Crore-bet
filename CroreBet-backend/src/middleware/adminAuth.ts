import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { unauthorized, forbidden } from '../utils/response';

const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const TOUCH_THRESHOLD_MS = 30 * 1000;   // don't touch DB more than once per 30s

export const SESSION_COOKIE = 'mhx_admin_session';

declare global {
  namespace Express {
    interface Request {
      admin?: {
        sub: string;
        email: string;
        role: 'admin' | 'superadmin';
      };
    }
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[SESSION_COOKIE];
    if (!token) return unauthorized(res, 'Not logged in');

    const session = await prisma.adminSession.findUnique({
      where: { refreshToken: token },
      include: { admin: true },
    });

    if (!session || !session.active) return unauthorized(res, 'Session expired');
    if (session.expiresAt < new Date()) return unauthorized(res, 'Session expired');
    if (!session.admin.active) return unauthorized(res, 'Admin disabled');

    // Idle timeout check
    const idleMs = Date.now() - session.lastActiveAt.getTime();
    if (idleMs > IDLE_TIMEOUT_MS) {
      await prisma.adminSession.update({
        where: { id: session.id },
        data: { active: false },
      });
      return unauthorized(res, 'Session expired due to inactivity');
    }

    // Touch lastActiveAt (throttled — no more than once per 30s)
    if (idleMs > TOUCH_THRESHOLD_MS) {
      prisma.adminSession
        .update({
          where: { id: session.id },
          data: { lastActiveAt: new Date() },
        })
        .catch(() => {});
    }

    req.admin = {
      sub: session.admin.id,
      email: session.admin.email,
      role: session.admin.role as 'admin' | 'superadmin',
    };

    next();
  } catch (e: any) {
    return unauthorized(res, 'Session check failed');
  }
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.admin?.role !== 'superadmin') return forbidden(res, 'Super admin only');
  next();
}