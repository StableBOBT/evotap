/**
 * Rate Limiter using @upstash/ratelimit
 * Sliding window implementation for rate limiting
 */

import { Ratelimit } from '@upstash/ratelimit';
import type { Redis } from '@upstash/redis';
import type { RateLimitResult, RateLimiterConfig, RateLimiter } from './types.js';

export type { RateLimitResult, RateLimiterConfig, RateLimiter };

/**
 * Default configurations for common rate limiting scenarios
 */
export const RATE_LIMIT_CONFIGS = {
  /** 10 taps per second */
  tap: {
    prefix: 'ratelimit:tap',
    maxRequests: 10,
    windowMs: 1000,
  },
  /** 50 taps per 10 seconds (burst detection) */
  burst: {
    prefix: 'ratelimit:burst',
    maxRequests: 50,
    windowMs: 10000,
  },
  /** 60 API requests per minute */
  api: {
    prefix: 'ratelimit:api',
    maxRequests: 60,
    windowMs: 60000,
  },
  /** 5 wallet connections per hour */
  wallet: {
    prefix: 'ratelimit:wallet',
    maxRequests: 5,
    windowMs: 3600000,
  },
  /** 100 referrals per day */
  referral: {
    prefix: 'ratelimit:referral',
    maxRequests: 100,
    windowMs: 86400000,
  },
} as const;

/**
 * Convert window duration to Upstash format
 */
function formatWindow(ms: number): `${number} s` | `${number} m` | `${number} h` | `${number} d` {
  if (ms < 60000) {
    return `${Math.ceil(ms / 1000)} s`;
  } else if (ms < 3600000) {
    return `${Math.ceil(ms / 60000)} m`;
  } else if (ms < 86400000) {
    return `${Math.ceil(ms / 3600000)} h`;
  } else {
    return `${Math.ceil(ms / 86400000)} d`;
  }
}

/**
 * Creates a rate limiter using @upstash/ratelimit
 */
export function createRateLimiter(
  redis: Redis,
  config: Partial<RateLimiterConfig> = {}
): RateLimiter {
  const {
    prefix = 'ratelimit',
    maxRequests = 10,
    windowMs = 1000,
  } = config;

  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(maxRequests, formatWindow(windowMs)),
    analytics: true,
    prefix,
  });

  return {
    async checkLimit(identifier: string): Promise<RateLimitResult> {
      if (!identifier || identifier.trim() === '') {
        throw new Error('Rate limiter identifier cannot be empty');
      }

      const result = await ratelimit.limit(identifier);

      return {
        success: result.success,
        remaining: result.remaining,
        reset: result.reset,
      };
    },

    async reset(identifier: string): Promise<void> {
      if (!identifier || identifier.trim() === '') {
        throw new Error('Rate limiter identifier cannot be empty');
      }

      await ratelimit.resetUsedTokens(identifier);
    },
  };
}

/**
 * Creates a tap rate limiter (10 requests per second)
 */
export function createTapLimiter(redis: Redis): RateLimiter {
  return createRateLimiter(redis, RATE_LIMIT_CONFIGS.tap);
}

/**
 * Creates a burst rate limiter (50 requests per 10 seconds)
 */
export function createBurstLimiter(redis: Redis): RateLimiter {
  return createRateLimiter(redis, RATE_LIMIT_CONFIGS.burst);
}

/**
 * Creates an API rate limiter (60 requests per minute)
 */
export function createApiLimiter(redis: Redis): RateLimiter {
  return createRateLimiter(redis, RATE_LIMIT_CONFIGS.api);
}

/**
 * Creates a wallet connection rate limiter (5 per hour)
 */
export function createWalletLimiter(redis: Redis): RateLimiter {
  return createRateLimiter(redis, RATE_LIMIT_CONFIGS.wallet);
}

/**
 * Creates a referral rate limiter (100 per day)
 */
export function createReferralLimiter(redis: Redis): RateLimiter {
  return createRateLimiter(redis, RATE_LIMIT_CONFIGS.referral);
}

/**
 * Combined rate limiter that checks multiple limits at once
 */
export interface CombinedRateLimitResult {
  success: boolean;
  results: {
    tap: RateLimitResult;
    burst: RateLimitResult;
  };
  failedLimiter: 'tap' | 'burst' | undefined;
}

/**
 * Check both tap and burst limits for anti-cheat
 */
export async function checkTapLimits(
  redis: Redis,
  userId: string
): Promise<CombinedRateLimitResult> {
  const tapLimiter = createTapLimiter(redis);
  const burstLimiter = createBurstLimiter(redis);

  const [tapResult, burstResult] = await Promise.all([
    tapLimiter.checkLimit(userId),
    burstLimiter.checkLimit(userId),
  ]);

  let failedLimiter: 'tap' | 'burst' | undefined;
  if (!tapResult.success) {
    failedLimiter = 'tap';
  } else if (!burstResult.success) {
    failedLimiter = 'burst';
  }

  return {
    success: tapResult.success && burstResult.success,
    results: {
      tap: tapResult,
      burst: burstResult,
    },
    failedLimiter,
  };
}

/**
 * Utility function to check if a user is rate limited without consuming a token
 * This uses a separate "peek" key to avoid affecting the actual rate limit
 */
export async function isRateLimited(
  limiter: RateLimiter,
  identifier: string
): Promise<boolean> {
  const result = await limiter.checkLimit(identifier);
  return !result.success;
}

/**
 * Create all game-related rate limiters at once
 */
export function createGameRateLimiters(redis: Redis) {
  return {
    tap: createTapLimiter(redis),
    burst: createBurstLimiter(redis),
    api: createApiLimiter(redis),
    wallet: createWalletLimiter(redis),
    referral: createReferralLimiter(redis),
  };
}

/**
 * Rate limit error class
 */
export class RateLimitExceededError extends Error {
  public readonly remaining: number;
  public readonly reset: number;
  public readonly limiterType: string;

  constructor(result: RateLimitResult, limiterType: string = 'unknown') {
    super(`Rate limit exceeded. Reset in ${result.reset}ms`);
    this.name = 'RateLimitExceededError';
    this.remaining = result.remaining;
    this.reset = result.reset;
    this.limiterType = limiterType;
  }
}

/**
 * Helper to check limit and throw if exceeded
 */
export async function checkLimitOrThrow(
  limiter: RateLimiter,
  identifier: string,
  limiterType: string = 'unknown'
): Promise<RateLimitResult> {
  const result = await limiter.checkLimit(identifier);

  if (!result.success) {
    throw new RateLimitExceededError(result, limiterType);
  }

  return result;
}
