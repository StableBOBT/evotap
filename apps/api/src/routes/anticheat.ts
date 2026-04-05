/**
 * Anti-Cheat Routes
 * Device registration, trust score, and ban management
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Env, Variables } from '../types.js';
import { createRedisClient, getOrCreateUserState } from '../lib/redis.js';
import { adminAuthMiddleware } from '../middleware/index.js';
import {
  registerDevice,
  calculateTrustScore,
  isUserBanned,
  banUser,
  unbanUser,
  addWarning,
  getTapHistory,
  analyzeTapBehavior,
  type DeviceFingerprint,
} from '../lib/anticheat.js';

// Schemas
const DeviceFingerprintSchema = z.object({
  userAgent: z.string(),
  screenWidth: z.number(),
  screenHeight: z.number(),
  colorDepth: z.number(),
  pixelRatio: z.number(),
  timezone: z.string(),
  language: z.string(),
  platform: z.string(),
  touchSupport: z.boolean(),
  maxTouchPoints: z.number(),
  canvasHash: z.string().optional(),
});

const BanUserSchema = z.object({
  telegramId: z.number(),
  reason: z.string(),
  duration: z.number().optional(), // seconds, if not provided = permanent
});

// Router
export const anticheatRouter = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>()
  // POST /anticheat/register-device - Register device fingerprint
  .post('/register-device', zValidator('json', DeviceFingerprintSchema), async (c) => {
    const fingerprint = c.req.valid('json') as DeviceFingerprint;
    const telegramId = c.get('telegramId');

    const redis = createRedisClient(c.env);

    const result = await registerDevice(redis, telegramId, fingerprint);

    // Add warning if suspicious
    if (result.isSuspicious) {
      await addWarning(redis, telegramId, `Multiple accounts on same device: ${result.accountsOnDevice}`);
    }

    return c.json({
      success: true,
      data: result,
    });
  })

  // GET /anticheat/trust-score - Get user's trust score
  .get('/trust-score', async (c) => {
    const telegramId = c.get('telegramId');
    const telegramUser = c.get('telegramUser');

    const redis = createRedisClient(c.env);
    const userState = await getOrCreateUserState(redis, telegramId);

    // Get device fingerprint hash
    const fpKey = `anticheat:fp:${telegramId}`;
    const fpData = await redis.get(fpKey);
    let deviceHash = 'unknown';
    if (fpData) {
      try {
        deviceHash = JSON.parse(fpData as string).hash || 'unknown';
      } catch {
        console.error('[Anticheat] Failed to parse device fingerprint');
      }
    }

    // Get actual behavior score from tap history analysis
    const tapHistory = await getTapHistory(redis, telegramId);
    const behaviorAnalysis = analyzeTapBehavior(tapHistory);
    const actualBehaviorScore = behaviorAnalysis.score;

    // Calculate days played based on unique play dates
    // For now, use approximation from totalTaps (avg 500 taps/day)
    const estimatedDaysPlayed = Math.max(1, Math.ceil(userState.totalTaps / 500));

    // Track session count from tap history
    // Each gap > 30 min in tap history = new session
    let sessionCount = 1;
    for (let i = 1; i < tapHistory.length; i++) {
      const gap = tapHistory[i].timestamp - tapHistory[i - 1].timestamp;
      if (gap > 30 * 60 * 1000) { // 30 minutes
        sessionCount++;
      }
    }

    const trustScore = await calculateTrustScore(redis, {
      telegramId,
      accountCreatedAt: new Date(userState.createdAt),
      isPremium: telegramUser?.is_premium || false,
      behaviorScore: actualBehaviorScore,
      deviceHash,
      referralCount: userState.referralCount || 0,
      referredByTrusted: false, // Would need to check referrer's trust
      walletConnected: !!userState.walletAddress,
      totalSessions: sessionCount,
      totalDaysPlayed: estimatedDaysPlayed,
    });

    return c.json({
      success: true,
      data: {
        score: trustScore.score,
        factors: trustScore.factors,
        isEligibleForAirdrop: trustScore.isEligibleForAirdrop,
        airdropMultiplier: trustScore.airdropMultiplier,
        behaviorScore: actualBehaviorScore,
        behaviorFlags: behaviorAnalysis.flags,
      },
    });
  })

  // GET /anticheat/status - Check if user is banned
  .get('/status', async (c) => {
    const telegramId = c.get('telegramId');

    const redis = createRedisClient(c.env);
    const banStatus = await isUserBanned(redis, telegramId);

    return c.json({
      success: true,
      data: banStatus,
    });
  })

  // POST /anticheat/admin/ban - Ban a user (admin only)
  .post('/admin/ban', adminAuthMiddleware, zValidator('json', BanUserSchema), async (c) => {
    const { telegramId, reason, duration } = c.req.valid('json');
    const adminId = c.get('telegramId');

    console.log(`[Admin] User ${adminId} banning ${telegramId}: ${reason}`);

    const redis = createRedisClient(c.env);

    if (duration) {
      // Temporary ban
      await redis.set(
        `anticheat:banned:${telegramId}`,
        JSON.stringify({
          reason,
          bannedAt: Date.now(),
          bannedBy: adminId,
          permanent: false,
          expiresAt: Date.now() + (duration * 1000),
        }),
        { ex: duration }
      );
    } else {
      // Permanent ban
      await banUser(redis, telegramId, reason);
    }

    return c.json({
      success: true,
      data: { banned: true, telegramId, reason },
    });
  })

  // POST /anticheat/admin/unban - Unban a user (admin only)
  .post('/admin/unban', adminAuthMiddleware, zValidator('json', z.object({ telegramId: z.number() })), async (c) => {
    const { telegramId } = c.req.valid('json');
    const adminId = c.get('telegramId');

    console.log(`[Admin] User ${adminId} unbanning ${telegramId}`);

    const redis = createRedisClient(c.env);
    await unbanUser(redis, telegramId);

    return c.json({
      success: true,
      data: { unbanned: true, telegramId },
    });
  });
