import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import 'dotenv/config';
import prisma from './config/db';
import routes from './routes';
import { startScheduler } from './jobs/scheduler';
import { globalLimiter } from './middleware/rateLimit';

const app = express();
const PORT = process.env.PORT || 5000;

// Trust nginx proxy — required for secure cookies behind HTTPS termination
app.set('trust proxy', 1);

// ═══════════════════════════════════════════════════════════
// SECURITY MIDDLEWARE
// ═══════════════════════════════════════════════════════════
app.use(helmet());
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      'https://Crorebet.cc',
      'https://www.Crorebet.cc',
      'https://web.Crorebet.cc',
      'https://admin.Crorebet.cc',
      'https://crorebetapp.com',
      'https://www.crorebetapp.com',
      'https://web.crorebetapp.com',
      'https://admin.crorebetapp.com',
      ...(process.env.CORS_ORIGINS || '').split(',').map(origin => origin.trim()).filter(Boolean),
    ]
  : true;

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Id'],
}));
app.use(cookieParser());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.disable('x-powered-by');

// ═══════════════════════════════════════════════════════════
// HEALTH CHECK (before rate limit — monitoring must always work)
// ═══════════════════════════════════════════════════════════
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      service: 'crorebet',
      database: 'connected',
      time: new Date().toISOString(),
    });
  } catch (e: any) {
    res.status(500).json({ status: 'error', database: 'disconnected', message: e.message });
  }
});

// ═══════════════════════════════════════════════════════════
// GLOBAL RATE LIMITER — applies to all /api/* routes
// Per-route limiters (OTP, login, etc.) stack on top of this
// ═══════════════════════════════════════════════════════════
app.use('/api', globalLimiter);

// ═══════════════════════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════════════════════
app.use('/api', (req, res, next) => {
  console.log('[API REQUEST]', req.method, req.originalUrl);
  next();
});
app.use('/api', routes);

// ═══════════════════════════════════════════════════════════
// 404
// ═══════════════════════════════════════════════════════════
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found', path: req.path });
});

// ═══════════════════════════════════════════════════════════
// ERROR HANDLER
// ═══════════════════════════════════════════════════════════
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Log only message + stack, never the full error object
  console.error('[unhandled]', err?.message || 'unknown error');
  if (process.env.NODE_ENV !== 'production') {
    console.error(err?.stack);
  }
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`\n🚀 Crorebet API on http://0.0.0.0:${PORT}\n`);
  startScheduler();
});

export default app;
