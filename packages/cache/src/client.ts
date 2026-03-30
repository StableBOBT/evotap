/**
 * Upstash Redis Client
 * Typed Redis client for serverless environments
 */

import { Redis } from '@upstash/redis';
import type { RedisClientConfig } from './types.js';

/**
 * Environment variables required for Redis connection
 */
const ENV_VARS = {
  URL: 'UPSTASH_REDIS_REST_URL',
  TOKEN: 'UPSTASH_REDIS_REST_TOKEN',
} as const;

/**
 * Get environment variable with validation
 */
function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
      `Please set ${name} in your environment.`
    );
  }
  return value;
}

/**
 * Create Redis client from environment variables
 * Uses UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
 */
export function createRedisFromEnv(): Redis {
  const url = getEnvVar(ENV_VARS.URL);
  const token = getEnvVar(ENV_VARS.TOKEN);

  return new Redis({
    url,
    token,
  });
}

/**
 * Create Redis client from explicit config
 */
export function createRedis(config: RedisClientConfig): Redis {
  if (!config.url || !config.token) {
    throw new Error('Redis config requires both url and token');
  }

  return new Redis({
    url: config.url,
    token: config.token,
  });
}

/**
 * Singleton Redis instance
 * Lazily initialized on first access
 */
let redisInstance: Redis | null = null;

/**
 * Get singleton Redis client
 * Creates instance from environment on first call
 */
export function getRedis(): Redis {
  if (!redisInstance) {
    redisInstance = createRedisFromEnv();
  }
  return redisInstance;
}

/**
 * Set custom Redis instance (useful for testing)
 */
export function setRedis(redis: Redis): void {
  redisInstance = redis;
}

/**
 * Clear singleton instance (for testing cleanup)
 */
export function clearRedis(): void {
  redisInstance = null;
}

/**
 * Health check for Redis connection
 */
export async function pingRedis(redis?: Redis): Promise<boolean> {
  try {
    const client = redis ?? getRedis();
    const result = await client.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}

/**
 * Re-export Redis type for convenience
 */
export { Redis };

/**
 * Type helper for Redis commands used in this package
 */
export type RedisClient = Redis;
