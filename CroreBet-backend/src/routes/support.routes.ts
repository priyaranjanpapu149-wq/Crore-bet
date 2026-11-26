import { Router } from 'express';
import prisma from '../config/db';
import { requireUser } from '../middleware/auth';
import { requireAdmin } from '../middleware/adminAuth';
import { sendToUser } from '../services/fcm.service';
import { validateSupportQuestions } from '../services/supportQuestions';

const router = Router();
const questionsKey = 'support_auto_questions';

async function getQuestions() {
  const setting = await prisma.setting.findUnique({ where: { key: questionsKey } });
  if (!setting) return [];
  return validateSupportQuestions(JSON.parse(setting.value)) ?? [];
}

router.get('/user/questions', requireUser, async (_req, res, next) => {
  try { res.json({ success: true, data: await getQuestions() }); }
  catch (e) { next(e); }
});

router.get('/admin/questions', requireAdmin, async (_req, res, next) => {
  try { res.json({ success: true, data: await getQuestions() }); }
  catch (e) { next(e); }
});

router.put('/admin/questions', requireAdmin, async (req, res, next) => {
  const questions = validateSupportQuestions(req.body?.questions);
  if (!questions) return res.status(400).json({ success: false, message: 'Enter up to six questions and answers. Questions can have up to 200 characters and answers up to 1000.' });
  try {
    const value = JSON.stringify(questions);
    await prisma.setting.upsert({ where: { key: questionsKey }, update: { value }, create: { key: questionsKey, value } });
    return res.json({ success: true, data: questions });
  } catch (e) { return next(e); }
});

router.get('/user/messages', requireUser, async (req, res, next) => {
  try {
    const messages = await prisma.chatMessage.findMany({ where: { userId: req.user!.sub }, orderBy: { createdAt: 'asc' } });
    res.json({ success: true, data: messages });
  } catch (e) { next(e); }
});

router.post('/user/messages', requireUser, async (req, res, next) => {
  const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
  if (!message || message.length > 4000) return res.status(400).json({ success: false, message: 'Enter a message of up to 4000 characters.' });
  try {
    const userId = req.user!.sub;
    const [, saved] = await prisma.$transaction([
      prisma.$executeRaw`INSERT INTO "support_conversations" ("userId", "status") VALUES (${userId}, 'pending') ON CONFLICT ("userId") DO UPDATE SET "status" = 'pending'`,
      prisma.chatMessage.create({ data: { userId, sender: 'user', message } }),
    ]);
    return res.status(201).json({ success: true, data: saved });
  } catch (e) { return next(e); }
});

router.get('/admin/conversations', requireAdmin, async (_req, res, next) => {
  try {
    const [users, statuses] = await Promise.all([prisma.user.findMany({
      where: { chatMessages: { some: {} } },
      select: { id: true, name: true, mobile: true, chatMessages: { orderBy: { createdAt: 'desc' }, take: 1 }, _count: { select: { chatMessages: { where: { sender: 'user', read: false } } } } },
    }), prisma.$queryRaw<Array<{ userId: string; status: string }>>`SELECT "userId", "status" FROM "support_conversations"`]);
    users.sort((a, b) => b.chatMessages[0].createdAt.getTime() - a.chatMessages[0].createdAt.getTime());
    const statusByUser = new Map(statuses.map(item => [item.userId, item.status]));
    res.json({ success: true, data: users.map(user => ({ ...user, status: statusByUser.get(user.id) ?? 'pending' })) });
  } catch (e) { next(e); }
});

router.put('/admin/conversations/:userId/status', requireAdmin, async (req, res, next) => {
  const status = req.body?.status;
  if (status !== 'pending' && status !== 'solved') return res.status(400).json({ success: false, message: 'Invalid support status.' });
  try {
    const userId = String(req.params.userId);
    const exists = await prisma.chatMessage.findFirst({ where: { userId }, select: { id: true } });
    if (!exists) return res.status(404).json({ success: false, message: 'Conversation not found.' });
    await prisma.$executeRaw`INSERT INTO "support_conversations" ("userId", "status") VALUES (${userId}, ${status}) ON CONFLICT ("userId") DO UPDATE SET "status" = EXCLUDED."status"`;
    return res.json({ success: true, data: { status } });
  } catch (e) { return next(e); }
});

router.get('/admin/conversations/:userId', requireAdmin, async (req, res, next) => {
  try {
    const userId = String(req.params.userId);
    const messages = await prisma.chatMessage.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
    await prisma.chatMessage.updateMany({ where: { userId, sender: 'user', read: false }, data: { read: true } });
    res.json({ success: true, data: messages });
  } catch (e) { next(e); }
});

router.post('/admin/conversations/:userId', requireAdmin, async (req, res, next) => {
  const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
  if (!message || message.length > 4000) return res.status(400).json({ success: false, message: 'Enter a message of up to 4000 characters.' });
  try {
    const userId = String(req.params.userId);
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    const saved = await prisma.chatMessage.create({ data: { userId, sender: 'admin', message } });
    void sendToUser(userId, 'Crorebet Support', 'You have a new support reply.', { type: 'support' }).catch(() => {});
    return res.status(201).json({ success: true, data: saved });
  } catch (e) { return next(e); }
});

export default router;
