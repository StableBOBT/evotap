import { describe, it, expect } from 'vitest';
import { Level } from '../Level.js';
import { Points } from '../Points.js';

describe('Level', () => {
  describe('create', () => {
    it('should create level 1 by default', () => {
      const level = Level.create();

      expect(level.value).toBe(1);
    });

    it('should create specified level', () => {
      const result = Level.create(5);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.value).toBe(5);
      }
    });

    it('should fail for level 0', () => {
      const result = Level.create(0);

      expect(result.isFail()).toBe(true);
    });

    it('should fail for negative level', () => {
      const result = Level.create(-1);

      expect(result.isFail()).toBe(true);
    });

    it('should fail for non-integer level', () => {
      const result = Level.create(1.5);

      expect(result.isFail()).toBe(true);
    });
  });

  describe('pointsToNextLevel', () => {
    it('should return points needed for level 2', () => {
      const level = Level.create(); // Level 1

      const pointsNeeded = level.pointsToNextLevel();

      // Formula: 1000 * level^1.5 = 1000 for level 1
      expect(pointsNeeded).toBe(1000);
    });

    it('should return more points for higher levels', () => {
      const level1 = Level.create();
      const level5 = Level.create(5).value as Level;

      expect(level5.pointsToNextLevel()).toBeGreaterThan(level1.pointsToNextLevel());
    });
  });

  describe('canLevelUp', () => {
    it('should return true when enough points', () => {
      const level = Level.create();
      const points = Points.create(1500).value as Points;

      expect(level.canLevelUp(points)).toBe(true);
    });

    it('should return false when not enough points', () => {
      const level = Level.create();
      const points = Points.create(500).value as Points;

      expect(level.canLevelUp(points)).toBe(false);
    });

    it('should return true when exactly enough points', () => {
      const level = Level.create();
      const points = Points.create(1000).value as Points;

      expect(level.canLevelUp(points)).toBe(true);
    });
  });

  describe('levelUp', () => {
    it('should increase level by 1', () => {
      const level = Level.create();

      const newLevel = level.levelUp();

      expect(newLevel.value).toBe(2);
    });

    it('should work for multiple level ups', () => {
      let level = Level.create();

      level = level.levelUp();
      level = level.levelUp();
      level = level.levelUp();

      expect(level.value).toBe(4);
    });
  });

  describe('tapMultiplier', () => {
    it('should return 1 for level 1', () => {
      const level = Level.create();

      expect(level.tapMultiplier()).toBe(1);
    });

    it('should increase with level', () => {
      const level10 = Level.create(10).value as Level;

      // 1 + (level - 1) * 0.1 = 1 + 9 * 0.1 = 1.9
      expect(level10.tapMultiplier()).toBeCloseTo(1.9, 2);
    });
  });

  describe('energyBonus', () => {
    it('should return 0 for level 1', () => {
      const level = Level.create();

      expect(level.energyBonus()).toBe(0);
    });

    it('should return bonus for higher levels', () => {
      const level10 = Level.create(10).value as Level;

      // (level - 1) * 10 = 9 * 10 = 90
      expect(level10.energyBonus()).toBe(90);
    });
  });

  describe('title', () => {
    it('should return Novice for level 1-9', () => {
      const level = Level.create();

      expect(level.title()).toBe('Novice');
    });

    it('should return Tapper for level 10-24', () => {
      const level = Level.create(10).value as Level;

      expect(level.title()).toBe('Tapper');
    });

    it('should return Pro for level 25-49', () => {
      const level = Level.create(25).value as Level;

      expect(level.title()).toBe('Pro');
    });

    it('should return Master for level 50-99', () => {
      const level = Level.create(50).value as Level;

      expect(level.title()).toBe('Master');
    });

    it('should return Legend for level 100+', () => {
      const level = Level.create(100).value as Level;

      expect(level.title()).toBe('Legend');
    });
  });
});
