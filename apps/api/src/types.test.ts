/**
 * Game Types and Config Tests
 * Tests for level calculation and game configuration
 */

import { describe, it, expect } from 'vitest';
import {
  calculateLevel,
  pointsToNextLevel,
  ENERGY,
  POINTS,
  REFERRAL,
  LEVEL_THRESHOLDS,
  RATE_LIMITS,
} from '@app/config';

describe('calculateLevel', () => {
  it('should return level 1 for 0 points', () => {
    expect(calculateLevel(0)).toBe(1);
  });

  it('should return level 1 for points below first threshold', () => {
    // Level 2 threshold is 5000
    expect(calculateLevel(4999)).toBe(1);
  });

  it('should return level 2 at exactly 5000 points', () => {
    expect(calculateLevel(5000)).toBe(2);
  });

  it('should return level 3 at 25000 points', () => {
    expect(calculateLevel(25000)).toBe(3);
  });

  it('should return level 4 at 100000 points', () => {
    expect(calculateLevel(100000)).toBe(4);
  });

  it('should return level 5 at 500000 points', () => {
    expect(calculateLevel(500000)).toBe(5);
  });

  it('should return level 6 at 1000000 points', () => {
    expect(calculateLevel(1000000)).toBe(6);
  });

  it('should return correct level for points between thresholds', () => {
    // 10000 is between level 2 (5000) and level 3 (25000)
    expect(calculateLevel(10000)).toBe(2);
    // 50000 is between level 3 (25000) and level 4 (100000)
    expect(calculateLevel(50000)).toBe(3);
  });

  it('should return max level for very high points', () => {
    expect(calculateLevel(100000000)).toBe(10);
    expect(calculateLevel(999999999)).toBe(10);
  });

  it('should handle negative points gracefully', () => {
    // Should default to level 1
    expect(calculateLevel(-100)).toBe(1);
  });
});

describe('pointsToNextLevel', () => {
  it('should calculate points needed from 0', () => {
    // From 0 points, need 5000 to reach level 2
    expect(pointsToNextLevel(0)).toBe(5000);
  });

  it('should calculate points needed mid-level', () => {
    // From 2500 points (level 1), need 2500 more to reach 5000 (level 2)
    expect(pointsToNextLevel(2500)).toBe(2500);
  });

  it('should calculate points from level 2', () => {
    // From 5000 points (level 2), need 20000 to reach 25000 (level 3)
    expect(pointsToNextLevel(5000)).toBe(20000);
  });

  it('should calculate points mid-level 2', () => {
    // From 15000 points (level 2), need 10000 to reach 25000 (level 3)
    expect(pointsToNextLevel(15000)).toBe(10000);
  });

  it('should return 0 at max level', () => {
    expect(pointsToNextLevel(100000000)).toBe(0);
    expect(pointsToNextLevel(999999999)).toBe(0);
  });
});

describe('ENERGY config', () => {
  it('should have valid max energy', () => {
    expect(ENERGY.MAX).toBeGreaterThan(0);
  });

  it('should have valid energy regeneration rate', () => {
    expect(ENERGY.REGEN_PER_SECOND).toBeGreaterThan(0);
  });

  it('should have valid energy per tap', () => {
    expect(ENERGY.TAP_COST).toBeGreaterThan(0);
    expect(ENERGY.TAP_COST).toBeLessThanOrEqual(ENERGY.MAX);
  });
});

describe('POINTS config', () => {
  it('should have valid points per tap', () => {
    expect(POINTS.PER_TAP).toBeGreaterThan(0);
  });

  it('should have valid referral bonus', () => {
    expect(POINTS.REFERRAL_BONUS).toBeGreaterThan(0);
  });
});

describe('LEVEL_THRESHOLDS', () => {
  it('should have thresholds in ascending order', () => {
    for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
      expect(LEVEL_THRESHOLDS[i]).toBeGreaterThan(LEVEL_THRESHOLDS[i - 1]!);
    }
  });

  it('should start at 0', () => {
    expect(LEVEL_THRESHOLDS[0]).toBe(0);
  });
});

describe('RATE_LIMITS', () => {
  it('should have reasonable tap rate limits', () => {
    expect(RATE_LIMITS.TAP.MAX_PER_SECOND).toBeGreaterThan(0);
    expect(RATE_LIMITS.TAP.MAX_PER_SECOND).toBeLessThan(20);
    expect(RATE_LIMITS.TAP.BURST_MAX_PER_10_SECONDS).toBeGreaterThan(RATE_LIMITS.TAP.MAX_PER_SECOND);
  });
});

describe('REFERRAL config', () => {
  it('should have valid referral code length', () => {
    expect(REFERRAL.CODE_LENGTH).toBeGreaterThan(4);
    expect(REFERRAL.CODE_LENGTH).toBeLessThan(20);
  });

  it('should have valid bonus points', () => {
    expect(REFERRAL.BONUS_POINTS).toBeGreaterThan(0);
  });
});
