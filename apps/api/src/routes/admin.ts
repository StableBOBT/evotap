/**
 * Admin Routes
 * Protected admin endpoints for dashboard and management
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Env } from '../types.js';
import { createRedisClient } from '../lib/redis.js';
import {
  adminAuthMiddleware,
  adminRateLimitMiddleware,
  adminSensitiveRateLimitMiddleware,
} from '../middleware/index.js';

// =============================================================================
// TYPES
// =============================================================================

interface AdminVariables {
  isAdmin: boolean;
}

// =============================================================================
// SCHEMAS
// =============================================================================

const BanUserSchema = z.object({
  telegramId: z.number(),
  reason: z.string().min(1),
  duration: z.number().optional(), // Hours, undefined = permanent
});

const UnbanUserSchema = z.object({
  telegramId: z.number(),
});

const SearchUserSchema = z.object({
  query: z.string().min(1), // Telegram ID or username
});

const TopUsersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(50),
});

// =============================================================================
// ROUTER
// =============================================================================

export const adminRouter = new Hono<{
  Bindings: Env;
  Variables: AdminVariables;
}>()
  // Apply admin auth and rate limiting to all routes
  .use('*', adminAuthMiddleware)
  .use('*', adminRateLimitMiddleware)

  // GET /admin/stats - Get overall system stats
  .get('/stats', async (c) => {
    const redis = createRedisClient(c.env);

    try {
      // Get total users (from global leaderboard)
      const totalUsers = await redis.zcard('leaderboard:global');

      // Get total points in system (using zrevrange with scores)
      const topUsersData = await redis.zrevrange('leaderboard:global', 0, 999, true);
      let totalPoints = 0;
      for (let i = 1; i < topUsersData.length; i += 2) {
        totalPoints += parseFloat(topUsersData[i] || '0');
      }

      // Active count approximation (total users for now)
      const activeCount = totalUsers;

      // Get banned users count
      const banKeys = await redis.keys('anticheat:banned:*');
      const bannedCount = banKeys.length;

      // Get team counts
      const collaCount = await redis.zcard('leaderboard:team:colla');
      const cambaCount = await redis.zcard('leaderboard:team:camba');

      // Get airdrop snapshot status
      const airdropRoot = await redis.get('airdrop:root:current');
      const snapshotData = await redis.get('airdrop:snapshot:current');
      let snapshotInfo = null;
      if (snapshotData) {
        try {
          const snapshot = JSON.parse(snapshotData);
          snapshotInfo = {
            root: airdropRoot,
            totalRecipients: snapshot.totalRecipients,
            totalAmount: snapshot.totalAmount,
            createdAt: snapshot.createdAt,
          };
        } catch (parseError) {
          console.error('[Admin] Failed to parse snapshot data:', parseError);
        }
      }

      return c.json({
        success: true,
        data: {
          users: {
            total: totalUsers,
            activeToday: activeCount,
            banned: bannedCount,
          },
          points: {
            total: totalPoints,
            average: totalUsers > 0 ? Math.floor(totalPoints / totalUsers) : 0,
          },
          teams: {
            colla: collaCount,
            camba: cambaCount,
          },
          airdrop: snapshotInfo,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('[Admin] Error getting stats:', error);
      return c.json({
        success: false,
        error: 'Failed to get stats',
        code: 'STATS_ERROR',
      }, 500);
    }
  })

  // GET /admin/users/top - Get top users
  .get('/users/top', zValidator('query', TopUsersQuerySchema), async (c) => {
    const redis = createRedisClient(c.env);
    const { limit } = c.req.valid('query');

    try {
      const topUsers = await redis.zrevrange('leaderboard:global', 0, limit - 1, true);

      const users: Array<{
        telegramId: number;
        points: number;
        rank: number;
        username?: string;
        trustScore?: number;
        team?: string;
      }> = [];

      for (let i = 0; i < topUsers.length; i += 2) {
        const telegramId = parseInt(topUsers[i] as string);
        const points = topUsers[i + 1] as number;

        // Get additional user data
        const userKey = `user:${telegramId}`;
        const userData = await redis.hgetall(userKey);

        const trustKey = `anticheat:trust:${telegramId}`;
        const trustData = await redis.hgetall(trustKey);

        users.push({
          telegramId,
          points,
          rank: Math.floor(i / 2) + 1,
          username: userData?.username as string | undefined,
          trustScore: trustData?.score ? parseInt(trustData.score as string) : undefined,
          team: userData?.team as string | undefined,
        });
      }

      return c.json({
        success: true,
        data: {
          users,
          total: users.length,
        },
      });
    } catch (error) {
      console.error('[Admin] Error getting top users:', error);
      return c.json({
        success: false,
        error: 'Failed to get top users',
        code: 'USERS_ERROR',
      }, 500);
    }
  })

  // GET /admin/users/banned - Get banned users list
  .get('/users/banned', async (c) => {
    const redis = createRedisClient(c.env);

    try {
      const banKeys = await redis.keys('anticheat:banned:*');
      const bannedUsers: Array<{
        telegramId: number;
        reason: string;
        bannedAt?: string;
        expiresAt?: string;
      }> = [];

      for (const key of banKeys) {
        const telegramId = parseInt(key.replace('anticheat:banned:', ''));
        const banData = await redis.hgetall(key);

        if (banData) {
          bannedUsers.push({
            telegramId,
            reason: banData.reason as string || 'No reason provided',
            bannedAt: banData.bannedAt as string,
            expiresAt: banData.expiresAt as string,
          });
        }
      }

      return c.json({
        success: true,
        data: {
          users: bannedUsers,
          total: bannedUsers.length,
        },
      });
    } catch (error) {
      console.error('[Admin] Error getting banned users:', error);
      return c.json({
        success: false,
        error: 'Failed to get banned users',
        code: 'BANNED_ERROR',
      }, 500);
    }
  })

  // POST /admin/users/search - Search for a user
  .post('/users/search', zValidator('json', SearchUserSchema), async (c) => {
    const { query } = c.req.valid('json');
    const redis = createRedisClient(c.env);

    try {
      let telegramId: number | null = null;

      // Check if query is a number (telegram ID)
      if (/^\d+$/.test(query)) {
        telegramId = parseInt(query);
      } else {
        // Search by username (would need username index in production)
        // For MVP, we'll just check if it's a numeric ID
        return c.json({
          success: false,
          error: 'Username search not implemented. Use Telegram ID.',
          code: 'NOT_IMPLEMENTED',
        }, 400);
      }

      // Get user data
      const userKey = `user:${telegramId}`;
      const userData = await redis.hgetall(userKey);

      if (!userData || Object.keys(userData).length === 0) {
        return c.json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        }, 404);
      }

      // Get points
      const points = await redis.zscore('leaderboard:global', telegramId.toString());

      // Get trust score
      const trustKey = `anticheat:trust:${telegramId}`;
      const trustData = await redis.hgetall(trustKey);

      // Check ban status
      const banKey = `anticheat:banned:${telegramId}`;
      const banData = await redis.hgetall(banKey);

      return c.json({
        success: true,
        data: {
          telegramId,
          username: userData.username,
          firstName: userData.firstName,
          points: points || 0,
          level: userData.level,
          team: userData.team,
          department: userData.department,
          walletAddress: userData.walletAddress,
          trustScore: trustData?.score ? parseInt(trustData.score as string) : 50,
          isBanned: Object.keys(banData || {}).length > 0,
          banInfo: banData || null,
          createdAt: userData.createdAt,
        },
      });
    } catch (error) {
      console.error('[Admin] Error searching user:', error);
      return c.json({
        success: false,
        error: 'Failed to search user',
        code: 'SEARCH_ERROR',
      }, 500);
    }
  })

  // POST /admin/users/ban - Ban a user (stricter rate limit)
  .post('/users/ban', adminSensitiveRateLimitMiddleware, zValidator('json', BanUserSchema), async (c) => {
    const { telegramId, reason, duration } = c.req.valid('json');
    const redis = createRedisClient(c.env);

    try {
      const banKey = `anticheat:banned:${telegramId}`;
      const now = new Date().toISOString();

      const banData: Record<string, string> = {
        reason,
        bannedAt: now,
        bannedBy: 'admin',
      };

      if (duration) {
        const expiresAt = new Date(Date.now() + duration * 60 * 60 * 1000);
        banData.expiresAt = expiresAt.toISOString();
        await redis.hmset(banKey, banData);
        // Set expiry on the key
        await redis.expire(banKey, duration * 60 * 60);
      } else {
        await redis.hmset(banKey, banData);
      }

      // Update trust score to 0
      const trustKey = `anticheat:trust:${telegramId}`;
      await redis.hset(trustKey, 'score', '0');

      return c.json({
        success: true,
        data: {
          telegramId,
          reason,
          duration: duration ? `${duration} hours` : 'permanent',
          bannedAt: now,
        },
      });
    } catch (error) {
      console.error('[Admin] Error banning user:', error);
      return c.json({
        success: false,
        error: 'Failed to ban user',
        code: 'BAN_ERROR',
      }, 500);
    }
  })

  // POST /admin/users/unban - Unban a user
  .post('/users/unban', zValidator('json', UnbanUserSchema), async (c) => {
    const { telegramId } = c.req.valid('json');
    const redis = createRedisClient(c.env);

    try {
      const banKey = `anticheat:banned:${telegramId}`;
      await redis.del(banKey);

      // Reset trust score to default
      const trustKey = `anticheat:trust:${telegramId}`;
      await redis.hset(trustKey, 'score', '50');

      return c.json({
        success: true,
        data: {
          telegramId,
          unbannedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('[Admin] Error unbanning user:', error);
      return c.json({
        success: false,
        error: 'Failed to unban user',
        code: 'UNBAN_ERROR',
      }, 500);
    }
  })

  // GET /admin/suspicious - Get suspicious activity
  .get('/suspicious', async (c) => {
    const redis = createRedisClient(c.env);

    try {
      // Get users with low trust scores
      const allKeys = await redis.keys('anticheat:trust:*');
      const suspicious: Array<{
        telegramId: number;
        trustScore: number;
        reasons: string[];
      }> = [];

      for (const key of allKeys.slice(0, 100)) { // Limit for performance
        const trustData = await redis.hgetall(key);
        const score = parseInt(trustData?.score as string || '50');

        if (score < 40) {
          const telegramId = parseInt(key.replace('anticheat:trust:', ''));
          const reasons: string[] = [];

          // Check why score is low
          if (trustData?.emulatorDetected === 'true') reasons.push('Emulator detected');
          if (trustData?.multiAccount === 'true') reasons.push('Multi-account suspected');
          if (trustData?.abnormalBehavior === 'true') reasons.push('Abnormal tap patterns');
          if (trustData?.vpnDetected === 'true') reasons.push('VPN/Proxy detected');

          if (reasons.length === 0) reasons.push('Low overall score');

          suspicious.push({
            telegramId,
            trustScore: score,
            reasons,
          });
        }
      }

      // Sort by score ascending (most suspicious first)
      suspicious.sort((a, b) => a.trustScore - b.trustScore);

      return c.json({
        success: true,
        data: {
          users: suspicious.slice(0, 50), // Top 50 most suspicious
          total: suspicious.length,
        },
      });
    } catch (error) {
      console.error('[Admin] Error getting suspicious users:', error);
      return c.json({
        success: false,
        error: 'Failed to get suspicious users',
        code: 'SUSPICIOUS_ERROR',
      }, 500);
    }
  })

  // GET /admin/activity - Get recent activity log
  .get('/activity', async (c) => {
    // In production, you'd store activity logs
    // For MVP, return a placeholder
    return c.json({
      success: true,
      data: {
        message: 'Activity logging not implemented in MVP',
        activities: [],
      },
    });
  })

  // POST /admin/reset - Reset all Redis data (DANGEROUS - use with caution)
  .post('/reset', adminSensitiveRateLimitMiddleware, async (c) => {
    const redis = createRedisClient(c.env);
    const confirmReset = c.req.query('confirm');

    if (confirmReset !== 'yes-delete-everything') {
      return c.json({
        success: false,
        error: 'Add ?confirm=yes-delete-everything to confirm reset',
        code: 'CONFIRMATION_REQUIRED',
      }, 400);
    }

    try {
      // Get all keys and delete them
      const patterns = [
        'user:*',
        'leaderboard:*',
        'referral:*',
        'anticheat:*',
        'ratelimit:*',
        'session:*',
        'device:*',
        'airdrop:*',
        'social:*',
        'nonce:*',
      ];

      let deletedCount = 0;

      for (const pattern of patterns) {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          for (const key of keys) {
            await redis.del(key);
            deletedCount++;
          }
        }
      }

      return c.json({
        success: true,
        data: {
          message: 'All Redis data has been reset',
          deletedKeys: deletedCount,
          resetAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('[Admin] Error resetting data:', error);
      return c.json({
        success: false,
        error: 'Failed to reset data',
        code: 'RESET_ERROR',
      }, 500);
    }
  });
