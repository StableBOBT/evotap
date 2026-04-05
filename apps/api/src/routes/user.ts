import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Env, Variables } from '../types.js';
import { walletRateLimit } from '../middleware/index.js';
import {
  createRedisClient,
  REDIS_KEYS,
  saveUserState,
  getOrCreateUserState,
  type UserGameState,
} from '../lib/redis.js';

// Schemas
const ConnectWalletSchema = z.object({
  walletAddress: z.string().min(48).max(66),
});

const UpdateProfileSchema = z.object({
  team: z.enum(['colla', 'camba', 'neutral']).optional(),
  department: z.enum(['LP', 'SC', 'CB', 'OR', 'PT', 'CH', 'TJ', 'BE', 'PA']).optional(),
});

/**
 * Validate TON wallet address format
 * TON addresses are either:
 * - Raw format: 64 hex chars (workchain + account)
 * - User-friendly format: base64url encoded, 48 chars
 *   - First char indicates: E/U = mainnet, k/0 = testnet
 *   - Second char: Q = bounceable, q = non-bounceable (rare)
 *   - Contains embedded CRC16 checksum (last 2 bytes)
 */
function isValidTonAddress(address: string): { valid: boolean; reason?: string } {
  if (!address || typeof address !== 'string') {
    return { valid: false, reason: 'Address is required' };
  }

  // Trim whitespace
  const trimmed = address.trim();

  // Raw format: exactly 64 hex characters
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return { valid: true };
  }

  // User-friendly format validation (strict)
  // First char: E (mainnet bounceable), U (mainnet non-bounceable),
  //             k (testnet bounceable), 0 (testnet non-bounceable)
  // Second char: Q (uppercase confirms format)
  // Total length: exactly 48 chars
  // Charset: base64url (A-Z, a-z, 0-9, _, -)
  if (!/^[EUk0]Q[A-Za-z0-9_-]{46}$/.test(trimmed)) {
    // Check for common mistakes
    if (trimmed.startsWith('0x')) {
      return { valid: false, reason: 'Ethereum address format not supported' };
    }
    if (trimmed.length < 48) {
      return { valid: false, reason: 'Address too short' };
    }
    if (trimmed.length > 66) {
      return { valid: false, reason: 'Address too long' };
    }
    return { valid: false, reason: 'Invalid TON address format' };
  }

  // Additional validation: check for obviously invalid base64url patterns
  // (e.g., all zeros or all same character is suspicious)
  const body = trimmed.slice(2);
  const uniqueChars = new Set(body).size;
  if (uniqueChars < 5) {
    return { valid: false, reason: 'Address appears to be invalid (low entropy)' };
  }

  return { valid: true };
}

/**
 * Simple validation wrapper for boolean result
 */
function isValidTonAddressSimple(address: string): boolean {
  return isValidTonAddress(address).valid;
}

// Router
export const userRouter = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>()
  // GET /user/me - Get current user
  .get('/me', async (c) => {
    const user = c.get('user');
    const telegramId = c.get('telegramId');

    const redis = createRedisClient(c.env);
    const state = await getOrCreateUserState(redis, telegramId);

    return c.json({
      success: true,
      data: {
        telegramId,
        firstName: user.firstName,
        lastName: user.lastName ?? null,
        username: user.username ?? null,
        languageCode: user.languageCode ?? null,
        isPremium: user.isPremium ?? false,
        referralCode: state.referralCode,
        walletAddress: state.walletAddress,
        team: state.team,
        department: state.department,
        createdAt: state.createdAt,
      },
    });
  })

  // GET /user/me/stats - Get user stats
  .get('/me/stats', async (c) => {
    const telegramId = c.get('telegramId');

    const redis = createRedisClient(c.env);
    const state = await getOrCreateUserState(redis, telegramId);

    // Get rank from global leaderboard
    const rank = await redis.zrevrank(REDIS_KEYS.leaderboardGlobal, String(telegramId));

    // Get referral count
    const referralCount = await redis.scard(REDIS_KEYS.userReferrals(telegramId));

    return c.json({
      success: true,
      data: {
        points: state.points,
        level: state.level,
        rank: rank !== null ? rank + 1 : null,
        totalTaps: state.totalTaps,
        referralCount,
        referralPoints: referralCount * 5000, // REFERRAL_BONUS_REFERRER
        streakDays: state.streakDays,
        team: state.team,
        department: state.department,
      },
    });
  })

  // POST /user/me/wallet - Connect wallet
  .post('/me/wallet', walletRateLimit, zValidator('json', ConnectWalletSchema), async (c) => {
    const { walletAddress } = c.req.valid('json');
    const telegramId = c.get('telegramId');

    // Validate TON address format
    const validation = isValidTonAddress(walletAddress);
    if (!validation.valid) {
      return c.json(
        {
          success: false,
          error: validation.reason || 'Invalid TON wallet address format',
          code: 'INVALID_WALLET_ADDRESS',
        },
        400
      );
    }

    const redis = createRedisClient(c.env);
    const state = await getOrCreateUserState(redis, telegramId);

    // Update wallet address
    const updatedState: UserGameState = {
      ...state,
      walletAddress,
    };
    await saveUserState(redis, telegramId, updatedState);

    return c.json({
      success: true,
      data: {
        walletAddress,
        connected: true,
      },
    });
  })

  // DELETE /user/me/wallet - Disconnect wallet
  .delete('/me/wallet', async (c) => {
    const telegramId = c.get('telegramId');

    const redis = createRedisClient(c.env);
    const state = await getOrCreateUserState(redis, telegramId);

    // Remove wallet address
    const updatedState: UserGameState = {
      ...state,
      walletAddress: null,
    };
    await saveUserState(redis, telegramId, updatedState);

    return c.json({
      success: true,
      data: {
        disconnected: true,
      },
    });
  })

  // PATCH /user/me - Update profile
  .patch('/me', zValidator('json', UpdateProfileSchema), async (c) => {
    const { team, department } = c.req.valid('json');
    const telegramId = c.get('telegramId');

    const redis = createRedisClient(c.env);
    const state = await getOrCreateUserState(redis, telegramId);

    // Track old values for leaderboard updates
    const oldTeam = state.team;
    const oldDepartment = state.department;

    // Update state
    const updatedState: UserGameState = {
      ...state,
      team: team ?? state.team,
      department: department ?? state.department,
    };
    await saveUserState(redis, telegramId, updatedState);

    // Update team leaderboards if team changed
    if (team && team !== oldTeam) {
      // Remove from old team leaderboard
      if (oldTeam) {
        await redis.zrem(REDIS_KEYS.leaderboardTeam(oldTeam), String(telegramId));
      }
      // Add to new team leaderboard with current points
      await redis.zadd(REDIS_KEYS.leaderboardTeam(team), state.points, String(telegramId));
    }

    // Update department leaderboards if department changed
    if (department && department !== oldDepartment) {
      // Remove from old department leaderboard
      if (oldDepartment) {
        await redis.zrem(REDIS_KEYS.leaderboardDepartment(oldDepartment), String(telegramId));
      }
      // Add to new department leaderboard with current points
      await redis.zadd(
        REDIS_KEYS.leaderboardDepartment(department),
        state.points,
        String(telegramId)
      );
    }

    return c.json({
      success: true,
      data: {
        updated: true,
        team: updatedState.team,
        department: updatedState.department,
      },
    });
  });
