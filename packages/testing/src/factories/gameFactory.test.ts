import { describe, it, expect } from 'vitest';
import { GameFactory } from './gameFactory.js';

describe('GameFactory', () => {
  describe('createGameState', () => {
    it('should create a game state with all fields', () => {
      const state = GameFactory.createGameState();

      expect(state.id).toBeDefined();
      expect(state.userId).toBeDefined();
      expect(state.points).toBeGreaterThanOrEqual(0);
      expect(state.energy).toBeGreaterThanOrEqual(0);
      expect(state.energy).toBeLessThanOrEqual(1000);
      expect(state.level).toBeGreaterThanOrEqual(1);
      expect(state.createdAt).toBeInstanceOf(Date);
    });

    it('should apply overrides', () => {
      const state = GameFactory.createGameState({
        points: 50000,
        energy: 500,
      });

      expect(state.points).toBe(50000);
      expect(state.energy).toBe(500);
    });
  });

  describe('createNewPlayer', () => {
    it('should create a fresh game state', () => {
      const userId = 'user-123';
      const state = GameFactory.createNewPlayer(userId);

      expect(state.userId).toBe(userId);
      expect(state.points).toBe(0);
      expect(state.energy).toBe(1000);
      expect(state.level).toBe(1);
      expect(state.totalTaps).toBe(0);
      expect(state.streakDays).toBe(0);
      expect(state.lastTapAt).toBeNull();
    });
  });

  describe('createExhausted', () => {
    it('should create a state with no energy', () => {
      const state = GameFactory.createExhausted();

      expect(state.energy).toBe(0);
      expect(state.lastTapAt).toBeInstanceOf(Date);
    });
  });

  describe('createTopPlayer', () => {
    it('should create a high-scoring state', () => {
      const state = GameFactory.createTopPlayer();

      expect(state.points).toBeGreaterThanOrEqual(500000);
      expect(state.level).toBeGreaterThanOrEqual(50);
      expect(state.streakDays).toBe(30);
    });
  });

  describe('createTapEvent', () => {
    it('should create a tap event', () => {
      const event = GameFactory.createTapEvent();

      expect(event.id).toBeDefined();
      expect(event.userId).toBeDefined();
      expect(event.taps).toBeGreaterThan(0);
      expect(event.nonce).toBeDefined();
      expect(event.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('createTapSequence', () => {
    it('should create a sequence of tap events', () => {
      const userId = 'user-123';
      const sequence = GameFactory.createTapSequence(userId, 10);

      expect(sequence).toHaveLength(10);
      sequence.forEach((event, index) => {
        expect(event.userId).toBe(userId);
        if (index === 0) {
          expect(event.intervalMs).toBeNull();
        } else {
          expect(event.intervalMs).toBeGreaterThan(0);
        }
      });
    });

    it('should create human-like pattern with high variance', () => {
      const sequence = GameFactory.createTapSequence('user', 20, 'human');
      const intervals = sequence
        .map((e) => e.intervalMs)
        .filter((i): i is number => i !== null);

      // Human pattern should have varying intervals
      const min = Math.min(...intervals);
      const max = Math.max(...intervals);
      expect(max - min).toBeGreaterThan(100); // Significant variance
    });

    it('should create bot-like pattern with low variance', () => {
      const sequence = GameFactory.createTapSequence('user', 20, 'bot');
      const intervals = sequence
        .map((e) => e.intervalMs)
        .filter((i): i is number => i !== null);

      // Bot pattern should have consistent intervals
      const min = Math.min(...intervals);
      const max = Math.max(...intervals);
      expect(max - min).toBeLessThan(50); // Low variance
    });
  });

  describe('createLeaderboard', () => {
    it('should create sorted leaderboard', () => {
      const leaderboard = GameFactory.createLeaderboard(10);

      expect(leaderboard).toHaveLength(10);

      // Verify sorted by points descending
      for (let i = 1; i < leaderboard.length; i++) {
        expect(leaderboard[i - 1]!.points).toBeGreaterThanOrEqual(leaderboard[i]!.points);
      }
    });
  });
});
