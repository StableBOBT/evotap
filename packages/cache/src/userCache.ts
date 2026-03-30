/**
 * User Data Cache
 * Cache user game state with TTL for fast reads
 */

import type { Redis } from '@upstash/redis';
import type { UserCacheData, CacheConfig } from './types.js';

/** Default cache TTL: 1 hour */
const DEFAULT_TTL_SECONDS = 3600;

/** Cache key prefix */
const CACHE_PREFIX = 'user:cache:';

/**
 * User cache interface
 */
export interface UserCache {
  /** Cache user data with optional TTL */
  setUserData(userId: string, data: UserCacheData, ttlSeconds?: number): Promise<void>;
  /** Get cached user data */
  getUserData(userId: string): Promise<UserCacheData | null>;
  /** Delete cached user data */
  deleteUserData(userId: string): Promise<boolean>;
  /** Update specific fields in user cache */
  updateUserData(userId: string, updates: Partial<UserCacheData>): Promise<UserCacheData | null>;
  /** Check if user data is cached */
  hasUserData(userId: string): Promise<boolean>;
  /** Get TTL remaining for cached data */
  getTtl(userId: string): Promise<number>;
  /** Extend TTL for cached data */
  extendTtl(userId: string, ttlSeconds?: number): Promise<boolean>;
}

/**
 * Validate userId is not empty
 */
function validateUserId(userId: string): void {
  if (!userId || userId.trim() === '') {
    throw new Error('User ID cannot be empty');
  }
}

/**
 * Generate cache key for user
 */
function getUserKey(userId: string, prefix: string = CACHE_PREFIX): string {
  return `${prefix}${userId}`;
}

/**
 * Create a user cache instance
 */
export function createUserCache(
  redis: Redis,
  config: CacheConfig = {}
): UserCache {
  const { defaultTtl = DEFAULT_TTL_SECONDS, prefix = CACHE_PREFIX } = config;

  return {
    async setUserData(
      userId: string,
      data: UserCacheData,
      ttlSeconds: number = defaultTtl
    ): Promise<void> {
      validateUserId(userId);
      const key = getUserKey(userId, prefix);

      // Add cache timestamp
      const cacheData: UserCacheData = {
        ...data,
        cachedAt: new Date().toISOString(),
      };

      await redis.setex(key, ttlSeconds, JSON.stringify(cacheData));
    },

    async getUserData(userId: string): Promise<UserCacheData | null> {
      validateUserId(userId);
      const key = getUserKey(userId, prefix);

      const data = await redis.get<string>(key);
      if (!data) {
        return null;
      }

      try {
        return typeof data === 'string' ? JSON.parse(data) : data;
      } catch {
        // Invalid JSON, delete corrupted data
        await redis.del(key);
        return null;
      }
    },

    async deleteUserData(userId: string): Promise<boolean> {
      validateUserId(userId);
      const key = getUserKey(userId, prefix);

      const deleted = await redis.del(key);
      return deleted > 0;
    },

    async updateUserData(
      userId: string,
      updates: Partial<UserCacheData>
    ): Promise<UserCacheData | null> {
      validateUserId(userId);
      const key = getUserKey(userId, prefix);

      // Get current data
      const current = await this.getUserData(userId);
      if (!current) {
        return null;
      }

      // Get remaining TTL
      const ttl = await redis.ttl(key);
      const ttlToUse = ttl > 0 ? ttl : defaultTtl;

      // Merge updates
      const updated: UserCacheData = {
        ...current,
        ...updates,
        cachedAt: new Date().toISOString(),
      };

      // Save with remaining TTL
      await redis.setex(key, ttlToUse, JSON.stringify(updated));

      return updated;
    },

    async hasUserData(userId: string): Promise<boolean> {
      validateUserId(userId);
      const key = getUserKey(userId, prefix);

      const exists = await redis.exists(key);
      return exists > 0;
    },

    async getTtl(userId: string): Promise<number> {
      validateUserId(userId);
      const key = getUserKey(userId, prefix);

      const ttl = await redis.ttl(key);
      return ttl > 0 ? ttl : 0;
    },

    async extendTtl(
      userId: string,
      ttlSeconds: number = defaultTtl
    ): Promise<boolean> {
      validateUserId(userId);
      const key = getUserKey(userId, prefix);

      const result = await redis.expire(key, ttlSeconds);
      return result === 1;
    },
  };
}

/**
 * Create default user game state
 */
export function createDefaultUserState(
  telegramId: string,
  options: Partial<UserCacheData> = {}
): UserCacheData {
  return {
    telegramId,
    points: 0,
    energy: 1000,
    maxEnergy: 1000,
    tapPower: 1,
    level: 1,
    streak: 0,
    lastActive: new Date().toISOString(),
    walletConnected: false,
    isPremium: false,
    trustScore: 50,
    cachedAt: new Date().toISOString(),
    ...options,
  };
}

/**
 * Utility to cache or get user data
 * Gets from cache if exists, otherwise fetches and caches
 */
export async function cacheOrGet(
  cache: UserCache,
  userId: string,
  fetcher: () => Promise<UserCacheData>,
  ttlSeconds?: number
): Promise<UserCacheData> {
  // Try cache first
  const cached = await cache.getUserData(userId);
  if (cached) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetcher();

  // Cache it
  await cache.setUserData(userId, data, ttlSeconds);

  return data;
}

/**
 * Batch get multiple users from cache
 */
export async function batchGetUsers(
  redis: Redis,
  userIds: string[],
  prefix: string = CACHE_PREFIX
): Promise<Map<string, UserCacheData | null>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const keys = userIds.map((id) => getUserKey(id, prefix));
  const results = await redis.mget<string[]>(...keys);

  const map = new Map<string, UserCacheData | null>();

  userIds.forEach((id, index) => {
    const data = results[index];
    if (data) {
      try {
        map.set(id, typeof data === 'string' ? JSON.parse(data) : data);
      } catch {
        map.set(id, null);
      }
    } else {
      map.set(id, null);
    }
  });

  return map;
}

/**
 * Cache configuration constants
 */
export const USER_CACHE_CONFIG = {
  /** Default TTL in seconds (1 hour) */
  DEFAULT_TTL: DEFAULT_TTL_SECONDS,
  /** Short TTL for frequently changing data (5 minutes) */
  SHORT_TTL: 300,
  /** Long TTL for stable data (24 hours) */
  LONG_TTL: 86400,
  /** Key prefix */
  PREFIX: CACHE_PREFIX,
} as const;
