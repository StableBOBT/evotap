import { describe, it, expect } from 'vitest';
import { GAME, RATE_LIMITS, SECURITY, TOKENOMICS, API_PATHS, REDIS_KEYS } from './constants.js';

describe('GAME constants', () => {
  it('should have valid energy configuration', () => {
    expect(GAME.ENERGY.MAX).toBe(1000);
    expect(GAME.ENERGY.REGEN_PER_SECOND).toBeGreaterThan(0);
    expect(GAME.ENERGY.TAP_COST).toBeGreaterThan(0);
  });

  it('should have valid points configuration', () => {
    expect(GAME.POINTS.PER_TAP).toBeGreaterThan(0);
    expect(GAME.POINTS.REFERRAL_BONUS).toBeGreaterThan(0);
    expect(GAME.POINTS.PREMIUM_MULTIPLIER).toBeGreaterThan(1);
  });

  it('should have valid level configuration', () => {
    expect(GAME.LEVELS.MAX).toBeGreaterThan(0);
    expect(GAME.LEVELS.THRESHOLDS.length).toBeGreaterThan(0);
    expect(GAME.LEVELS.THRESHOLDS[0]).toBe(0);
  });

  it('should have valid streak configuration', () => {
    expect(GAME.STREAKS.MAX_DAYS).toBeGreaterThan(0);
    expect(GAME.STREAKS.RESET_HOURS).toBeGreaterThan(24);
  });
});

describe('RATE_LIMITS constants', () => {
  it('should have sensible tap limits', () => {
    expect(RATE_LIMITS.TAP.MAX_PER_SECOND).toBeLessThanOrEqual(15);
    expect(RATE_LIMITS.TAP.BURST_MAX_PER_10_SECONDS).toBeLessThanOrEqual(100);
  });

  it('should have API rate limits', () => {
    expect(RATE_LIMITS.API.MAX_PER_MINUTE).toBeGreaterThan(0);
    expect(RATE_LIMITS.API.SLOWDOWN_THRESHOLD).toBeLessThan(RATE_LIMITS.API.MAX_PER_MINUTE);
  });
});

describe('SECURITY constants', () => {
  it('should have valid auth expiry times', () => {
    expect(SECURITY.AUTH_DATA_EXPIRY_SECONDS).toBe(300); // 5 minutes
    expect(SECURITY.JWT_EXPIRY_SECONDS).toBe(86400); // 24 hours
  });

  it('should have sensible trust score requirements', () => {
    expect(SECURITY.TRUST_SCORE.MIN_FOR_AIRDROP).toBeGreaterThanOrEqual(0);
    expect(SECURITY.TRUST_SCORE.MIN_FOR_AIRDROP).toBeLessThanOrEqual(100);
    expect(SECURITY.TRUST_SCORE.MIN_SESSIONS).toBeGreaterThan(0);
  });
});

describe('TOKENOMICS constants', () => {
  it('should have correct total supply', () => {
    expect(TOKENOMICS.TOTAL_SUPPLY).toBe(1_000_000_000);
  });

  it('should have distribution that sums to 100%', () => {
    const total =
      TOKENOMICS.DISTRIBUTION.COMMUNITY +
      TOKENOMICS.DISTRIBUTION.LIQUIDITY +
      TOKENOMICS.DISTRIBUTION.TEAM;

    expect(total).toBe(1);
  });

  it('should have community breakdown that sums to 80% of community allocation', () => {
    const communityTotal =
      TOKENOMICS.COMMUNITY_BREAKDOWN.TAP_TO_EARN +
      TOKENOMICS.COMMUNITY_BREAKDOWN.REFERRALS +
      TOKENOMICS.COMMUNITY_BREAKDOWN.AIRDROPS;

    expect(communityTotal).toBeCloseTo(0.8, 10);
  });
});

describe('API_PATHS constants', () => {
  it('should have versioned API paths', () => {
    expect(API_PATHS.AUTH).toContain('/api/v1');
    expect(API_PATHS.GAME).toContain('/api/v1');
    expect(API_PATHS.USER).toContain('/api/v1');
  });
});

describe('REDIS_KEYS constants', () => {
  it('should have proper key prefixes with colons', () => {
    expect(REDIS_KEYS.SESSION).toMatch(/:$/);
    expect(REDIS_KEYS.LEADERBOARD).toMatch(/:$/);
    expect(REDIS_KEYS.RATELIMIT).toMatch(/:$/);
  });
});
