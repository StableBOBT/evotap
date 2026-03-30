import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Env, Variables } from '../types.js';

/**
 * Referral bonus points (must match bot)
 */
const REFERRAL_BONUS_POINTS = 5000;

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

/**
 * Calculate level from points
 */
function calculateLevel(points: number): number {
  // Simple level calculation: level = sqrt(points / 1000) + 1
  return Math.floor(Math.sqrt(points / 1000)) + 1;
}

/**
 * Calculate points needed for next level
 */
function calculateNextLevelPoints(level: number): number {
  return Math.pow(level, 2) * 1000;
}

// Router
export const botRouter = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>()
  // POST /bot/referral/claim - Claim referral for new user
  .post('/referral/claim', zValidator('json', ClaimReferralRequestSchema), async (c) => {
    const { referralCode, newUser: _newUser } = c.req.valid('json');

    // TODO: Implement with real database
    // 1. Check if referral code exists
    // 2. Check if new user already has a referrer
    // 3. Check if referrer is not the same as new user
    // 4. Create referral record
    // 5. Award points to both users

    // Mock validation
    const isValidCode = referralCode.length >= 6;
    const codeNotOwn = true; // Would check if code belongs to new user

    if (!isValidCode) {
      return c.json(
        {
          success: false,
          error: 'Invalid referral code',
          code: 'INVALID_CODE',
        },
        400
      );
    }

    if (!codeNotOwn) {
      return c.json(
        {
          success: false,
          error: 'Cannot use your own referral code',
          code: 'SELF_REFERRAL',
        },
        400
      );
    }

    // TODO: Check if user already exists and has referrer
    // For now, simulate success
    return c.json({
      success: true,
      data: {
        claimed: true,
        bonusPoints: REFERRAL_BONUS_POINTS,
        referrerName: 'EVO Player', // Would fetch from DB
        message: `Welcome! You and your referrer each received ${REFERRAL_BONUS_POINTS} points!`,
      },
    });
  })

  // GET /bot/user/:telegramId/stats - Get user stats
  .get('/user/:telegramId/stats', zValidator('param', TelegramIdParamSchema), async (c) => {
    const { telegramId: _telegramId } = c.req.valid('param');

    // TODO: Fetch from database
    // Mock data for now
    const points = 5000;
    const level = calculateLevel(points);

    return c.json({
      success: true,
      data: {
        points,
        level,
        rank: 150,
        totalTaps: points,
        referralCount: 5,
        referralPoints: 25000,
        streak: 3,
        nextLevelPoints: calculateNextLevelPoints(level),
      },
    });
  })

  // GET /bot/user/:telegramId/referral - Get user referral info
  .get('/user/:telegramId/referral', zValidator('param', TelegramIdParamSchema), async (c) => {
    const { telegramId } = c.req.valid('param');

    // TODO: Fetch from database
    // Generate consistent code for demo (would be stored in DB)
    const referralCode = `EVO${String(telegramId).slice(-5).padStart(5, '0')}`;

    return c.json({
      success: true,
      data: {
        referralCode,
        referralLink: `https://t.me/EVOtapBot?start=REF_${referralCode}`,
        totalReferrals: 5,
        totalPointsEarned: 25000,
      },
    });
  })

  // GET /bot/stats/players - Get total player count
  .get('/stats/players', async (c) => {
    // TODO: Fetch from database
    // Mock data for now
    return c.json({
      success: true,
      data: {
        totalPlayers: 127500,
      },
    });
  })

  // POST /bot/user/ensure - Ensure user exists
  .post('/user/ensure', zValidator('json', EnsureUserRequestSchema), async (c) => {
    const userData = c.req.valid('json');

    // TODO: Implement with real database
    // 1. Check if user exists
    // 2. If not, create user with generated referral code
    // 3. Return whether user was created

    // Generate referral code for user
    const referralCode = `EVO${String(userData.telegramId).slice(-5).padStart(5, '0')}`;

    // Mock: assume user is new
    return c.json({
      success: true,
      data: {
        created: true,
        referralCode,
      },
    });
  });
