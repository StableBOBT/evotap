import { describe, it, expect } from 'vitest';
import { Energy } from '../Energy.js';

describe('Energy', () => {
  describe('create', () => {
    it('should create energy with valid value', () => {
      const result = Energy.create(500);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.value).toBe(500);
      }
    });

    it('should cap at max energy (1000)', () => {
      const result = Energy.create(1500);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.value).toBe(1000);
      }
    });

    it('should fail for negative values', () => {
      const result = Energy.create(-100);

      expect(result.isFail()).toBe(true);
    });

    it('should allow zero energy', () => {
      const result = Energy.create(0);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.value).toBe(0);
      }
    });
  });

  describe('consume', () => {
    it('should decrease energy by 1', () => {
      const energy = Energy.create(100).value as Energy;

      const result = energy.consume();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.value).toBe(99);
      }
    });

    it('should fail when energy is zero', () => {
      const energy = Energy.create(0).value as Energy;

      const result = energy.consume();

      expect(result.isFail()).toBe(true);
    });

    it('should consume multiple times correctly', () => {
      let energy = Energy.create(5).value as Energy;

      for (let i = 0; i < 5; i++) {
        const result = energy.consume();
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          energy = result.value;
        }
      }

      expect(energy.value).toBe(0);

      // Next consume should fail
      const result = energy.consume();
      expect(result.isFail()).toBe(true);
    });
  });

  describe('consumeAmount', () => {
    it('should decrease energy by specified amount', () => {
      const energy = Energy.create(100).value as Energy;

      const result = energy.consumeAmount(30);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.value).toBe(70);
      }
    });

    it('should fail when trying to consume more than available', () => {
      const energy = Energy.create(50).value as Energy;

      const result = energy.consumeAmount(60);

      expect(result.isFail()).toBe(true);
    });
  });

  describe('recharge', () => {
    it('should increase energy based on minutes', () => {
      const energy = Energy.create(500).value as Energy;

      const result = energy.recharge(60); // 60 minutes = 60 energy

      expect(result.value).toBe(560);
    });

    it('should not exceed max energy', () => {
      const energy = Energy.create(990).value as Energy;

      const result = energy.recharge(60);

      expect(result.value).toBe(1000);
    });

    it('should work from zero energy', () => {
      const energy = Energy.create(0).value as Energy;

      const result = energy.recharge(30);

      expect(result.value).toBe(30);
    });
  });

  describe('isFull', () => {
    it('should return true when at max', () => {
      const energy = Energy.create(1000).value as Energy;

      expect(energy.isFull()).toBe(true);
    });

    it('should return false when below max', () => {
      const energy = Energy.create(999).value as Energy;

      expect(energy.isFull()).toBe(false);
    });
  });

  describe('isEmpty', () => {
    it('should return true when at zero', () => {
      const energy = Energy.create(0).value as Energy;

      expect(energy.isEmpty()).toBe(true);
    });

    it('should return false when above zero', () => {
      const energy = Energy.create(1).value as Energy;

      expect(energy.isEmpty()).toBe(false);
    });
  });

  describe('percentage', () => {
    it('should return correct percentage', () => {
      const energy = Energy.create(500).value as Energy;

      expect(energy.percentage()).toBe(50);
    });

    it('should return 100 when full', () => {
      const energy = Energy.create(1000).value as Energy;

      expect(energy.percentage()).toBe(100);
    });

    it('should return 0 when empty', () => {
      const energy = Energy.create(0).value as Energy;

      expect(energy.percentage()).toBe(0);
    });
  });
});
