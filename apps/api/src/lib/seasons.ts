/**
 * Seasons System for EVO Tap
 *
 * Each season:
 * - Has a fixed duration (e.g., 2 weeks)
 * - Separate leaderboards
 * - Airdrop at the end
 * - Points reset for new season
 */

import type { RedisClient } from './redis.js';
import { REDIS_KEYS } from './redis.js';

// =============================================================================
// TYPES
// =============================================================================

export interface Season {
  id: number;
  name: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  status: 'upcoming' | 'active' | 'ended' | 'claimed';
  totalPlayers: number;
  totalPoints: number;
  prizePool: string; // Token amount as string
  airdropRoot?: string; // Merkle root when airdrop is generated
}

export interface SeasonLeaderboardEntry {
  rank: number;
  odtelegramId: number;
  points: number;
  team?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const SEASON_CONFIG = {
  DURATION_DAYS: 14, // 2 weeks per season
  MIN_POINTS_FOR_AIRDROP: 100, // Minimum points to qualify
  BASE_PRIZE_POOL: '10000000', // 10M tokens per season
};

// =============================================================================
// REDIS KEYS
// =============================================================================

export const SEASON_KEYS = {
  // Current active season
  currentSeason: 'season:current',
  // Season metadata
  seasonInfo: (seasonId: number) => `season:${seasonId}:info`,
  // Season leaderboard (separate from global)
  seasonLeaderboard: (seasonId: number) => `season:${seasonId}:leaderboard`,
  // Season team leaderboards
  seasonTeamLeaderboard: (seasonId: number, team: string) => `season:${seasonId}:team:${team}`,
  // Season department leaderboards
  seasonDeptLeaderboard: (seasonId: number, dept: string) => `season:${seasonId}:dept:${dept}`,
  // User's season points (separate from lifetime)
  userSeasonPoints: (seasonId: number, odtelegramId: number) => `season:${seasonId}:user:${odtelegramId}`,
  // Airdrop claims for season
  seasonClaims: (seasonId: number) => `season:${seasonId}:claims`,
};

// =============================================================================
// FUNCTIONS
// =============================================================================

/**
 * Get current active season
 */
export async function getCurrentSeason(redis: RedisClient): Promise<Season | null> {
  const seasonId = await redis.get(SEASON_KEYS.currentSeason);
  if (!seasonId) return null;

  const info = await redis.hgetall(SEASON_KEYS.seasonInfo(parseInt(seasonId)));
  if (!info || Object.keys(info).length === 0) return null;

  return {
    id: parseInt(seasonId),
    name: info.name || `Season ${seasonId}`,
    startDate: info.startDate || '',
    endDate: info.endDate || '',
    status: (info.status as Season['status']) || 'active',
    totalPlayers: parseInt(info.totalPlayers || '0'),
    totalPoints: parseInt(info.totalPoints || '0'),
    prizePool: info.prizePool || SEASON_CONFIG.BASE_PRIZE_POOL,
    airdropRoot: info.airdropRoot || undefined,
  };
}

/**
 * Create a new season
 */
export async function createSeason(
  redis: RedisClient,
  seasonId: number,
  name: string,
  startDate: Date,
  prizePool: string = SEASON_CONFIG.BASE_PRIZE_POOL
): Promise<Season> {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + SEASON_CONFIG.DURATION_DAYS);

  const season: Season = {
    id: seasonId,
    name,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    status: 'active',
    totalPlayers: 0,
    totalPoints: 0,
    prizePool,
  };

  // Save season info
  await redis.hmset(SEASON_KEYS.seasonInfo(seasonId), {
    name: season.name,
    startDate: season.startDate,
    endDate: season.endDate,
    status: season.status,
    totalPlayers: '0',
    totalPoints: '0',
    prizePool: season.prizePool,
  });

  // Set as current season
  await redis.set(SEASON_KEYS.currentSeason, String(seasonId));

  return season;
}

/**
 * Add points to user in current season
 */
export async function addSeasonPoints(
  redis: RedisClient,
  seasonId: number,
  telegramId: number,
  points: number,
  team?: string | null,
  department?: string | null
): Promise<void> {
  const userKey = String(telegramId);

  // Add to season leaderboard
  await redis.zincrby(SEASON_KEYS.seasonLeaderboard(seasonId), points, userKey);

  // Add to team leaderboard if has team
  if (team) {
    await redis.zincrby(SEASON_KEYS.seasonTeamLeaderboard(seasonId, team), points, userKey);
  }

  // Add to department leaderboard if has department
  if (department) {
    await redis.zincrby(SEASON_KEYS.seasonDeptLeaderboard(seasonId, department), points, userKey);
  }

  // Update season totals
  await redis.hincrby(SEASON_KEYS.seasonInfo(seasonId), 'totalPoints', points);
}

/**
 * Get season leaderboard
 */
export async function getSeasonLeaderboard(
  redis: RedisClient,
  seasonId: number,
  limit: number = 100
): Promise<SeasonLeaderboardEntry[]> {
  const results = await redis.zrevrange(
    SEASON_KEYS.seasonLeaderboard(seasonId),
    0,
    limit - 1,
    true
  );

  const entries: SeasonLeaderboardEntry[] = [];
  for (let i = 0; i < results.length; i += 2) {
    const odtelegramId = parseInt(results[i] || '0');
    const points = parseFloat(results[i + 1] || '0');
    entries.push({
      rank: Math.floor(i / 2) + 1,
      odtelegramId: odtelegramId,
      points: Math.floor(points),
    });
  }

  return entries;
}

/**
 * Get team totals for current season (for battle bar)
 */
export async function getSeasonTeamTotals(
  redis: RedisClient,
  seasonId: number
): Promise<{ colla: number; camba: number; neutral: number }> {
  const teams = ['colla', 'camba', 'neutral'] as const;
  const totals: Record<string, number> = { colla: 0, camba: 0, neutral: 0 };

  for (const team of teams) {
    const scores = await redis.zrevrange(
      SEASON_KEYS.seasonTeamLeaderboard(seasonId, team),
      0,
      999,
      true
    );

    let total = 0;
    for (let i = 1; i < scores.length; i += 2) {
      total += parseFloat(scores[i] || '0');
    }
    totals[team] = Math.floor(total);
  }

  return totals as { colla: number; camba: number; neutral: number };
}

/**
 * End a season and prepare for airdrop
 */
export async function endSeason(
  redis: RedisClient,
  seasonId: number
): Promise<{ totalPlayers: number; totalPoints: number }> {
  // Get final stats
  const playerCount = await redis.zcard(SEASON_KEYS.seasonLeaderboard(seasonId));
  const info = await redis.hgetall(SEASON_KEYS.seasonInfo(seasonId));
  const totalPoints = parseInt(info.totalPoints || '0');

  // Update season status
  await redis.hset(SEASON_KEYS.seasonInfo(seasonId), 'status', 'ended');

  return {
    totalPlayers: playerCount,
    totalPoints,
  };
}

/**
 * Check if season has ended
 */
export function isSeasonEnded(season: Season): boolean {
  if (season.status === 'ended' || season.status === 'claimed') return true;
  return new Date() > new Date(season.endDate);
}

/**
 * Get time remaining in season
 */
export function getSeasonTimeRemaining(season: Season): {
  days: number;
  hours: number;
  minutes: number;
  total: number; // milliseconds
} {
  const now = new Date();
  const end = new Date(season.endDate);
  const diff = Math.max(0, end.getTime() - now.getTime());

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return { days, hours, minutes, total: diff };
}
