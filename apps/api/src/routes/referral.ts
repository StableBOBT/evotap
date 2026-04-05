import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Env, Variables } from '../types.js';
import { GAME_CONFIG } from '../types.js';
import { claimRateLimit } from '../middleware/index.js';
import {
  createRedisClient,
  REDIS_KEYS,
  loadUserState,
  saveUserState,
  getOrCreateUserState,
  type UserGameState,
} from '../lib/redis.js';

// Schemas
const ClaimReferralSchema = z.object({
  code: z.string().min(6).max(12),
});

const CodeParamSchema = z.object({
  code: z.string().min(6).max(12),
});

/**
 * Get the Telegram bot username from environment or use default
 */
function getBotUsername(_env: Env): string {
  // In production, this would come from environment
  return 'EVOtapBot';
}

// Router
export const referralRouter = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>()
  // GET /referral/stats - Get referral stats
  .get('/stats', async (c) => {
    const telegramId = c.get('telegramId');
    const redis = createRedisClient(c.env);

    // Get user state to get referral code
    const state = await getOrCreateUserState(redis, telegramId);

    // Get list of referrals
    const referralIds = await redis.smembers(REDIS_KEYS.userReferrals(telegramId));

    // Build referral list
    const referrals = await Promise.all(
      referralIds.map(async (inviteeIdStr) => {
        const inviteeId = parseInt(inviteeIdStr, 10);
        const inviteeState = await loadUserState(redis, inviteeId);

        return {
          inviteeId,
          inviteeUsername: null,
          inviteeFirstName: `Player ${inviteeIdStr.slice(-4)}`,
          pointsEarned: GAME_CONFIG.REFERRAL_BONUS_REFERRER,
          createdAt: inviteeState?.createdAt || new Date().toISOString(),
        };
      })
    );

    const totalReferrals = referrals.length;
    const totalPointsEarned = totalReferrals * GAME_CONFIG.REFERRAL_BONUS_REFERRER;

    const botUsername = getBotUsername(c.env);

    return c.json({
      success: true,
      data: {
        referralCode: state.referralCode,
        referralLink: `https://t.me/${botUsername}?start=${state.referralCode}`,
        totalReferrals,
        totalPointsEarned,
        referrals: referrals.slice(0, 50), // Limit to 50 most recent
      },
    });
  })

  // POST /referral/claim - Claim referral bonus
  .post('/claim', claimRateLimit, zValidator('json', ClaimReferralSchema), async (c) => {
    const { code } = c.req.valid('json');
    const telegramId = c.get('telegramId');
    const redis = createRedisClient(c.env);

    // Acquire lock to prevent race conditions during referral claiming
    const lockKey = `lock:referral:${telegramId}`;
    const lockAcquired = await redis.setnx(lockKey, '1', 30); // 30 second lock

    if (!lockAcquired) {
      return c.json(
        {
          success: false,
          error: 'Please wait, your previous request is being processed',
          code: 'REQUEST_IN_PROGRESS',
        },
        429
      );
    }

    try {
      // Get current user state
      const state = await getOrCreateUserState(redis, telegramId);

      // Check if user already has a referrer
      if (state.referredBy !== null) {
        await redis.del(lockKey); // Release lock
        return c.json(
          {
            success: false,
            error: 'You have already claimed a referral bonus',
            code: 'ALREADY_REFERRED',
          },
          400
        );
      }

      // Check if this is the user's own code
      if (state.referralCode.toUpperCase() === code.toUpperCase()) {
        await redis.del(lockKey); // Release lock
        return c.json(
          {
            success: false,
            error: 'Cannot use your own referral code',
            code: 'SELF_REFERRAL',
          },
          400
        );
      }

      // Look up referrer by code
      const referrerIdStr = await redis.get(REDIS_KEYS.referralCode(code.toUpperCase()));

      if (!referrerIdStr) {
        await redis.del(lockKey); // Release lock
        return c.json(
          {
            success: false,
            error: 'Invalid referral code',
            code: 'INVALID_CODE',
          },
          400
        );
      }

      const referrerId = parseInt(referrerIdStr, 10);
      if (isNaN(referrerId) || referrerId <= 0) {
        await redis.del(lockKey);
        console.error('[Referral] Invalid referrer ID in Redis:', referrerIdStr);
        return c.json(
          {
            success: false,
            error: 'Invalid referral code data',
            code: 'INVALID_CODE_DATA',
          },
          400
        );
      }

      // Verify referrer exists
      const referrerState = await loadUserState(redis, referrerId);
      if (!referrerState) {
        await redis.del(lockKey); // Release lock
        return c.json(
          {
            success: false,
            error: 'Referrer not found',
            code: 'REFERRER_NOT_FOUND',
          },
          400
        );
      }

      // Apply bonus points to both users
      const inviteeBonus = GAME_CONFIG.REFERRAL_BONUS_INVITEE;
      const referrerBonus = GAME_CONFIG.REFERRAL_BONUS_REFERRER;

      // Update invitee state
      const updatedInviteeState: UserGameState = {
        ...state,
        points: state.points + inviteeBonus,
        referredBy: String(referrerId),
      };
      await saveUserState(redis, telegramId, updatedInviteeState);

      // Update referrer state
      const updatedReferrerState: UserGameState = {
        ...referrerState,
        points: referrerState.points + referrerBonus,
      };
      await saveUserState(redis, referrerId, updatedReferrerState);

      // Add to referrer's referral list
      await redis.sadd(REDIS_KEYS.userReferrals(referrerId), String(telegramId));

      // Update leaderboards with bonus points
      await Promise.all([
        redis.zincrby(REDIS_KEYS.leaderboardGlobal, inviteeBonus, String(telegramId)),
        redis.zincrby(REDIS_KEYS.leaderboardGlobal, referrerBonus, String(referrerId)),
        // Team leaderboards if applicable
        state.team
          ? redis.zincrby(REDIS_KEYS.leaderboardTeam(state.team), inviteeBonus, String(telegramId))
          : Promise.resolve(0),
        referrerState.team
          ? redis.zincrby(
              REDIS_KEYS.leaderboardTeam(referrerState.team),
              referrerBonus,
              String(referrerId)
            )
          : Promise.resolve(0),
      ]);

      await redis.del(lockKey); // Release lock on success
      return c.json({
        success: true,
        data: {
          claimed: true,
          bonusPoints: inviteeBonus,
          referrerBonus,
        },
      });
    } catch (error) {
      await redis.del(lockKey); // Release lock on error
      console.error('[Referral] Error claiming referral:', error);
      return c.json(
        {
          success: false,
          error: 'Failed to claim referral',
          code: 'CLAIM_ERROR',
        },
        500
      );
    }
  })

  // GET /referral/code - Get my referral code
  .get('/code', async (c) => {
    const telegramId = c.get('telegramId');
    const redis = createRedisClient(c.env);

    const state = await getOrCreateUserState(redis, telegramId);
    const totalReferrals = await redis.scard(REDIS_KEYS.userReferrals(telegramId));
    const botUsername = getBotUsername(c.env);

    return c.json({
      success: true,
      data: {
        code: state.referralCode,
        link: `https://t.me/${botUsername}?start=${state.referralCode}`,
        totalReferrals,
      },
    });
  })

  // GET /referral/check/:code - Check if code is valid
  .get('/check/:code', zValidator('param', CodeParamSchema), async (c) => {
    const { code } = c.req.valid('param');
    const telegramId = c.get('telegramId');
    const redis = createRedisClient(c.env);

    // Check if code exists
    const ownerIdStr = await redis.get(REDIS_KEYS.referralCode(code.toUpperCase()));

    if (!ownerIdStr) {
      return c.json({
        success: true,
        data: {
          valid: false,
          canClaim: false,
          reason: 'Code does not exist',
        },
      });
    }

    const ownerId = parseInt(ownerIdStr, 10);
    if (isNaN(ownerId) || ownerId <= 0) {
      return c.json({
        success: true,
        data: {
          valid: false,
          canClaim: false,
          reason: 'Invalid code data',
        },
      });
    }

    // Check if it's the user's own code
    if (telegramId && ownerId === telegramId) {
      return c.json({
        success: true,
        data: {
          valid: true,
          canClaim: false,
          reason: 'Cannot use your own code',
        },
      });
    }

    // Check if user already has a referrer
    if (telegramId) {
      const state = await loadUserState(redis, telegramId);
      if (state?.referredBy !== null && state?.referredBy !== undefined) {
        return c.json({
          success: true,
          data: {
            valid: true,
            canClaim: false,
            reason: 'Already referred by someone',
          },
        });
      }
    }

    return c.json({
      success: true,
      data: {
        valid: true,
        canClaim: true,
      },
    });
  });
