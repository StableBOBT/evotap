import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Env, Variables } from '../types.js';
import { DEPARTMENTS, type DepartmentCode, type TeamType } from '../types.js';
import { optionalAuthMiddleware } from '../middleware/index.js';
import {
  createRedisClient,
  REDIS_KEYS,
  loadUserState,
  getCurrentDateKey,
  getCurrentWeekKey,
  getCurrentMonthKey,
} from '../lib/redis.js';

// Query schemas
const LeaderboardQuerySchema = z.object({
  period: z.enum(['global', 'daily', 'weekly', 'monthly']).default('global'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const TeamParamSchema = z.object({
  team: z.enum(['colla', 'camba', 'neutral']),
});

const DeptParamSchema = z.object({
  dept: z.enum(['LP', 'SC', 'CB', 'OR', 'PT', 'CH', 'TJ', 'BE', 'PA']),
});

/**
 * Get the Redis key for a leaderboard based on period
 */
function getLeaderboardKey(period: string): string {
  switch (period) {
    case 'daily':
      return REDIS_KEYS.leaderboardDaily(getCurrentDateKey());
    case 'weekly':
      return REDIS_KEYS.leaderboardWeekly(getCurrentWeekKey());
    case 'monthly':
      return REDIS_KEYS.leaderboardMonthly(getCurrentMonthKey());
    default:
      return REDIS_KEYS.leaderboardGlobal;
  }
}

/**
 * Parse leaderboard entries from Redis ZREVRANGE result
 * PRIVACY: No personal data, only rank and points
 */
interface LeaderboardEntry {
  rank: number;
  points: number;
  isCurrentUser?: boolean;
  team?: string;
}

async function parseLeaderboardEntries(
  redis: ReturnType<typeof createRedisClient>,
  results: string[],
  startRank: number,
  currentUserId?: number
): Promise<LeaderboardEntry[]> {
  const entries: LeaderboardEntry[] = [];

  // Results come as [member1, score1, member2, score2, ...]
  for (let i = 0; i < results.length; i += 2) {
    const memberStr = results[i];
    const scoreStr = results[i + 1];

    if (!memberStr || !scoreStr) continue;

    const telegramId = parseInt(memberStr, 10);
    const score = parseFloat(scoreStr);
    const rank = startRank + i / 2 + 1;

    // Load user state for team info only
    const userState = await loadUserState(redis, telegramId);

    entries.push({
      rank,
      points: Math.floor(score),
      isCurrentUser: currentUserId === telegramId,
      team: userState?.team || undefined,
    });
  }

  return entries;
}

// Router
export const leaderboardRouter = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>()
  // Apply optional auth to all routes
  .use('*', optionalAuthMiddleware)

  // GET /leaderboard - Get top players
  .get('/', zValidator('query', LeaderboardQuerySchema), async (c) => {
    const { period, limit, offset } = c.req.valid('query');
    const telegramId = c.get('telegramId');

    const redis = createRedisClient(c.env);
    const key = getLeaderboardKey(period);

    // Get entries with scores
    const results = await redis.zrevrange(key, offset, offset + limit - 1, true);

    // Parse entries
    const entries = await parseLeaderboardEntries(redis, results, offset, telegramId);

    // Get total count
    const total = await redis.zcard(key);

    // Get user rank if authenticated
    let userRank: number | null = null;
    let userScore: number | null = null;

    if (telegramId) {
      const rank = await redis.zrevrank(key, String(telegramId));
      if (rank !== null) {
        userRank = rank + 1;
        const score = await redis.zscore(key, String(telegramId));
        userScore = score ? Math.floor(score) : null;
      }
    }

    return c.json({
      success: true,
      data: {
        entries,
        total,
        userRank,
        userScore,
        period,
      },
    });
  })

  // GET /leaderboard/around-me - Get around user
  .get('/around-me', async (c) => {
    const telegramId = c.get('telegramId');
    const period = (c.req.query('period') || 'global') as string;
    const count = parseInt(c.req.query('count') || '5', 10);

    if (!telegramId) {
      return c.json({
        success: true,
        data: {
          entries: [],
          total: 0,
          userRank: null,
          userScore: null,
        },
      });
    }

    const redis = createRedisClient(c.env);
    const key = getLeaderboardKey(period);

    // Get user's rank
    const userRank = await redis.zrevrank(key, String(telegramId));

    if (userRank === null) {
      return c.json({
        success: true,
        data: {
          entries: [],
          total: await redis.zcard(key),
          userRank: null,
          userScore: null,
        },
      });
    }

    // Get entries around user
    const start = Math.max(0, userRank - count);
    const stop = userRank + count;
    const results = await redis.zrevrange(key, start, stop, true);

    // Parse entries
    const entries = await parseLeaderboardEntries(redis, results, start, telegramId);

    // Get user score
    const userScore = (await redis.zscore(key, String(telegramId))) || 0;
    const total = await redis.zcard(key);

    return c.json({
      success: true,
      data: {
        entries,
        total,
        userRank: userRank + 1,
        userScore: Math.floor(userScore),
      },
    });
  })

  // GET /leaderboard/team/:team - Get team leaderboard
  .get('/team/:team', zValidator('param', TeamParamSchema), async (c) => {
    const { team } = c.req.valid('param');
    const limit = parseInt(c.req.query('limit') || '50', 10);
    const offset = parseInt(c.req.query('offset') || '0', 10);
    const telegramId = c.get('telegramId');

    const redis = createRedisClient(c.env);
    const key = REDIS_KEYS.leaderboardTeam(team);

    // Get entries with scores
    const results = await redis.zrevrange(key, offset, offset + limit - 1, true);

    // Parse entries
    const entries = await parseLeaderboardEntries(redis, results, offset, telegramId);

    // Get total count and total score
    const total = await redis.zcard(key);

    // Calculate total team score (sum of all scores)
    const topScores = await redis.zrevrange(key, 0, 999, true);
    let teamTotalScore = 0;
    for (let i = 1; i < topScores.length; i += 2) {
      const scoreStr = topScores[i];
      if (scoreStr) {
        teamTotalScore += parseFloat(scoreStr);
      }
    }

    // Get user rank in team
    let userRank: number | null = null;
    if (telegramId) {
      const rank = await redis.zrevrank(key, String(telegramId));
      if (rank !== null) {
        userRank = rank + 1;
      }
    }

    return c.json({
      success: true,
      data: {
        team: team as TeamType,
        entries,
        total,
        teamTotalScore: Math.floor(teamTotalScore),
        userRank,
      },
    });
  })

  // GET /leaderboard/department/:dept - Get department leaderboard
  .get('/department/:dept', zValidator('param', DeptParamSchema), async (c) => {
    const { dept } = c.req.valid('param');
    const limit = parseInt(c.req.query('limit') || '50', 10);
    const offset = parseInt(c.req.query('offset') || '0', 10);
    const telegramId = c.get('telegramId');

    const redis = createRedisClient(c.env);
    const key = REDIS_KEYS.leaderboardDepartment(dept);

    // Get entries with scores
    const results = await redis.zrevrange(key, offset, offset + limit - 1, true);

    // Parse entries
    const entries = await parseLeaderboardEntries(redis, results, offset, telegramId);

    // Get total count
    const total = await redis.zcard(key);

    // Calculate total department score
    const topScores = await redis.zrevrange(key, 0, 999, true);
    let deptTotalScore = 0;
    for (let i = 1; i < topScores.length; i += 2) {
      const scoreStr = topScores[i];
      if (scoreStr) {
        deptTotalScore += parseFloat(scoreStr);
      }
    }

    // Get user rank in department
    let userRank: number | null = null;
    if (telegramId) {
      const rank = await redis.zrevrank(key, String(telegramId));
      if (rank !== null) {
        userRank = rank + 1;
      }
    }

    const deptInfo = DEPARTMENTS[dept as DepartmentCode];

    return c.json({
      success: true,
      data: {
        department: dept,
        departmentName: deptInfo?.name || dept,
        entries,
        total,
        departmentTotalScore: Math.floor(deptTotalScore),
        userRank,
      },
    });
  })

  // GET /leaderboard/teams - Get team standings
  .get('/teams', async (c) => {
    const redis = createRedisClient(c.env);
    const teams: TeamType[] = ['colla', 'camba', 'neutral'];

    const teamStats = await Promise.all(
      teams.map(async (team) => {
        const key = REDIS_KEYS.leaderboardTeam(team);

        // Get player count
        const playerCount = await redis.zcard(key);

        // Calculate total score
        const topScores = await redis.zrevrange(key, 0, 999, true);
        let totalScore = 0;
        for (let i = 1; i < topScores.length; i += 2) {
          const scoreStr = topScores[i];
          if (scoreStr) {
            totalScore += parseFloat(scoreStr);
          }
        }

        return {
          team,
          totalScore: Math.floor(totalScore),
          playerCount,
          avgScore: playerCount > 0 ? Math.floor(totalScore / playerCount) : 0,
        };
      })
    );

    // Sort by total score descending
    teamStats.sort((a, b) => b.totalScore - a.totalScore);

    return c.json({
      success: true,
      data: {
        teams: teamStats,
      },
    });
  });
