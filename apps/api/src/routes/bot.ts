import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Env, Variables } from '../types.js';
import { REFERRAL, calculateLevel, pointsToNextLevel, generateReferralCode } from '@app/config';
import {
  createRedisClient,
  REDIS_KEYS,
  getOrCreateUserState,
  saveUserState,
  type UserGameState,
} from '../lib/redis.js';

// Schemas
const TelegramUserSchema = z.object({
  telegramId: z.number(),
  firstName: z.string(),
  lastName: z.string().optional(),
  username: z.string().optional(),
  languageCode: z.string().optional(),
  isPremium: z.boolean().default(false),
});

const ClaimReferralRequestSchema = z.object({
  referralCode: z.string().min(1),
  newUser: TelegramUserSchema,
});

const TelegramIdParamSchema = z.object({
  telegramId: z.coerce.number(),
});

const EnsureUserRequestSchema = TelegramUserSchema;

// Router
export const botRouter = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>()
  // POST /bot/referral/claim - Claim referral for new user
  .post('/referral/claim', zValidator('json', ClaimReferralRequestSchema), async (c) => {
    const { referralCode, newUser } = c.req.valid('json');
    const redis = createRedisClient(c.env);

    try {
      // Check if new user already exists and has a referrer
      const newUserState = await getOrCreateUserState(redis, newUser.telegramId);

      if (newUserState.referredBy) {
        return c.json({
          success: true,
          data: {
            claimed: false,
            bonusPoints: 0,
            message: 'You already have a referrer',
          },
        });
      }

      // Find referrer by code (search through users)
      // For efficiency, we store referral codes in a separate hash
      const referrerIdStr = await redis.get(REDIS_KEYS.referralCode(referralCode));

      if (!referrerIdStr) {
        return c.json({
          success: false,
          error: 'Invalid referral code',
          code: 'INVALID_CODE',
        }, 400);
      }

      const referrerId = parseInt(referrerIdStr);

      // Prevent self-referral
      if (referrerId === newUser.telegramId) {
        return c.json({
          success: false,
          error: 'Cannot use your own referral code',
          code: 'SELF_REFERRAL',
        }, 400);
      }

      // Get referrer state
      const referrerState = await getOrCreateUserState(redis, referrerId);

      // Update new user with referrer
      const updatedNewUserState: UserGameState = {
        ...newUserState,
        referredBy: String(referrerId),
        points: newUserState.points + REFERRAL.BONUS_POINTS,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        username: newUser.username,
        isPremium: newUser.isPremium,
      };
      await saveUserState(redis, newUser.telegramId, updatedNewUserState);

      // Update referrer points and count
      const updatedReferrerState: UserGameState = {
        ...referrerState,
        points: referrerState.points + REFERRAL.BONUS_POINTS,
        referralCount: (referrerState.referralCount || 0) + 1,
      };
      await saveUserState(redis, referrerId, updatedReferrerState);

      // Update leaderboards
      await Promise.all([
        redis.zincrby(REDIS_KEYS.leaderboardGlobal, REFERRAL.BONUS_POINTS, String(newUser.telegramId)),
        redis.zincrby(REDIS_KEYS.leaderboardGlobal, REFERRAL.BONUS_POINTS, String(referrerId)),
      ]);

      return c.json({
        success: true,
        data: {
          claimed: true,
          bonusPoints: REFERRAL.BONUS_POINTS,
          referrerName: referrerState.firstName || 'a friend',
          message: `Welcome! You and your referrer each received ${REFERRAL.BONUS_POINTS} points!`,
        },
      });
    } catch (error) {
      console.error('[Bot] Referral claim error:', error);
      return c.json({
        success: false,
        error: 'Failed to process referral',
        code: 'REFERRAL_ERROR',
      }, 500);
    }
  })

  // GET /bot/user/:telegramId/stats - Get user stats
  .get('/user/:telegramId/stats', zValidator('param', TelegramIdParamSchema), async (c) => {
    const { telegramId } = c.req.valid('param');
    const redis = createRedisClient(c.env);

    try {
      const state = await getOrCreateUserState(redis, telegramId);

      // Get user rank
      const rank = await redis.zrevrank(REDIS_KEYS.leaderboardGlobal, String(telegramId));

      return c.json({
        success: true,
        data: {
          points: state.points,
          level: state.level,
          rank: rank !== null ? rank + 1 : null,
          totalTaps: state.totalTaps,
          referralCount: state.referralCount || 0,
          referralPoints: (state.referralCount || 0) * REFERRAL.BONUS_POINTS,
          streak: state.streakDays,
          nextLevelPoints: pointsToNextLevel(state.points),
        },
      });
    } catch (error) {
      console.error('[Bot] Get stats error:', error);
      return c.json({
        success: false,
        error: 'Failed to get stats',
        code: 'STATS_ERROR',
      }, 500);
    }
  })

  // GET /bot/user/:telegramId/referral - Get user referral info
  .get('/user/:telegramId/referral', zValidator('param', TelegramIdParamSchema), async (c) => {
    const { telegramId } = c.req.valid('param');
    const redis = createRedisClient(c.env);

    try {
      const state = await getOrCreateUserState(redis, telegramId);

      // Generate or get referral code
      let referralCode = state.referralCode;
      if (!referralCode) {
        referralCode = generateReferralCode(telegramId);
        // Store the code mapping
        await redis.set(REDIS_KEYS.referralCode(referralCode), String(telegramId));
        // Update user state
        await saveUserState(redis, telegramId, { ...state, referralCode });
      }

      return c.json({
        success: true,
        data: {
          referralCode,
          referralLink: `https://t.me/evoliviabot?start=REF_${referralCode}`,
          totalReferrals: state.referralCount || 0,
          totalPointsEarned: (state.referralCount || 0) * REFERRAL.BONUS_POINTS,
        },
      });
    } catch (error) {
      console.error('[Bot] Get referral error:', error);
      return c.json({
        success: false,
        error: 'Failed to get referral info',
        code: 'REFERRAL_ERROR',
      }, 500);
    }
  })

  // GET /bot/stats/players - Get total player count
  .get('/stats/players', async (c) => {
    const redis = createRedisClient(c.env);

    try {
      const totalPlayers = await redis.zcard(REDIS_KEYS.leaderboardGlobal);

      return c.json({
        success: true,
        data: {
          totalPlayers: totalPlayers || 0,
        },
      });
    } catch (error) {
      console.error('[Bot] Get player count error:', error);
      return c.json({
        success: true,
        data: {
          totalPlayers: 0,
        },
      });
    }
  })

  // POST /bot/user/ensure - Ensure user exists
  .post('/user/ensure', zValidator('json', EnsureUserRequestSchema), async (c) => {
    const userData = c.req.valid('json');
    const redis = createRedisClient(c.env);

    try {
      // Check if user exists
      const existingState = await redis.hgetall(REDIS_KEYS.userState(userData.telegramId));
      const isNew = !existingState || Object.keys(existingState).length === 0;

      // Get or create user state
      const state = await getOrCreateUserState(redis, userData.telegramId);

      // Generate referral code if not exists
      let referralCode = state.referralCode;
      if (!referralCode) {
        referralCode = generateReferralCode(userData.telegramId);
        await redis.set(REDIS_KEYS.referralCode(referralCode), String(userData.telegramId));
      }

      // Update user info
      const updatedState: UserGameState = {
        ...state,
        firstName: userData.firstName,
        lastName: userData.lastName,
        username: userData.username,
        isPremium: userData.isPremium,
        referralCode,
      };
      await saveUserState(redis, userData.telegramId, updatedState);

      // Always ensure user is in leaderboard
      const existsInLeaderboard = await redis.zscore(REDIS_KEYS.leaderboardGlobal, String(userData.telegramId));
      if (existsInLeaderboard === null) {
        await redis.zadd(REDIS_KEYS.leaderboardGlobal, state.points, String(userData.telegramId));
      }

      return c.json({
        success: true,
        data: {
          created: isNew,
          referralCode,
        },
      });
    } catch (error) {
      console.error('[Bot] Ensure user error:', error);
      return c.json({
        success: false,
        error: 'Failed to ensure user',
        code: 'USER_ERROR',
      }, 500);
    }
  });
