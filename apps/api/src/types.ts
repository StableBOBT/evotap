import type { Context } from 'hono';
import type { ValidatedUser } from '@app/telegram';
import type { UserGameState } from './lib/redis.js';

// Re-export from centralized config
export { calculateLevel, pointsToNextLevel, ENERGY, POINTS, REFERRAL, LEVEL_THRESHOLDS } from '@app/config';

/**
 * Environment bindings for Cloudflare Workers
 */
export interface Env {
  // Environment
  ENVIRONMENT: 'local' | 'testnet' | 'mainnet';
  TON_NETWORK: 'testnet' | 'mainnet';

  // Telegram
  BOT_TOKEN: string;

  // Admin authentication (optional, falls back to BOT_TOKEN derivation if not set)
  // IMPORTANT: Set this to a strong random 64-char hex string in production
  ADMIN_SECRET?: string;

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

