import rateLimit from 'express-rate-limit';
import { ipKeyGenerator } from 'express-rate-limit';

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: 'Too many requests. Slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3, // Kept at 3 to prevent SMS spam
  keyGenerator: (req: any) =>
    req.body?.mobile || ipKeyGenerator(req.ip ?? ''),
  message: { success: false, message: 'Too many OTP requests. Try again in 1 hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10, // 🚀 CHANGED from 5 to 10
  keyGenerator: (req: any) =>
    req.body?.mobile || ipKeyGenerator(req.ip ?? ''),
  message: { success: false, message: 'Too many login attempts. Try again in 10 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const verifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10, // 🚀 Already at 10
  keyGenerator: (req: any) =>
    req.body?.mobile || ipKeyGenerator(req.ip ?? ''),
  message: { success: false, message: 'Too many attempts. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});