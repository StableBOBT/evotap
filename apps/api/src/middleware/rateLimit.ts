import type { MiddlewareHandler } from 'hono';
import type { Env, Variables } from '../types.js';
import { createRedisClient, type RedisClient } from '../lib/redis.js';

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
  /** Maximum requests allowed in window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
  /** Key prefix for Redis */
  keyPrefix: string;
}

/**
 * Rate limit result
 */
interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetIn: number;
  total: number;
}

/**
 * Pre-configured rate limit configurations
 * Based on security requirements from project docs
 */
export const RATE_LIMIT_CONFIGS = {
  /** 10 taps per second */
  tap: {
    maxRequests: 10,
    windowSeconds: 1,
    keyPrefix: 'ratelimit:tap:',
  },
  /** 50 taps per 10 seconds (burst detection) */
  burst: {
    maxRequests: 50,
    windowSeconds: 10,
    keyPrefix: 'ratelimit:burst:',
  },
  /** 60 API requests per minute */
  api: {
    maxRequests: 60,
    windowSeconds: 60,
    keyPrefix: 'ratelimit:api:',
  },
  /** 5 wallet connections per hour */
  wallet: {
    maxRequests: 5,
    windowSeconds: 3600,
    keyPrefix: 'ratelimit:wallet:',
  },
  /** 100 referrals per day */
  referral: {
    maxRequests: 100,
    windowSeconds: 86400,
    keyPrefix: 'ratelimit:referral:',
  },
  /** 5 claim attempts per hour */
  claim: {
    maxRequests: 5,
    windowSeconds: 3600,
    keyPrefix: 'ratelimit:claim:',
  },
} as const;

/**
 * Check rate limit using Redis
 */
async function checkRateLimit(
  redis: RedisClient,
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const key = `${config.keyPrefix}${identifier}`;

  // Increment counter
  const count = await redis.incr(key);

  // Set expiry on first request
  if (count === 1) {
    await redis.expire(key, config.windowSeconds);
  }

  // Get TTL for accurate reset time
  const ttl = await redis.ttl(key);
  const resetIn = ttl > 0 ? ttl : config.windowSeconds;

  const success = count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - count);

  return {
    success,
    remaining,
    resetIn,
    total: config.maxRequests,
  };
}

/**
 * Set rate limit headers on response
 */
function setRateLimitHeaders(
  c: { header: (name: string, value: string) => void },
  result: RateLimitResult
): void {
  c.header('X-RateLimit-Limit', String(result.total));
  c.header('X-RateLimit-Remaining', String(result.remaining));
  c.header('X-RateLimit-Reset', String(Math.ceil(Date.now() / 1000) + result.resetIn));
}

/**
 * Creates a rate limit middleware factory
 */
export function createRateLimitMiddleware(
  configKey: keyof typeof RATE_LIMIT_CONFIGS
): MiddlewareHandler<{ Bindings: Env; Variables: Variables }> {
  const config = RATE_LIMIT_CONFIGS[configKey];

  return async (c, next) => {
    const telegramId = c.get('telegramId');

    if (!telegramId) {
      // No user identified, skip rate limiting
      await next();
      return;
    }

    try {
      const redis = createRedisClient(c.env);
      const result = await checkRateLimit(redis, String(telegramId), config);

      // Set rate limit headers
      setRateLimitHeaders(c, result);

      if (!result.success) {
        return c.json(
          {
            success: false,
            error: 'Rate limit exceeded',
            code: 'RATE_LIMITED',
            retryAfter: result.resetIn,
          },
          429
        );
      }

      await next();
    } catch (error) {
      // Log error but don't fail the request - Redis might be unavailable
      console.error('[RateLimit] Redis error:', error);
      await next();
    }
  };
}

/**
 * Combined rate limit middleware for taps
 * Checks both per-second and burst limits
 */
export const tapRateLimitMiddleware: MiddlewareHandler<{
  Bindings: Env;
  Variables: Variables;
}> = async (c, next) => {
  const telegramId = c.get('telegramId');

  if (!telegramId) {
    await next();
    return;
  }

  try {
    const redis = createRedisClient(c.env);

    // Check per-second limit
    const tapResult = await checkRateLimit(
      redis,
      String(telegramId),
      RATE_LIMIT_CONFIGS.tap
    );

    if (!tapResult.success) {
      setRateLimitHeaders(c, tapResult);
      return c.json(
        {
          success: false,
          error: 'Too many taps per second',
          code: 'TAP_RATE_LIMITED',
          retryAfter: tapResult.resetIn,
        },
        429
      );
    }

    // Check burst limit (10-second window)
    const burstResult = await checkRateLimit(
      redis,
      String(telegramId),
      RATE_LIMIT_CONFIGS.burst
    );

    if (!burstResult.success) {
      // Log suspicious activity for burst detection
      console.warn('[RateLimit] Burst detected:', {
        telegramId,
        timestamp: new Date().toISOString(),
      });

      setRateLimitHeaders(c, burstResult);
      return c.json(
        {
          success: false,
          error: 'Tap burst detected - please slow down',
          code: 'BURST_RATE_LIMITED',
          retryAfter: burstResult.resetIn,
        },
        429
      );
    }

    // Set headers from the tap limit (most relevant for UI)
    setRateLimitHeaders(c, tapResult);

    await next();
  } catch (error) {
    console.error('[RateLimit] Redis error:', error);
    await next();
  }
};

/**
 * Pre-configured rate limit middlewares
 */
export const tapRateLimit = createRateLimitMiddleware('tap');
export const burstRateLimit = createRateLimitMiddleware('burst');
export const apiRateLimit = createRateLimitMiddleware('api');
export const walletRateLimit = createRateLimitMiddleware('wallet');
export const referralRateLimit = createRateLimitMiddleware('referral');
export const claimRateLimit = createRateLimitMiddleware('claim');

/**
 * IP-based rate limiting for unauthenticated requests
 */
export const ipRateLimitMiddleware: MiddlewareHandler<{
  Bindings: Env;
  Variables: Variables;
}> = async (c, next) => {
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';

  try {
    const redis = createRedisClient(c.env);
    const result = await checkRateLimit(redis, ip, {
      maxRequests: 100,
      windowSeconds: 60,
      keyPrefix: 'ratelimit:ip:',
    });

    setRateLimitHeaders(c, result);

    if (!result.success) {
      return c.json(
        {
          success: false,
          error: 'Too many requests from this IP',
          code: 'IP_RATE_LIMITED',
          retryAfter: result.resetIn,
        },
        429
      );
    }

    await next();
  } catch (error) {
    console.error('[RateLimit] Redis error:', error);
    await next();
  }
};
