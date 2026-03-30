import { describe, it, expect } from 'vitest';
import { Points } from '../Points.js';

describe('Points', () => {
  describe('create', () => {
    it('should create points with valid value', () => {
      const result = Points.create(1000);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.value).toBe(1000);
      }
    });

    it('should create zero points', () => {
      const result = Points.create(0);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.value).toBe(0);
      }
    });

    it('should fail for negative values', () => {
      const result = Points.create(-100);

      expect(result.isFail()).toBe(true);
    });

    it('should fail for non-integer values', () => {
      const result = Points.create(100.5);

      expect(result.isFail()).toBe(true);
    });
  });

  describe('zero', () => {
    it('should return a Points instance with zero value', () => {
      const points = Points.zero();

      expect(points.value).toBe(0);
    });
  });

  describe('add', () => {
    it('should add points correctly', () => {
      const points = Points.create(100).value as Points;

      const result = points.add(50);

      expect(result.value).toBe(150);
    });

    it('should handle adding zero', () => {
      const points = Points.create(100).value as Points;

      const result = points.add(0);

      expect(result.value).toBe(100);
    });

    it('should handle large additions', () => {
      const points = Points.create(1000000).value as Points;

      const result = points.add(500000);

      expect(result.value).toBe(1500000);
    });
  });

  describe('subtract', () => {
    it('should subtract points correctly', () => {
      const points = Points.create(100).value as Points;

      const result = points.subtract(30);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.value).toBe(70);
      }
    });

    it('should fail when trying to subtract more than available', () => {
      const points = Points.create(50).value as Points;

      const result = points.subtract(100);

      expect(result.isFail()).toBe(true);
    });

    it('should allow subtracting to zero', () => {
      const points = Points.create(100).value as Points;

      const result = points.subtract(100);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.value).toBe(0);
      }
    });
  });

  describe('multiply', () => {
    it('should multiply points correctly', () => {
      const points = Points.create(100).value as Points;

      const result = points.multiply(2);

      expect(result.value).toBe(200);
    });

    it('should handle multiplier of 1', () => {
      const points = Points.create(100).value as Points;

      const result = points.multiply(1);

      expect(result.value).toBe(100);
    });

    it('should handle decimal multipliers (rounds down)', () => {
      const points = Points.create(100).value as Points;

      const result = points.multiply(1.5);

      expect(result.value).toBe(150);
    });
  });

  describe('isGreaterThan', () => {
    it('should return true when greater', () => {
      const points1 = Points.create(100).value as Points;
      const points2 = Points.create(50).value as Points;

      expect(points1.isGreaterThan(points2)).toBe(true);
    });

    it('should return false when equal', () => {
      const points1 = Points.create(100).value as Points;
      const points2 = Points.create(100).value as Points;

      expect(points1.isGreaterThan(points2)).toBe(false);
    });

    it('should return false when less', () => {
      const points1 = Points.create(50).value as Points;
      const points2 = Points.create(100).value as Points;

      expect(points1.isGreaterThan(points2)).toBe(false);
    });
  });

  describe('isGreaterThanOrEqual', () => {
    it('should return true when greater', () => {
      const points1 = Points.create(100).value as Points;
      const points2 = Points.create(50).value as Points;

      expect(points1.isGreaterThanOrEqual(points2)).toBe(true);
    });

    it('should return true when equal', () => {
      const points1 = Points.create(100).value as Points;
      const points2 = Points.create(100).value as Points;

      expect(points1.isGreaterThanOrEqual(points2)).toBe(true);
    });

    it('should return false when less', () => {
      const points1 = Points.create(50).value as Points;
      const points2 = Points.create(100).value as Points;

      expect(points1.isGreaterThanOrEqual(points2)).toBe(false);
    });
  });

  describe('format', () => {
    it('should format small numbers without suffix', () => {
      const points = Points.create(999).value as Points;

      expect(points.format()).toBe('999');
    });

    it('should format thousands with K suffix', () => {
      const points = Points.create(1500).value as Points;

      expect(points.format()).toBe('1.5K');
    });

    it('should format millions with M suffix', () => {
      const points = Points.create(2500000).value as Points;

      expect(points.format()).toBe('2.5M');
    });

    it('should format billions with B suffix', () => {
      const points = Points.create(1000000000).value as Points;

      expect(points.format()).toBe('1B');
    });
  });
});
