import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Env, Variables } from '../types.js';
import { ENERGY, POINTS, calculateLevel } from '@app/config';
import { tapRateLimitMiddleware, tapIpRateLimitMiddleware } from '../middleware/index.js';
import {
  createRedisClient,
  REDIS_KEYS,
  saveUserState,
  getOrCreateUserState,
  getCurrentDateKey,
  getCurrentWeekKey,
  getCurrentMonthKey,
  type UserGameState,
} from '../lib/redis.js';
import { antiCheatCheck } from '../lib/anticheat.js';
import { getCurrentSeason, addSeasonPoints, createSeason, SEASON_CONFIG } from '../lib/seasons.js';

// Schemas
const TapRequestSchema = z.object({
  taps: z.number().int().min(1).max(100),
  nonce: z.string().uuid(),
});

const SyncRequestSchema = z.object({
  points: z.number().int().min(0),
  energy: z.number().int().min(0).max(2000),
  totalTaps: z.number().int().min(0),
  team: z.enum(['colla', 'camba', 'neutral']).nullable().optional(),
  department: z.string().nullable().optional(),
  currentStreak: z.number().int().min(0).optional(),
  lastPlayDate: z.string().nullable().optional(),
});

/**
 * Calculate streak based on dates
 */
function calculateStreak(
  lastPlayDate: string | null,
  currentStreak: number
): { newStreak: number; isNewDay: boolean } {
  const today = new Date().toISOString().split('T')[0]!;

  if (!lastPlayDate) {
    // First time playing
    return { newStreak: 1, isNewDay: true };
  }

  if (lastPlayDate === today) {
    // Already played today
    return { newStreak: currentStreak, isNewDay: false };
  }

  // Check if yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0]!;

  if (lastPlayDate === yesterdayStr) {
    // Consecutive day - increase streak
    return { newStreak: currentStreak + 1, isNewDay: true };
  }

  // Streak broken
  return { newStreak: 1, isNewDay: true };
}

/**
 * Calculate regenerated energy based on time elapsed
 */
function calculateRegeneratedEnergy(
  currentEnergy: number,
  maxEnergy: number,
  lastRefillTime: string
): { energy: number; lastRefill: string } {
  const now = Date.now();
  const lastRefill = new Date(lastRefillTime).getTime();

  // Validate lastRefill is a valid timestamp
  // Fix: Also reject timestamps in the future (clock drift, cheating)
  if (isNaN(lastRefill) || lastRefill <= 0 || lastRefill > now + 60000) {
    console.warn('[Game] Invalid lastRefillTime (NaN, negative, or >1min in future):', {
      lastRefillTime,
      now,
      diff: lastRefill - now
    });
    return {
      energy: currentEnergy,
      lastRefill: new Date().toISOString(),
    };
  }

  // Prevent negative elapsed time (clock drift, timezone issues)
  const elapsedMs = Math.max(0, now - lastRefill);
  const elapsedSeconds = Math.floor(elapsedMs / 1000);

  // Regenerate energy based on elapsed time
  const regenAmount = elapsedSeconds * ENERGY.REGEN_PER_SECOND;
  const newEnergy = Math.min(maxEnergy, currentEnergy + regenAmount);

  return {
    energy: newEnergy,
    lastRefill: new Date().toISOString(),
  };
}

/**
 * Validate nonce to prevent replay attacks
 * Uses atomic SETNX to prevent race conditions
 */
async function validateNonce(
  redis: ReturnType<typeof createRedisClient>,
  telegramId: number,
  nonce: string
): Promise<boolean> {
  const key = `${REDIS_KEYS.userNonces(telegramId)}:${nonce}`;

  // Atomic set-if-not-exists with 1-hour expiry
  // Returns true only if the key was set (nonce is new)
  // Returns false if key already existed (replay attack)
  const wasSet = await redis.setnx(key, '1', 3600);
  return wasSet;
}

// Router
export const gameRouter = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>()
  // POST /game/tap - Process taps
  // Both user-based and IP-based rate limiting to prevent multi-account abuse
  .post('/tap', tapIpRateLimitMiddleware, tapRateLimitMiddleware, zValidator('json', TapRequestSchema), async (c) => {
    const { taps, nonce } = c.req.valid('json');
    const telegramId = c.get('telegramId');

    const redis = createRedisClient(c.env);

    // Validate nonce (anti-replay)
    const isValidNonce = await validateNonce(redis, telegramId, nonce);
    if (!isValidNonce) {
      return c.json(
        {
          success: false,
          error: 'Nonce already used - possible replay attack',
          code: 'INVALID_NONCE',
        },
        400
      );
    }

    // Anti-cheat check (behavioral analysis)
    const userAgent = c.req.header('user-agent') || '';
    const antiCheat = await antiCheatCheck(redis, telegramId, taps, userAgent);
    if (!antiCheat.allowed) {
      return c.json(
        {
          success: false,
          error: antiCheat.reason || 'Access denied',
          code: 'ANTICHEAT_BLOCKED',
        },
        403
      );
    }

    // Get current user state
    const state = await getOrCreateUserState(redis, telegramId);

    // Calculate regenerated energy
    const { energy: currentEnergy, lastRefill } = calculateRegeneratedEnergy(
      state.energy,
      state.maxEnergy,
      state.lastEnergyRefill
    );

    // Check if user has enough energy
    const energyRequired = taps * ENERGY.TAP_COST;
    if (currentEnergy < energyRequired) {
      return c.json(
        {
          success: false,
          error: `Insufficient energy. Need ${energyRequired}, have ${currentEnergy}`,
          code: 'INSUFFICIENT_ENERGY',
        },
        400
      );
    }

    // Calculate points earned
    const pointsEarned = taps * state.tapPower * POINTS.PER_TAP;
    const newPoints = state.points + pointsEarned;
    const newEnergy = currentEnergy - energyRequired;
    const newTotalTaps = state.totalTaps + taps;

    // Check for level up
    const oldLevel = state.level;
    const newLevel = calculateLevel(newPoints);
    const levelUp = newLevel > oldLevel;

    // Calculate streak
    const { newStreak, isNewDay } = calculateStreak(
      state.lastPlayDate || null,
      state.streakDays
    );

    // Update state
    const today = new Date().toISOString().split('T')[0]!;
    const updatedState: UserGameState = {
      ...state,
      points: newPoints,
      energy: newEnergy,
      totalTaps: newTotalTaps,
      level: newLevel,
      streakDays: newStreak,
      lastPlayDate: today,
      lastTapAt: new Date().toISOString(),
      lastEnergyRefill: lastRefill,
    };

    // Save to Redis
    await saveUserState(redis, telegramId, updatedState);

    // Update leaderboards
    const dateKey = getCurrentDateKey();
    const weekKey = getCurrentWeekKey();
    const monthKey = getCurrentMonthKey();

    // Get or create current season
    let season = await getCurrentSeason(redis);
    if (!season) {
      season = await createSeason(redis, 1, 'Season 1: Genesis', new Date(), SEASON_CONFIG.BASE_PRIZE_POOL);
    }

    await Promise.all([
      // Global leaderboard (lifetime)
      redis.zincrby(REDIS_KEYS.leaderboardGlobal, pointsEarned, String(telegramId)),
      // Daily leaderboard
      redis.zincrby(REDIS_KEYS.leaderboardDaily(dateKey), pointsEarned, String(telegramId)),
      // Weekly leaderboard
      redis.zincrby(REDIS_KEYS.leaderboardWeekly(weekKey), pointsEarned, String(telegramId)),
      // Monthly leaderboard
      redis.zincrby(REDIS_KEYS.leaderboardMonthly(monthKey), pointsEarned, String(telegramId)),
      // Team leaderboard (if user has a team)
      state.team
        ? redis.zincrby(REDIS_KEYS.leaderboardTeam(state.team), pointsEarned, String(telegramId))
        : Promise.resolve(0),
      // Department leaderboard (if user has a department)
      state.department
        ? redis.zincrby(
            REDIS_KEYS.leaderboardDepartment(state.department),
            pointsEarned,
            String(telegramId)
          )
        : Promise.resolve(0),
      // Season leaderboard (for current season)
      addSeasonPoints(redis, season.id, telegramId, pointsEarned, state.team, state.department),
    ]);

    return c.json({
      success: true,
      data: {
        pointsEarned,
        score: newPoints,
        energy: newEnergy,
        maxEnergy: state.maxEnergy,
        level: newLevel,
        leveledUp: levelUp,
        streakDays: newStreak,
        isNewDay,
      },
    });
  })

  // GET /game/state - Get game state
  .get('/state', async (c) => {
    const telegramId = c.get('telegramId');

    const redis = createRedisClient(c.env);
    const state = await getOrCreateUserState(redis, telegramId);

    // Calculate regenerated energy
    const { energy } = calculateRegeneratedEnergy(
      state.energy,
      state.maxEnergy,
      state.lastEnergyRefill
    );

    return c.json({
      success: true,
      data: {
        points: state.points,
        energy,
        maxEnergy: state.maxEnergy,
        tapPower: state.tapPower,
        level: state.level,
        totalTaps: state.totalTaps,
        streakDays: state.streakDays,
        lastPlayDate: state.lastPlayDate,
        lastTapAt: state.lastTapAt,
        team: state.team,
        department: state.department,
      },
    });
  })

  // POST /game/sync - Sync CloudStorage data
  .post('/sync', zValidator('json', SyncRequestSchema), async (c) => {
    const { points, energy, totalTaps, team, department, currentStreak, lastPlayDate } =
      c.req.valid('json');
    const telegramId = c.get('telegramId');

    const redis = createRedisClient(c.env);
    const currentState = await getOrCreateUserState(redis, telegramId);

    // Calculate server-side streak (source of truth)
    const clientLastPlay = lastPlayDate || currentState.lastPlayDate;
    const { newStreak } = calculateStreak(
      clientLastPlay,
      currentStreak ?? currentState.streakDays
    );

    // Only sync if CloudStorage has more progress
    // This prevents data loss and cheating
    const shouldSync =
      points > currentState.points ||
      totalTaps > currentState.totalTaps ||
      (team && !currentState.team) ||
      (department && !currentState.department) ||
      lastPlayDate;

    if (!shouldSync) {
      return c.json({
        success: true,
        data: {
          synced: false,
          state: {
            points: currentState.points,
            energy: currentState.energy,
            maxEnergy: currentState.maxEnergy,
            tapPower: currentState.tapPower,
            level: currentState.level,
            totalTaps: currentState.totalTaps,
            streakDays: currentState.streakDays,
            lastPlayDate: currentState.lastPlayDate,
            lastTapAt: currentState.lastTapAt,
            team: currentState.team,
            department: currentState.department,
          },
        },
      });
    }

    const today = new Date().toISOString().split('T')[0]!;

    // Update state with CloudStorage data
    const updatedState: UserGameState = {
      ...currentState,
      points: Math.max(points, currentState.points),
      energy: Math.min(energy, currentState.maxEnergy),
      totalTaps: Math.max(totalTaps, currentState.totalTaps),
      level: calculateLevel(Math.max(points, currentState.points)),
      team: team ?? currentState.team,
      department: department ?? currentState.department,
      streakDays: newStreak,
      lastPlayDate: lastPlayDate ?? today,
    };

    await saveUserState(redis, telegramId, updatedState);

    // Update leaderboards with new total
    if (updatedState.points > currentState.points) {
      const diff = updatedState.points - currentState.points;
      await redis.zincrby(REDIS_KEYS.leaderboardGlobal, diff, String(telegramId));
    }

    // Handle team leaderboard - add/update when team changes or points increase
    const teamChanged = team && team !== currentState.team;
    if (updatedState.team) {
      if (teamChanged) {
        // Remove from old team leaderboard if exists
        if (currentState.team && currentState.team !== updatedState.team) {
          await redis.zrem(REDIS_KEYS.leaderboardTeam(currentState.team), String(telegramId));
        }
        // Add to new team leaderboard with full points
        await redis.zadd(
          REDIS_KEYS.leaderboardTeam(updatedState.team),
          updatedState.points,
          String(telegramId)
        );
      } else if (updatedState.points > currentState.points) {
        // Same team, just update points
        const diff = updatedState.points - currentState.points;
        await redis.zincrby(
          REDIS_KEYS.leaderboardTeam(updatedState.team),
          diff,
          String(telegramId)
        );
      }
    }

    // Handle department leaderboard - add/update when department changes or points increase
    const deptChanged = department && department !== currentState.department;
    if (updatedState.department) {
      if (deptChanged) {
        // Remove from old department leaderboard if exists
        if (currentState.department && currentState.department !== updatedState.department) {
          await redis.zrem(REDIS_KEYS.leaderboardDepartment(currentState.department), String(telegramId));
        }
        // Add to new department leaderboard with full points
        await redis.zadd(
          REDIS_KEYS.leaderboardDepartment(updatedState.department),
          updatedState.points,
          String(telegramId)
        );
      } else if (updatedState.points > currentState.points) {
        // Same department, just update points
        const diff = updatedState.points - currentState.points;
        await redis.zincrby(
          REDIS_KEYS.leaderboardDepartment(updatedState.department),
          diff,
          String(telegramId)
        );
      }
    }

    return c.json({
      success: true,
      data: {
        synced: true,
        state: {
          points: updatedState.points,
          energy: updatedState.energy,
          maxEnergy: updatedState.maxEnergy,
          tapPower: updatedState.tapPower,
          level: updatedState.level,
          totalTaps: updatedState.totalTaps,
          streakDays: updatedState.streakDays,
          lastPlayDate: updatedState.lastPlayDate,
          lastTapAt: updatedState.lastTapAt,
          team: updatedState.team,
          department: updatedState.department,
        },
      },
    });
  });
