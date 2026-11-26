import { Request, Response, NextFunction } from 'express';
import { verifyUserAccess, UserPayload } from '../utils/jwt';
import { unauthorized } from '../utils/response';
import prisma from '../config/db';

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

export async function requireUser(req: Request, res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return unauthorized(res, 'Missing token');
  try {
    req.user = verifyUserAccess(h.slice(7));
  } catch {
    return unauthorized(res, 'Invalid or expired token');
  }
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.sub }, select: { active: true } });
    if (!user?.active) return unauthorized(res, 'Account is inactive');
    next();
  } catch (error) { next(error); }
}
