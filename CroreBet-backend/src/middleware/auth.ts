import { Request, Response, NextFunction } from 'express';
import { verifyUserAccess, UserPayload } from '../utils/jwt';
import { unauthorized } from '../utils/response';

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

export function requireUser(req: Request, res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return unauthorized(res, 'Missing token');
  try {
    req.user = verifyUserAccess(h.slice(7));
    next();
  } catch {
    return unauthorized(res, 'Invalid or expired token');
  }
}
