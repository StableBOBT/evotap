/**
 * Cache Package Types
 * Centralized type definitions for Redis/cache operations
 */

// ============================================================================
// User Types
// ============================================================================

export interface UserGameState {
  /** Total accumulated points */
  points: number;
  /** Current energy level */
  energy: number;
  /** Maximum energy capacity */
  maxEnergy: number;
  /** Points earned per tap */
  tapPower: number;
  /** Current user level */
  level: number;
  /** Current streak count */
  streak: number;
  /** Last active timestamp (ISO string) */
  lastActive: string;
  /** Team/squad ID if any */
  teamId?: string;
  /** Department code (LP, SC, CB, etc.) */
  department?: string;
  /** Whether user has connected wallet */
  walletConnected: boolean;
  /** User's referral code */
  referralCode?: string;
  /** ID of user who referred this user */
  referredBy?: string;
}

export interface UserCacheData extends UserGameState {
  /** Telegram user ID */
  telegramId: string;
  /** Telegram username if available */
  username?: string;
  /** Whether user is Telegram Premium */
  isPremium: boolean;
  /** Trust score (0-100) */
  trustScore: number;
  /** Cache timestamp */
  cachedAt: string;
}

// ============================================================================
// Leaderboard Types
// ============================================================================

export interface LeaderboardEntry {
  /** User identifier */
  userId: string;
  /** User's score */
  score: number;
  /** Rank position (1-indexed) */
  rank: number;
}

export interface LeaderboardEntryWithMetadata extends LeaderboardEntry {
  /** Optional metadata stored with the entry */
  metadata?: LeaderboardMetadata;
}

export interface LeaderboardMetadata {
  /** Display name */
  displayName?: string;
  /** Avatar URL */
  avatarUrl?: string;
  /** Team ID */
  teamId?: string;
  /** Department code */
  department?: string;
  /** Additional custom data */
  [key: string]: unknown;
}

export interface UserRank {
  /** User's rank (1-indexed) */
  rank: number;
  /** User's score */
  score: number;
}

export interface LeaderboardConfig {
  /** Redis key for the leaderboard */
  key: string;
  /** Maximum entries to keep */
  maxEntries?: number;
  /** TTL in seconds for the leaderboard */
  ttlSeconds?: number;
}

// ============================================================================
// Rate Limiter Types
// ============================================================================

export interface RateLimitResult {
  /** Whether the request is allowed */
  success: boolean;
  /** Remaining requests in current window */
  remaining: number;
  /** Time in milliseconds until limit resets */
  reset: number;
}

export interface RateLimiterConfig {
  /** Key prefix for Redis */
  prefix?: string;
  /** Maximum requests allowed in window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

export interface RateLimiter {
  /** Check rate limit for identifier */
  checkLimit(identifier: string): Promise<RateLimitResult>;
  /** Reset rate limit for identifier */
  reset(identifier: string): Promise<void>;
}

// ============================================================================
// Redis Client Types
// ============================================================================

export interface RedisClientConfig {
  /** Upstash Redis REST URL */
  url: string;
  /** Upstash Redis REST token */
  token: string;
}

export interface CacheConfig {
  /** Default TTL in seconds */
  defaultTtl?: number;
  /** Key prefix for namespacing */
  prefix?: string;
}

// ============================================================================
// Team/Department Types
// ============================================================================

export interface TeamInfo {
  /** Team unique identifier */
  id: string;
  /** Team display name */
  name: string;
  /** Total combined score */
  totalScore: number;
  /** Number of members */
  memberCount: number;
}

export interface DepartmentInfo {
  /** Department code (LP, SC, CB, etc.) */
  code: string;
  /** Department full name */
  name: string;
  /** Total combined score */
  totalScore: number;
  /** Number of players */
  playerCount: number;
}

/** Bolivian department codes */
export type DepartmentCode =
  | 'LP'  // La Paz
  | 'SC'  // Santa Cruz
  | 'CB'  // Cochabamba
  | 'OR'  // Oruro
  | 'PT'  // Potosi
  | 'CH'  // Chuquisaca
  | 'TJ'  // Tarija
  | 'BE'  // Beni
  | 'PA'; // Pando

export const DEPARTMENT_NAMES: Record<DepartmentCode, string> = {
  LP: 'La Paz',
  SC: 'Santa Cruz',
  CB: 'Cochabamba',
  OR: 'Oruro',
  PT: 'Potosi',
  CH: 'Chuquisaca',
  TJ: 'Tarija',
  BE: 'Beni',
  PA: 'Pando',
};
