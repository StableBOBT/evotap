/**
 * Game Constants
 * Centralized configuration for game mechanics
 *
 * This is the SINGLE SOURCE OF TRUTH for all game parameters.
 * All apps (api, bot, mini-app) should import from here.
 */

// =============================================================================
// ENERGY SYSTEM
// =============================================================================

export const ENERGY = {
  MAX: 1000,
  REGEN_PER_SECOND: 1, // 1 energy point per second
  TAP_COST: 1,
} as const;

// =============================================================================
// POINTS SYSTEM
// =============================================================================

export const POINTS = {
  PER_TAP: 1,
  REFERRAL_BONUS: 5000,
  PREMIUM_MULTIPLIER: 1.25,
  STREAK_BONUS_PERCENT: 10,
} as const;

// =============================================================================
// LEVEL SYSTEM (Exponential thresholds)
// =============================================================================

/**
 * Points required for each level (index = level - 1)
 * Level 1: 0 points
 * Level 2: 5,000 points
 * Level 3: 25,000 points
 * ...up to Level 10: 100,000,000 points
 */
export const LEVEL_THRESHOLDS: readonly number[] = [
  0,          // Level 1
  5_000,      // Level 2
  25_000,     // Level 3
  100_000,    // Level 4
  500_000,    // Level 5
  1_000_000,  // Level 6
  5_000_000,  // Level 7
  10_000_000, // Level 8
  50_000_000, // Level 9
  100_000_000,// Level 10
] as const;

export const MAX_LEVEL = LEVEL_THRESHOLDS.length;

/**
 * Calculate level from total points (exponential thresholds)
 */
export function calculateLevel(points: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    const threshold = LEVEL_THRESHOLDS[i];
    if (threshold !== undefined && points >= threshold) {
      return i + 1;
    }
  }
  return 1;
}

/**
 * Calculate points needed to reach the next level
 * Returns 0 if already at max level
 */
export function pointsToNextLevel(points: number): number {
  const level = calculateLevel(points);
  if (level >= LEVEL_THRESHOLDS.length) {
    return 0;
  }
  const nextThreshold = LEVEL_THRESHOLDS[level];
  return nextThreshold !== undefined ? nextThreshold - points : 0;
}

// =============================================================================
// REFERRAL SYSTEM
// =============================================================================

export const REFERRAL = {
  BONUS_POINTS: 5000,
  CODE_LENGTH: 8,
  MAX_PER_DAY: 100,
} as const;

/**
 * Generate a deterministic referral code from telegram ID
 * Uses base-36 encoding + padding to create 8-char codes
 */
export function generateReferralCode(telegramId: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const idPart = telegramId.toString(36).toUpperCase().slice(-3);

  let code = idPart;
  while (code.length < REFERRAL.CODE_LENGTH) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return code.slice(0, REFERRAL.CODE_LENGTH);
}

// =============================================================================
// STREAKS
// =============================================================================

export const STREAKS = {
  MAX_DAYS: 30,
  BONUS_PER_DAY: 100,
  RESET_HOURS: 48,
} as const;

// =============================================================================
// SESSION
// =============================================================================

export const SESSION = {
  MAX_DURATION_HOURS: 4,
  MIN_SESSION_SECONDS: 10,
} as const;

// =============================================================================
// RATE LIMITING
// =============================================================================

export const RATE_LIMITS = {
  TAP: {
    MAX_PER_SECOND: 10,
    BURST_MAX_PER_10_SECONDS: 50,
    BURST_BAN_DURATION_HOURS: 1,
  },
  API: {
    MAX_PER_MINUTE: 60,
    SLOWDOWN_THRESHOLD: 50,
  },
  CLAIM: {
    MAX_PER_HOUR: 5,
  },
  REFERRAL: {
    MAX_PER_DAY: 100,
  },
  WALLET_CONNECT: {
    MAX_PER_HOUR: 3,
  },
} as const;

// =============================================================================
// SECURITY
// =============================================================================

export const SECURITY = {
  AUTH_DATA_EXPIRY_SECONDS: 300, // 5 minutes
  NONCE_EXPIRY_SECONDS: 3600, // 1 hour
  JWT_EXPIRY_SECONDS: 86400, // 24 hours
  TRUST_SCORE: {
    MIN_FOR_AIRDROP: 50,
    MIN_ACCOUNT_AGE_DAYS: 7,
    MIN_SESSIONS: 10,
    MAX_DEVICES_PER_FINGERPRINT: 3,
  },
  BEHAVIOR: {
    MIN_TAP_VARIANCE: 10,
    SUSPICIOUS_TAPS_PER_SECOND: 10,
    MAX_SESSION_HOURS: 4,
  },
} as const;

// =============================================================================
// TOKENOMICS
// =============================================================================

export const TOKENOMICS = {
  TOTAL_SUPPLY: 1_000_000_000,
  DISTRIBUTION: {
    COMMUNITY: 0.8,
    LIQUIDITY: 0.15,
    TEAM: 0.05,
  },
  COMMUNITY_BREAKDOWN: {
    TAP_TO_EARN: 0.5,
    REFERRALS: 0.2,
    AIRDROPS: 0.1,
  },
  TEAM_VESTING_MONTHS: 12,
} as const;

// =============================================================================
// API PATHS
// =============================================================================

export const API_PATHS = {
  AUTH: '/api/v1/auth',
  GAME: '/api/v1/game',
  USER: '/api/v1/user',
  LEADERBOARD: '/api/v1/leaderboard',
  REFERRAL: '/api/v1/referral',
  BOT: '/api/v1/bot',
} as const;

// =============================================================================
// REDIS KEY PREFIXES
// =============================================================================

export const REDIS_KEYS = {
  SESSION: 'session:',
  LEADERBOARD: 'leaderboard:',
  RATELIMIT: 'ratelimit:',
  CACHE: 'cache:',
  NONCE: 'nonce:',
  BANNED: 'banned:',
} as const;

// =============================================================================
// BACKWARD-COMPATIBLE ALIASES
// These match the old GAME_CONFIG shape used by the API
// =============================================================================

/**
 * @deprecated Import individual constants (ENERGY, POINTS, LEVEL_THRESHOLDS, etc.) instead
 */
export const GAME = {
  ENERGY,
  POINTS,
  LEVELS: {
    MAX: MAX_LEVEL,
    THRESHOLDS: LEVEL_THRESHOLDS,
  },
  STREAKS,
  SESSION,
} as const;

export type GameConstants = typeof GAME;
export type RateLimitConstants = typeof RATE_LIMITS;
export type SecurityConstants = typeof SECURITY;
