import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createRateLimiter,
  createTapLimiter,
  createBurstLimiter,
  checkTapLimits,
  RateLimitExceededError,
  checkLimitOrThrow,
  RATE_LIMIT_CONFIGS,
} from '../rateLimiter.js';

// Mock @upstash/ratelimit
const mockLimit = vi.fn();
const mockResetUsedTokens = vi.fn();

vi.mock('@upstash/ratelimit', () => {
  const MockRatelimit = vi.fn().mockImplementation(() => ({
    limit: mockLimit,
    resetUsedTokens: mockResetUsedTokens,
  }));
  // Add static method
  MockRatelimit.slidingWindow = vi.fn().mockReturnValue('slidingWindow');

  return { Ratelimit: MockRatelimit };
});

// Mock Redis client
const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  eval: vi.fn(),
};

describe('Rate Limiter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createRateLimiter', () => {
    it('should create rate limiter with default config', () => {
      const limiter = createRateLimiter(mockRedis as any);

      expect(limiter).toBeDefined();
      expect(limiter.checkLimit).toBeDefined();
      expect(limiter.reset).toBeDefined();
    });

    it('should create rate limiter with custom config', () => {
      const config = {
        prefix: 'custom:',
        maxRequests: 100,
        windowMs: 60000,
      };

      const limiter = createRateLimiter(mockRedis as any, config);

      expect(limiter).toBeDefined();
    });
  });

  describe('checkLimit', () => {
    it('should throw error for empty identifier', async () => {
      const limiter = createRateLimiter(mockRedis as any);

      await expect(limiter.checkLimit('')).rejects.toThrow('identifier cannot be empty');
      await expect(limiter.checkLimit('   ')).rejects.toThrow('identifier cannot be empty');
    });
  });

  describe('reset', () => {
    it('should throw error for empty identifier', async () => {
      const limiter = createRateLimiter(mockRedis as any);

      await expect(limiter.reset('')).rejects.toThrow('identifier cannot be empty');
      await expect(limiter.reset('   ')).rejects.toThrow('identifier cannot be empty');
    });
  });

  describe('RATE_LIMIT_CONFIGS', () => {
    it('should have tap config with correct values', () => {
      expect(RATE_LIMIT_CONFIGS.tap).toEqual({
        prefix: 'ratelimit:tap',
        maxRequests: 10,
        windowMs: 1000,
      });
    });

    it('should have burst config with correct values', () => {
      expect(RATE_LIMIT_CONFIGS.burst).toEqual({
        prefix: 'ratelimit:burst',
        maxRequests: 50,
        windowMs: 10000,
      });
    });

    it('should have api config with correct values', () => {
      expect(RATE_LIMIT_CONFIGS.api).toEqual({
        prefix: 'ratelimit:api',
        maxRequests: 60,
        windowMs: 60000,
      });
    });
  });

  describe('RateLimitExceededError', () => {
    it('should create error with correct properties', () => {
      const result = {
        success: false,
        remaining: 0,
        reset: 5000,
      };

      const error = new RateLimitExceededError(result, 'tap');

      expect(error.name).toBe('RateLimitExceededError');
      expect(error.remaining).toBe(0);
      expect(error.reset).toBe(5000);
      expect(error.limiterType).toBe('tap');
      expect(error.message).toContain('Rate limit exceeded');
    });
  });

  describe('Factory functions', () => {
    it('should create tap limiter', () => {
      const limiter = createTapLimiter(mockRedis as any);
      expect(limiter).toBeDefined();
      expect(limiter.checkLimit).toBeDefined();
    });

    it('should create burst limiter', () => {
      const limiter = createBurstLimiter(mockRedis as any);
      expect(limiter).toBeDefined();
      expect(limiter.checkLimit).toBeDefined();
    });
  });
});
