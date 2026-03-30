/**
 * Leaderboard using Redis Sorted Sets
 * Provides efficient ranking and score management
 */

import type { Redis } from '@upstash/redis';
import type {
  LeaderboardEntry,
  LeaderboardEntryWithMetadata,
  LeaderboardMetadata,
  UserRank,
  DepartmentCode,
} from './types.js';

export type { LeaderboardEntry, UserRank };

export interface Leaderboard {
  /** Set user's score (replaces existing) */
  setScore(userId: string, score: number): Promise<void>;
  /** Add score with metadata */
  addScore(userId: string, score: number, metadata?: LeaderboardMetadata): Promise<void>;
  /** Increment user's score */
  incrementScore(userId: string, increment: number): Promise<number>;
  /** Get user's rank and score */
  getRank(userId: string): Promise<UserRank | null>;
  /** Alias for getRank */
  getPlayerRank(userId: string): Promise<UserRank | null>;
  /** Get top N users */
  getTop(count: number): Promise<LeaderboardEntry[]>;
  /** Get top players with offset for pagination */
  getTopPlayers(limit: number, offset?: number): Promise<LeaderboardEntryWithMetadata[]>;
  /** Get users around a specific user */
  getAroundUser(userId: string, count: number): Promise<LeaderboardEntry[]>;
  /** Get total number of users */
  getTotalUsers(): Promise<number>;
  /** Remove user from leaderboard */
  removeUser(userId: string): Promise<boolean>;
}

const DEFAULT_KEY = 'leaderboard:global';
const METADATA_PREFIX = 'leaderboard:meta:';
const MAX_QUERY_LIMIT = 1000;

/**
 * Validates userId is not empty
 */
function validateUserId(userId: string): void {
  if (!userId || userId.trim() === '') {
    throw new Error('User ID cannot be empty');
  }
}

/**
 * Validates count is positive and within limits
 */
function validateCount(count: number, maxLimit: number = MAX_QUERY_LIMIT): number {
  if (count <= 0) {
    throw new Error('Count must be a positive number');
  }
  return Math.min(count, maxLimit);
}

/**
 * Creates a leaderboard instance
 */
export function createLeaderboard(
  redis: Redis,
  key: string = DEFAULT_KEY
): Leaderboard {
  const metadataKey = (userId: string) => `${METADATA_PREFIX}${key}:${userId}`;

  return {
    async setScore(userId: string, score: number): Promise<void> {
      validateUserId(userId);
      await redis.zadd(key, { score, member: userId });
    },

    async addScore(
      userId: string,
      score: number,
      metadata?: LeaderboardMetadata
    ): Promise<void> {
      validateUserId(userId);

      // Add to sorted set
      await redis.zadd(key, { score, member: userId });

      // Store metadata if provided
      if (metadata) {
        await redis.set(metadataKey(userId), JSON.stringify(metadata));
      }
    },

    async incrementScore(userId: string, increment: number): Promise<number> {
      validateUserId(userId);
      const newScore = await redis.zincrby(key, increment, userId);
      const parsed = parseFloat(newScore as unknown as string);
      return Number.isNaN(parsed) ? 0 : parsed;
    },

    async getRank(userId: string): Promise<UserRank | null> {
      validateUserId(userId);
      const rank = await redis.zrevrank(key, userId);

      if (rank === null) {
        return null;
      }

      const scoreStr = await redis.zscore(key, userId);
      const score = scoreStr ? parseFloat(String(scoreStr)) : 0;

      return {
        rank: rank + 1, // Convert 0-indexed to 1-indexed
        score: Number.isNaN(score) ? 0 : score,
      };
    },

    async getPlayerRank(userId: string): Promise<UserRank | null> {
      return this.getRank(userId);
    },

    async getTop(count: number): Promise<LeaderboardEntry[]> {
      const validCount = validateCount(count);
      const results = await redis.zrange(key, 0, validCount - 1, {
        rev: true,
        withScores: true,
      });

      return parseLeaderboardResults(results);
    },

    async getTopPlayers(
      limit: number,
      offset: number = 0
    ): Promise<LeaderboardEntryWithMetadata[]> {
      const validLimit = validateCount(limit);
      const start = Math.max(0, offset);
      const stop = start + validLimit - 1;

      const results = await redis.zrange(key, start, stop, {
        rev: true,
        withScores: true,
      });

      const entries = parseLeaderboardResults(results, start);

      // Fetch metadata for all entries
      const entriesWithMeta: LeaderboardEntryWithMetadata[] = await Promise.all(
        entries.map(async (entry): Promise<LeaderboardEntryWithMetadata> => {
          const metaStr = await redis.get<string>(metadataKey(entry.userId));

          if (metaStr) {
            try {
              const metadata: LeaderboardMetadata = typeof metaStr === 'string'
                ? JSON.parse(metaStr)
                : metaStr;
              return { ...entry, metadata };
            } catch {
              // Invalid metadata, return without it
            }
          }

          return entry;
        })
      );

      return entriesWithMeta;
    },

    async getAroundUser(
      userId: string,
      count: number
    ): Promise<LeaderboardEntry[]> {
      validateUserId(userId);
      const validCount = validateCount(count);
      const rank = await redis.zrevrank(key, userId);

      if (rank === null) {
        return [];
      }

      const start = Math.max(0, rank - validCount);
      const stop = rank + validCount;

      const results = await redis.zrange(key, start, stop, {
        rev: true,
        withScores: true,
      });

      return parseLeaderboardResults(results, start);
    },

    async getTotalUsers(): Promise<number> {
      return redis.zcard(key);
    },

    async removeUser(userId: string): Promise<boolean> {
      validateUserId(userId);
      const removed = await redis.zrem(key, userId);
      // Also remove metadata
      await redis.del(metadataKey(userId));
      return removed > 0;
    },
  };
}

/**
 * Parse Redis ZRANGE results with scores into LeaderboardEntry array
 */
function parseLeaderboardResults(
  results: unknown[],
  startRank: number = 0
): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = [];

  // Results come as [member1, score1, member2, score2, ...]
  for (let i = 0; i < results.length; i += 2) {
    const userId = String(results[i]);
    const scoreVal = results[i + 1];

    // Skip invalid entries
    if (!userId || userId.trim() === '') {
      continue;
    }

    const score = typeof scoreVal === 'number' ? scoreVal : parseFloat(String(scoreVal));
    const rank = startRank + (i / 2) + 1; // 1-indexed

    entries.push({
      userId,
      score: Number.isNaN(score) ? 0 : score,
      rank,
    });
  }

  return entries;
}

/**
 * Leaderboard key generators for different time periods
 */
export const LEADERBOARD_KEYS = {
  global: 'leaderboard:global',
  daily: (date: Date) =>
    `leaderboard:daily:${date.toISOString().split('T')[0]}`,
  weekly: (date: Date) => {
    const weekStart = getWeekStart(date);
    return `leaderboard:weekly:${weekStart.toISOString().split('T')[0]}`;
  },
  monthly: (date: Date) =>
    `leaderboard:monthly:${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
  team: (teamId: string) => `leaderboard:team:${teamId}`,
  department: (dept: DepartmentCode | string) => `leaderboard:dept:${dept}`,
} as const;

/**
 * Get the Monday of the week for a given date
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Creates multiple leaderboards for different time periods
 */
export function createTimedLeaderboards(redis: Redis) {
  const now = new Date();

  return {
    global: createLeaderboard(redis, LEADERBOARD_KEYS.global),
    daily: createLeaderboard(redis, LEADERBOARD_KEYS.daily(now)),
    weekly: createLeaderboard(redis, LEADERBOARD_KEYS.weekly(now)),
    monthly: createLeaderboard(redis, LEADERBOARD_KEYS.monthly(now)),
  };
}

/**
 * Team Leaderboard Functions
 */
export interface TeamLeaderboardManager {
  /** Add or update team score */
  addTeamScore(teamId: string, userId: string, score: number): Promise<void>;
  /** Get team leaderboard */
  getTeamLeaderboard(teamId: string, limit?: number): Promise<LeaderboardEntryWithMetadata[]>;
  /** Get all teams ranked by total score */
  getTeamRankings(limit?: number): Promise<LeaderboardEntry[]>;
}

export function createTeamLeaderboard(redis: Redis): TeamLeaderboardManager {
  const TEAMS_KEY = 'leaderboard:teams:rankings';

  return {
    async addTeamScore(
      teamId: string,
      userId: string,
      score: number
    ): Promise<void> {
      if (!teamId || teamId.trim() === '') {
        throw new Error('Team ID cannot be empty');
      }
      validateUserId(userId);

      const teamLeaderboard = createLeaderboard(redis, LEADERBOARD_KEYS.team(teamId));
      await teamLeaderboard.addScore(userId, score);

      // Update team total
      await redis.zincrby(TEAMS_KEY, score, teamId);
    },

    async getTeamLeaderboard(
      teamId: string,
      limit: number = 100
    ): Promise<LeaderboardEntryWithMetadata[]> {
      if (!teamId || teamId.trim() === '') {
        throw new Error('Team ID cannot be empty');
      }

      const teamLeaderboard = createLeaderboard(redis, LEADERBOARD_KEYS.team(teamId));
      return teamLeaderboard.getTopPlayers(limit);
    },

    async getTeamRankings(limit: number = 100): Promise<LeaderboardEntry[]> {
      const validLimit = validateCount(limit);
      const results = await redis.zrange(TEAMS_KEY, 0, validLimit - 1, {
        rev: true,
        withScores: true,
      });

      return parseLeaderboardResults(results);
    },
  };
}

/**
 * Department Leaderboard Functions
 */
export interface DepartmentLeaderboardManager {
  /** Add or update department score */
  addDepartmentScore(dept: DepartmentCode | string, userId: string, score: number): Promise<void>;
  /** Get department leaderboard */
  getDepartmentLeaderboard(dept: DepartmentCode | string, limit?: number): Promise<LeaderboardEntryWithMetadata[]>;
  /** Get all departments ranked by total score */
  getDepartmentRankings(limit?: number): Promise<LeaderboardEntry[]>;
}

export function createDepartmentLeaderboard(redis: Redis): DepartmentLeaderboardManager {
  const DEPTS_KEY = 'leaderboard:depts:rankings';

  return {
    async addDepartmentScore(
      dept: DepartmentCode | string,
      userId: string,
      score: number
    ): Promise<void> {
      if (!dept || dept.trim() === '') {
        throw new Error('Department code cannot be empty');
      }
      validateUserId(userId);

      const deptLeaderboard = createLeaderboard(redis, LEADERBOARD_KEYS.department(dept));
      await deptLeaderboard.addScore(userId, score);

      // Update department total
      await redis.zincrby(DEPTS_KEY, score, dept);
    },

    async getDepartmentLeaderboard(
      dept: DepartmentCode | string,
      limit: number = 100
    ): Promise<LeaderboardEntryWithMetadata[]> {
      if (!dept || dept.trim() === '') {
        throw new Error('Department code cannot be empty');
      }

      const deptLeaderboard = createLeaderboard(redis, LEADERBOARD_KEYS.department(dept));
      return deptLeaderboard.getTopPlayers(limit);
    },

    async getDepartmentRankings(limit: number = 100): Promise<LeaderboardEntry[]> {
      const validLimit = validateCount(limit);
      const results = await redis.zrange(DEPTS_KEY, 0, validLimit - 1, {
        rev: true,
        withScores: true,
      });

      return parseLeaderboardResults(results);
    },
  };
}

/**
 * Convenience function to add score to multiple leaderboards at once
 */
export async function addScoreToAll(
  redis: Redis,
  userId: string,
  score: number,
  metadata?: LeaderboardMetadata
): Promise<void> {
  const { global, daily, weekly, monthly } = createTimedLeaderboards(redis);

  await Promise.all([
    global.addScore(userId, score, metadata),
    daily.addScore(userId, score, metadata),
    weekly.addScore(userId, score, metadata),
    monthly.addScore(userId, score, metadata),
  ]);

  // Also add to team/department if in metadata
  if (metadata?.teamId) {
    const teamManager = createTeamLeaderboard(redis);
    await teamManager.addTeamScore(metadata.teamId, userId, score);
  }

  if (metadata?.department) {
    const deptManager = createDepartmentLeaderboard(redis);
    await deptManager.addDepartmentScore(metadata.department, userId, score);
  }
}
