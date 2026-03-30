import type { Context } from 'hono';
import type { ValidatedUser } from '@app/telegram';
import type { UserGameState } from './lib/redis.js';

/**
 * Environment bindings for Cloudflare Workers
 */
export interface Env {
  // Environment
  ENVIRONMENT: 'local' | 'testnet' | 'mainnet';
  TON_NETWORK: 'testnet' | 'mainnet';

  // Telegram
  BOT_TOKEN: string;

  // Supabase
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;

  // Upstash Redis
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
}

/**
 * Variables stored in Hono context
 */
export interface Variables {
  // Auth
  user: ValidatedUser;
  telegramId: number;
  startParam?: string;

  // User state from Redis
  userState?: UserGameState;

  // Request tracking
  requestId: string;
}

/**
 * Extended Hono Context with our types
 */
export type AppContext = Context<{ Bindings: Env; Variables: Variables }>;

/**
 * Standard API response
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Error response
 */
export interface ApiError {
  success: false;
  error: string;
  code: string;
  details?: unknown;
}

/**
 * Pagination params
 */
export interface PaginationParams {
  limit: number;
  offset: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Team types (colla = highlands, camba = lowlands)
 */
export type TeamType = 'colla' | 'camba' | 'neutral';

/**
 * Bolivian department codes
 */
export type DepartmentCode =
  | 'LP' // La Paz
  | 'SC' // Santa Cruz
  | 'CB' // Cochabamba
  | 'OR' // Oruro
  | 'PT' // Potosi
  | 'CH' // Chuquisaca
  | 'TJ' // Tarija
  | 'BE' // Beni
  | 'PA'; // Pando

/**
 * Department info with team mapping
 */
export const DEPARTMENTS: Record<DepartmentCode, { name: string; team: TeamType }> = {
  LP: { name: 'La Paz', team: 'colla' },
  SC: { name: 'Santa Cruz', team: 'camba' },
  CB: { name: 'Cochabamba', team: 'neutral' },
  OR: { name: 'Oruro', team: 'colla' },
  PT: { name: 'Potosi', team: 'colla' },
  CH: { name: 'Chuquisaca', team: 'colla' },
  TJ: { name: 'Tarija', team: 'camba' },
  BE: { name: 'Beni', team: 'camba' },
  PA: { name: 'Pando', team: 'camba' },
};

/**
 * Game constants
 */
export const GAME_CONFIG = {
  // Energy
  MAX_ENERGY: 1000,
  ENERGY_REGEN_RATE: 1, // per second
  ENERGY_PER_TAP: 1,

  // Points
  POINTS_PER_TAP: 1,
  REFERRAL_BONUS_REFERRER: 5000,
  REFERRAL_BONUS_INVITEE: 5000,

  // Levels
  LEVEL_THRESHOLDS: [
    0, // Level 1
    5000, // Level 2
    25000, // Level 3
    100000, // Level 4
    500000, // Level 5
    1000000, // Level 6
    5000000, // Level 7
    10000000, // Level 8
    50000000, // Level 9
    100000000, // Level 10
  ],

  // Rate limits
  MAX_TAPS_PER_SECOND: 10,
  MAX_TAPS_PER_10_SECONDS: 50,

  // Referral
  REFERRAL_CODE_LENGTH: 8,
  MAX_REFERRALS_PER_DAY: 100,
} as const;

/**
 * Calculate level from points
 */
export function calculateLevel(points: number): number {
  const thresholds = GAME_CONFIG.LEVEL_THRESHOLDS;
  for (let i = thresholds.length - 1; i >= 0; i--) {
    const threshold = thresholds[i];
    if (threshold !== undefined && points >= threshold) {
      return i + 1;
    }
  }
  return 1;
}

/**
 * Calculate points needed for next level
 */
export function pointsToNextLevel(points: number): number {
  const level = calculateLevel(points);
  const thresholds = GAME_CONFIG.LEVEL_THRESHOLDS;

  if (level >= thresholds.length) {
    return 0; // Max level
  }

  const nextThreshold = thresholds[level];
  if (nextThreshold === undefined) {
    return 0;
  }

  return nextThreshold - points;
}
