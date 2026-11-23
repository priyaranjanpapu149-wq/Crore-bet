import admin from 'firebase-admin';
import prisma from '../config/db';
import fs from 'fs';
import path from 'path';

let initialized = false;

function initFirebase() {
  if (initialized) return;

  let creds: any = null;

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      creds = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      console.log('[fcm] Loaded credentials from env var');
    } catch (e: any) {
      console.error('[fcm] env JSON parse failed:', e.message);
    }
  }

  if (!creds) {
    const candidates = [
      path.join(__dirname, '../../firebase-service-account.json'),
      '/var/www/rajvardhan/backend/firebase-service-account.json',
    ];

    for (const fp of candidates) {
      if (fs.existsSync(fp)) {
        try {
          creds = JSON.parse(fs.readFileSync(fp, 'utf8'));
          console.log(`[fcm] Loaded credentials from ${fp}`);
          break;
        } catch (e: any) {
          console.error(`[fcm] Failed to parse ${fp}:`, e.message);
        }
      }
    }

    if (!creds) {
      console.warn('[fcm] Checked these paths:');
      candidates.forEach((p) => console.warn(`  - ${p}`));
    }
  }

  if (!creds) {
    console.warn('[fcm] No Firebase credentials found — push disabled');
    return;
  }

  try {
    admin.initializeApp({ credential: admin.credential.cert(creds) });
    initialized = true;
    console.log(`✅ Firebase Admin initialized (project: ${creds.project_id})`);
  } catch (e: any) {
    console.error('[fcm] init failed:', e.message);
  }
}

initFirebase();

export function isFcmReady() {
  return initialized;
}

// ═══════════════════════════════════════════════════════════
// TOPIC MANAGEMENT
// ═══════════════════════════════════════════════════════════
export async function subscribeTokenToTopic(token: string, topic: string) {
  if (!initialized) throw new Error('FCM not initialized');
  await admin.messaging().subscribeToTopic([token], topic);
}

export async function unsubscribeTokenFromTopic(token: string, topic: string) {
  if (!initialized) throw new Error('FCM not initialized');
  await admin.messaging().unsubscribeFromTopic([token], topic);
}

// ═══════════════════════════════════════════════════════════
// SEND TO TOPIC — data-only (Android side renders via RemoteViews)
// ═══════════════════════════════════════════════════════════
export async function sendToTopic(
  topic: string,
  title: string,
  body: string,
  data: Record<string, string> = {},
) {
  if (!initialized) throw new Error('FCM not initialized');

  const message: admin.messaging.Message = {
    topic,
    data: { ...data, title, body },          // ← ONLY data, no notification block
    android: {
      priority: 'high',
      ttl: 60 * 60 * 1000,
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
          'mutable-content': 1,
          alert: { title, body },             // ← iOS still needs this
        },
      },
    },
  };

  return admin.messaging().send(message);
}

// ═══════════════════════════════════════════════════════════
// SEND TO SINGLE TOKEN — data-only
// ═══════════════════════════════════════════════════════════
export async function sendToToken(
  token: string,
  title: string,
  body: string,
  data: Record<string, string> = {},
) {
  if (!initialized) throw new Error('FCM not initialized');

  const message: admin.messaging.Message = {
    token,
    data: { ...data, title, body },          // ← data-only
    android: {
      priority: 'high',
      ttl: 60 * 60 * 1000,
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
          'mutable-content': 1,
          alert: { title, body },
        },
      },
    },
  };

  return admin.messaging().send(message);
}

// ═══════════════════════════════════════════════════════════
// SEND TO USER — data-only
// ═══════════════════════════════════════════════════════════
export async function sendToUser(
  userId: string,
  title: string,
  body: string,
  data: Record<string, string> = {},
) {
  if (!initialized) throw new Error('FCM not initialized');

  const tokens = await prisma.deviceToken.findMany({
    where: { userId, active: true },
    select: { token: true },
  });

  if (tokens.length === 0) {
    console.log(`[fcm] no active tokens for user ${userId}`);
    return { successCount: 0, failureCount: 0 };
  }

  const message: admin.messaging.MulticastMessage = {
    tokens: tokens.map((t) => t.token),
    data: { ...data, title, body },          // ← data-only
    android: {
      priority: 'high',
      ttl: 60 * 60 * 1000,
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
          'mutable-content': 1,
          alert: { title, body },
        },
      },
    },
  };

  const result = await admin.messaging().sendEachForMulticast(message);

  if (result.failureCount > 0) {
    const dead: string[] = [];
    result.responses.forEach((r, i) => {
      const code = r.error?.code;
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token'
      ) {
        dead.push(tokens[i].token);
      }
    });
    if (dead.length) {
      await prisma.deviceToken.updateMany({
        where: { token: { in: dead } },
        data: { active: false },
      });
      console.log(`[fcm] deactivated ${dead.length} dead tokens`);
    }
  }

  return result;
}

// ═══════════════════════════════════════════════════════════
// REGISTER DEVICE TOKEN (auto-subscribes to 'all')
// ═══════════════════════════════════════════════════════════
export async function registerToken(params: {
  token: string;
  userId?: string;
  platform?: string;
  topics?: string[];
}) {
  const { token, userId, platform = 'android', topics = [] } = params;

  const allTopics = Array.from(new Set([...topics, 'all']));

  const record = await prisma.deviceToken.upsert({
    where: { token },
    create: {
      token,
      userId: userId || null,
      platform,
      topics: allTopics.join(','),
      active: true,
    },
    update: {
      userId: userId || null,
      platform,
      topics: allTopics.join(','),
      active: true,
    },
  });

  for (const t of allTopics) {
    try {
      await subscribeTokenToTopic(token, t);
      console.log(`[fcm] subscribed ${token.slice(0, 12)}... to "${t}"`);
    } catch (e: any) {
      console.error(`[fcm] topic sub failed for "${t}":`, e.message);
    }
  }

  try {
    await prisma.notification.create({
      data: {
        userId: userId || null,
        title: 'Device registered',
        body: `Token registered (${platform})`,
        type: 'system',
      },
    });
  } catch (_) {}

  return record;
}