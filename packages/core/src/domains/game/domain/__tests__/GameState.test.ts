import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameState } from '../GameState.js';
import { TelegramId } from '../../../user/domain/TelegramId.js';

describe('GameState', () => {
  const createValidUserId = () => {
    const result = TelegramId.create(123456789);
    if (!result.isOk()) throw new Error('Failed to create TelegramId');
    return result.value;
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('create', () => {
    it('should create new game state with default values', () => {
      const userId = createValidUserId();

      const result = GameState.create({ userId });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.userId.equals(userId)).toBe(true);
        expect(result.value.points).toBe(0);
        expect(result.value.energy).toBe(1000);
        expect(result.value.level).toBe(1);
        expect(result.value.totalTaps).toBe(0);
        expect(result.value.streakDays).toBe(0);
        expect(result.value.lastTapAt).toBeNull();
      }
    });
  });

  describe('tap', () => {
    it('should increase points and decrease energy', () => {
      const userId = createValidUserId();
      const gameResult = GameState.create({ userId });
      expect(gameResult.isOk()).toBe(true);
      if (!gameResult.isOk()) return;

      const game = gameResult.value;
      const result = game.tap();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(game.points).toBeGreaterThan(0);
        expect(game.energy).toBe(999);
        expect(game.totalTaps).toBe(1);
      }
    });

    it('should fail when energy is zero', () => {
      const userId = createValidUserId();
      const gameResult = GameState.create({ userId });
      expect(gameResult.isOk()).toBe(true);
      if (!gameResult.isOk()) return;

      const game = gameResult.value;

      // Drain all energy
      for (let i = 0; i < 1000; i++) {
        game.tap();
      }

      const result = game.tap();
      expect(result.isFail()).toBe(true);
    });

    it('should track total taps', () => {
      const userId = createValidUserId();
      const gameResult = GameState.create({ userId });
      expect(gameResult.isOk()).toBe(true);
      if (!gameResult.isOk()) return;

      const game = gameResult.value;

      for (let i = 0; i < 10; i++) {
        game.tap();
      }

      expect(game.totalTaps).toBe(10);
    });

    it('should update lastTapAt', () => {
      const userId = createValidUserId();
      const gameResult = GameState.create({ userId });
      expect(gameResult.isOk()).toBe(true);
      if (!gameResult.isOk()) return;

      const game = gameResult.value;
      const now = new Date('2024-01-15T12:00:00Z');
      vi.setSystemTime(now);

      game.tap();

      expect(game.lastTapAt).toEqual(now);
    });
  });

  describe('multiTap', () => {
    it('should process multiple taps at once', () => {
      const userId = createValidUserId();
      const gameResult = GameState.create({ userId });
      expect(gameResult.isOk()).toBe(true);
      if (!gameResult.isOk()) return;

      const game = gameResult.value;
      const result = game.multiTap(10);

      expect(result.isOk()).toBe(true);
      expect(game.energy).toBe(990);
      expect(game.totalTaps).toBe(10);
    });

    it('should fail when not enough energy for all taps', () => {
      const userId = createValidUserId();
      const gameResult = GameState.create({ userId });
      expect(gameResult.isOk()).toBe(true);
      if (!gameResult.isOk()) return;

      const game = gameResult.value;
      // Try to tap more than available energy
      const result = game.multiTap(1001);

      expect(result.isFail()).toBe(true);
    });
  });

  describe('rechargeEnergy', () => {
    it('should recharge based on time passed', () => {
      const userId = createValidUserId();
      const gameResult = GameState.create({ userId });
      expect(gameResult.isOk()).toBe(true);
      if (!gameResult.isOk()) return;

      const game = gameResult.value;

      // Drain some energy
      for (let i = 0; i < 100; i++) {
        game.tap();
      }
      expect(game.energy).toBe(900);

      // Wait 60 minutes (60 energy restored)
      vi.advanceTimersByTime(60 * 60 * 1000);

      game.rechargeEnergy();

      expect(game.energy).toBe(960);
    });

    it('should not exceed max energy', () => {
      const userId = createValidUserId();
      const gameResult = GameState.create({ userId });
      expect(gameResult.isOk()).toBe(true);
      if (!gameResult.isOk()) return;

      const game = gameResult.value;

      // Tap once
      game.tap();
      expect(game.energy).toBe(999);

      // Wait many hours
      vi.advanceTimersByTime(24 * 60 * 60 * 1000);

      game.rechargeEnergy();

      expect(game.energy).toBe(1000);
    });
  });

  describe('checkLevelUp', () => {
    it('should level up when enough points', () => {
      const userId = createValidUserId();
      const gameResult = GameState.create({ userId });
      expect(gameResult.isOk()).toBe(true);
      if (!gameResult.isOk()) return;

      const game = gameResult.value;

      // Add enough points (need 1000 for level 2)
      for (let i = 0; i < 1000; i++) {
        const tapResult = game.tap();
        if (tapResult.isFail()) break;
      }

      // Points gained should be >= 1000
      expect(game.points).toBeGreaterThanOrEqual(1000);

      const didLevelUp = game.checkLevelUp();

      if (game.points >= 1000) {
        expect(didLevelUp).toBe(true);
        expect(game.level).toBe(2);
      }
    });

    it('should not level up when not enough points', () => {
      const userId = createValidUserId();
      const gameResult = GameState.create({ userId });
      expect(gameResult.isOk()).toBe(true);
      if (!gameResult.isOk()) return;

      const game = gameResult.value;

      // Just one tap
      game.tap();

      const didLevelUp = game.checkLevelUp();

      expect(didLevelUp).toBe(false);
      expect(game.level).toBe(1);
    });
  });

  describe('updateStreak', () => {
    it('should increase streak on consecutive days', () => {
      const userId = createValidUserId();
      const gameResult = GameState.create({ userId });
      expect(gameResult.isOk()).toBe(true);
      if (!gameResult.isOk()) return;

      const game = gameResult.value;

      // Day 1
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
      game.tap();
      game.updateStreak();
      expect(game.streakDays).toBe(1);

      // Day 2
      vi.setSystemTime(new Date('2024-01-16T12:00:00Z'));
      game.tap();
      game.updateStreak();
      expect(game.streakDays).toBe(2);
    });

    it('should reset streak if day is skipped', () => {
      const userId = createValidUserId();
      const gameResult = GameState.create({ userId });
      expect(gameResult.isOk()).toBe(true);
      if (!gameResult.isOk()) return;

      const game = gameResult.value;

      // Day 1
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
      game.tap();
      game.updateStreak();
      expect(game.streakDays).toBe(1);

      // Day 3 (skipped day 2)
      vi.setSystemTime(new Date('2024-01-17T12:00:00Z'));
      game.tap();
      game.updateStreak();
      expect(game.streakDays).toBe(1); // Reset to 1
    });

    it('should not increase streak on same day', () => {
      const userId = createValidUserId();
      const gameResult = GameState.create({ userId });
      expect(gameResult.isOk()).toBe(true);
      if (!gameResult.isOk()) return;

      const game = gameResult.value;

      vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
      game.tap();
      game.updateStreak();
      expect(game.streakDays).toBe(1);

      // Later same day
      vi.setSystemTime(new Date('2024-01-15T18:00:00Z'));
      game.tap();
      game.updateStreak();
      expect(game.streakDays).toBe(1); // Still 1
    });
  });

  describe('hasEnergy', () => {
    it('should return true when energy > 0', () => {
      const userId = createValidUserId();
      const gameResult = GameState.create({ userId });
      expect(gameResult.isOk()).toBe(true);
      if (!gameResult.isOk()) return;

      expect(gameResult.value.hasEnergy()).toBe(true);
    });

    it('should return false when energy is 0', () => {
      const userId = createValidUserId();
      const gameResult = GameState.create({ userId });
      expect(gameResult.isOk()).toBe(true);
      if (!gameResult.isOk()) return;

      const game = gameResult.value;

      // Drain all energy
      for (let i = 0; i < 1000; i++) {
        game.tap();
      }

      expect(game.hasEnergy()).toBe(false);
    });
  });

  describe('energyPercentage', () => {
    it('should return 100 when full', () => {
      const userId = createValidUserId();
      const gameResult = GameState.create({ userId });
      expect(gameResult.isOk()).toBe(true);
      if (!gameResult.isOk()) return;

      expect(gameResult.value.energyPercentage()).toBe(100);
    });

    it('should return correct percentage', () => {
      const userId = createValidUserId();
      const gameResult = GameState.create({ userId });
      expect(gameResult.isOk()).toBe(true);
      if (!gameResult.isOk()) return;

      const game = gameResult.value;

      // Use half energy (500 taps)
      for (let i = 0; i < 500; i++) {
        game.tap();
      }

      expect(game.energyPercentage()).toBe(50);
    });
  });
});
