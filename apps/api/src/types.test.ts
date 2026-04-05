/**
 * Game Types and Config Tests
 * Tests for level calculation and game configuration
 */

import { describe, it, expect } from 'vitest';
import { calculateLevel, pointsToNextLevel, GAME_CONFIG } from './types.js';

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

describe('GAME_CONFIG', () => {
  it('should have valid max energy', () => {
    expect(GAME_CONFIG.MAX_ENERGY).toBeGreaterThan(0);
  });

  it('should have valid energy regeneration rate', () => {
    expect(GAME_CONFIG.ENERGY_REGEN_RATE).toBeGreaterThan(0);
  });

  it('should have valid energy per tap', () => {
    expect(GAME_CONFIG.ENERGY_PER_TAP).toBeGreaterThan(0);
    expect(GAME_CONFIG.ENERGY_PER_TAP).toBeLessThanOrEqual(GAME_CONFIG.MAX_ENERGY);
  });

  it('should have valid referral bonuses', () => {
    expect(GAME_CONFIG.REFERRAL_BONUS_INVITEE).toBeGreaterThan(0);
    expect(GAME_CONFIG.REFERRAL_BONUS_REFERRER).toBeGreaterThan(0);
  });

  it('should have level thresholds in ascending order', () => {
    const thresholds = GAME_CONFIG.LEVEL_THRESHOLDS;
    for (let i = 1; i < thresholds.length; i++) {
      expect(thresholds[i]).toBeGreaterThan(thresholds[i - 1]!);
    }
  });

  it('should have reasonable rate limits', () => {
    expect(GAME_CONFIG.MAX_TAPS_PER_SECOND).toBeGreaterThan(0);
    expect(GAME_CONFIG.MAX_TAPS_PER_SECOND).toBeLessThan(20); // Not too fast
    expect(GAME_CONFIG.MAX_TAPS_PER_10_SECONDS).toBeGreaterThan(GAME_CONFIG.MAX_TAPS_PER_SECOND);
  });

  it('should have valid referral code length', () => {
    expect(GAME_CONFIG.REFERRAL_CODE_LENGTH).toBeGreaterThan(4); // At least 5 chars for uniqueness
    expect(GAME_CONFIG.REFERRAL_CODE_LENGTH).toBeLessThan(20); // Not too long
  });
});
