/**
 * @app/cache - Redis/Cache Package
 *
 * Provides caching, leaderboards, and rate limiting for the TON Mini App
 * Using Upstash Redis for serverless-compatible Redis operations
 */

// ============================================================================
// Types
// ============================================================================

export type {
  // User types
  UserGameState,
  UserCacheData,
  // Leaderboard types
  LeaderboardEntry,
  LeaderboardEntryWithMetadata,
  LeaderboardMetadata,
  UserRank,
  LeaderboardConfig,
  // Rate limiter types
  RateLimitResult,
  RateLimiterConfig,
  RateLimiter,
  // Redis types
  RedisClientConfig,
  CacheConfig,
  // Team/Department types
  TeamInfo,
  DepartmentInfo,
  DepartmentCode,
} from './types.js';

export { DEPARTMENT_NAMES } from './types.js';

// ============================================================================
// Redis Client
// ============================================================================

export {
  createRedis,
  createRedisFromEnv,
  getRedis,
  setRedis,
  clearRedis,
  pingRedis,
  type RedisClient,
  Redis,
} from './client.js';

// ============================================================================
// Rate Limiter
// ============================================================================

export {
  createRateLimiter,
  createTapLimiter,
  createBurstLimiter,
  createApiLimiter,
  createWalletLimiter,
  createReferralLimiter,
  createGameRateLimiters,
  checkTapLimits,
  isRateLimited,
  checkLimitOrThrow,
  RateLimitExceededError,
  RATE_LIMIT_CONFIGS,
  type CombinedRateLimitResult,
} from './rateLimiter.js';

// ============================================================================
// Leaderboard
// ============================================================================

export {
  createLeaderboard,
  createTimedLeaderboards,
  createTeamLeaderboard,
  createDepartmentLeaderboard,
  addScoreToAll,
  LEADERBOARD_KEYS,
  type Leaderboard,
  type TeamLeaderboardManager,
  type DepartmentLeaderboardManager,
} from './leaderboard.js';

// ============================================================================
// User Cache
// ============================================================================

export {
  createUserCache,
  createDefaultUserState,
  cacheOrGet,
  batchGetUsers,
  USER_CACHE_CONFIG,
  type UserCache,
} from './userCache.js';
