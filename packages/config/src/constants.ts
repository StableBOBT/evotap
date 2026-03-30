/**
 * Game Constants
 * Centralized configuration for game mechanics
 */
export const GAME = {
  // Energy System
  ENERGY: {
    MAX: 1000,
    RECHARGE_PER_MINUTE: 1,
    RECHARGE_INTERVAL_MS: 60_000,
    TAP_COST: 1,
  },

  // Points System
  POINTS: {
    PER_TAP: 1,
    REFERRAL_BONUS: 5000,
    REFERRAL_BONUS_INVITER: 5000,
    PREMIUM_MULTIPLIER: 1.25,
    STREAK_BONUS_PERCENT: 10,
  },

  // Levels
  LEVELS: {
    MAX: 100,
    POINTS_PER_LEVEL: 10000,
    TAP_MULTIPLIER_PER_LEVEL: 0.1,
  },

  // Streaks
  STREAKS: {
    MAX_DAYS: 30,
    BONUS_PER_DAY: 100,
    RESET_HOURS: 48,
  },

  // Sessions
  SESSION: {
    MAX_DURATION_HOURS: 4,
    MIN_SESSION_SECONDS: 10,
  },
} as const;

/**
 * Rate Limiting Constants
 */
export const RATE_LIMITS = {
  // Taps
  TAP: {
    MAX_PER_SECOND: 10,
    BURST_MAX_PER_10_SECONDS: 50,
    BURST_BAN_DURATION_HOURS: 1,
  },

  // API
  API: {
    MAX_PER_MINUTE: 60,
    SLOWDOWN_THRESHOLD: 50,
  },

  // Actions
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

/**
 * Security Constants
 */
export const SECURITY = {
  // Auth
  AUTH_DATA_EXPIRY_SECONDS: 300, // 5 minutes
  NONCE_EXPIRY_SECONDS: 3600, // 1 hour
  JWT_EXPIRY_SECONDS: 86400, // 24 hours

  // Trust Score
  TRUST_SCORE: {
    MIN_FOR_AIRDROP: 50,
    MIN_ACCOUNT_AGE_DAYS: 7,
    MIN_SESSIONS: 10,
    MAX_DEVICES_PER_FINGERPRINT: 3,
  },

  // Behavioral Analysis
  BEHAVIOR: {
    MIN_TAP_VARIANCE: 10, // Bots have very low variance
    SUSPICIOUS_TAPS_PER_SECOND: 10,
    MAX_SESSION_HOURS: 4,
  },
} as const;

/**
 * Tokenomics Constants
 */
export const TOKENOMICS = {
  TOTAL_SUPPLY: 1_000_000_000,

  DISTRIBUTION: {
    COMMUNITY: 0.8, // 80%
    LIQUIDITY: 0.15, // 15%
    TEAM: 0.05, // 5%
  },

  COMMUNITY_BREAKDOWN: {
    TAP_TO_EARN: 0.5, // 50% of community
    REFERRALS: 0.2, // 20% of community
    AIRDROPS: 0.1, // 10% of community
  },

  TEAM_VESTING_MONTHS: 12,
} as const;

/**
 * API Paths
 */
export const API_PATHS = {
  AUTH: '/api/v1/auth',
  GAME: '/api/v1/game',
  USER: '/api/v1/user',
  LEADERBOARD: '/api/v1/leaderboard',
  REFERRAL: '/api/v1/referral',
} as const;

/**
 * Redis Key Prefixes
 */
export const REDIS_KEYS = {
  SESSION: 'session:',
  LEADERBOARD: 'leaderboard:',
  RATELIMIT: 'ratelimit:',
  CACHE: 'cache:',
  NONCE: 'nonce:',
  BANNED: 'banned:',
} as const;

export type GameConstants = typeof GAME;
export type RateLimitConstants = typeof RATE_LIMITS;
export type SecurityConstants = typeof SECURITY;
