import { faker } from '@faker-js/faker';

/**
 * Game state data structure matching domain GameState entity
 */
export interface GameStateData {
  id: string;
  userId: string;
  points: number;
  energy: number;
  level: number;
  totalTaps: number;
  streakDays: number;
  lastTapAt: Date | null;
  lastEnergyRecharge: Date;
  sessionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Tap event data for behavioral analysis
 */
export interface TapEventData {
  id: string;
  userId: string;
  taps: number;
  energy: number;
  timestamp: Date;
  intervalMs: number | null;
  nonce: string;
}

const MAX_ENERGY = 1000;
const MAX_LEVEL = 100;
const POINTS_PER_LEVEL = 10000;

/**
 * Factory for creating Game test data
 */
export class GameFactory {
  /**
   * Create a game state with optional overrides
   */
  static createGameState(overrides: Partial<GameStateData> = {}): GameStateData {
    const now = new Date();
    const points = faker.number.int({ min: 0, max: 500000 });
    const level = Math.min(Math.floor(points / POINTS_PER_LEVEL) + 1, MAX_LEVEL);

    return {
      id: faker.string.uuid(),
      userId: faker.string.uuid(),
      points,
      energy: faker.number.int({ min: 0, max: MAX_ENERGY }),
      level,
      totalTaps: points, // 1 point per tap
      streakDays: faker.number.int({ min: 0, max: 30 }),
      lastTapAt: faker.date.recent({ days: 1 }),
      lastEnergyRecharge: faker.date.recent({ days: 1 }),
      sessionCount: faker.number.int({ min: 1, max: 100 }),
      createdAt: faker.date.past({ years: 1 }),
      updatedAt: now,
      ...overrides,
    };
  }

  /**
   * Create a new player game state
   */
  static createNewPlayer(userId: string): GameStateData {
    const now = new Date();
    return this.createGameState({
      userId,
      points: 0,
      energy: MAX_ENERGY,
      level: 1,
      totalTaps: 0,
      streakDays: 0,
      lastTapAt: null,
      sessionCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Create a game state with no energy
   */
  static createExhausted(overrides: Partial<GameStateData> = {}): GameStateData {
    return this.createGameState({
      energy: 0,
      lastTapAt: new Date(),
      ...overrides,
    });
  }

  /**
   * Create a top player game state
   */
  static createTopPlayer(overrides: Partial<GameStateData> = {}): GameStateData {
    return this.createGameState({
      points: faker.number.int({ min: 500000, max: 2000000 }),
      energy: MAX_ENERGY,
      level: faker.number.int({ min: 50, max: MAX_LEVEL }),
      streakDays: 30,
      sessionCount: faker.number.int({ min: 50, max: 200 }),
      ...overrides,
    });
  }

  /**
   * Create a tap event
   */
  static createTapEvent(overrides: Partial<TapEventData> = {}): TapEventData {
    return {
      id: faker.string.uuid(),
      userId: faker.string.uuid(),
      taps: faker.number.int({ min: 1, max: 10 }),
      energy: faker.number.int({ min: 0, max: MAX_ENERGY }),
      timestamp: new Date(),
      intervalMs: faker.number.int({ min: 100, max: 2000 }),
      nonce: faker.string.uuid(),
      ...overrides,
    };
  }

  /**
   * Create a sequence of tap events (for behavioral analysis)
   */
  static createTapSequence(
    userId: string,
    count: number,
    pattern: 'human' | 'bot' | 'random' = 'random'
  ): TapEventData[] {
    const events: TapEventData[] = [];
    let currentTime = Date.now();

    for (let i = 0; i < count; i++) {
      let intervalMs: number;

      switch (pattern) {
        case 'human':
          // Human pattern: variable intervals, bursts and pauses
          intervalMs = faker.number.int({ min: 150, max: 800 });
          if (faker.datatype.boolean({ probability: 0.1 })) {
            intervalMs += faker.number.int({ min: 2000, max: 5000 }); // Pause
          }
          break;
        case 'bot':
          // Bot pattern: very regular intervals
          intervalMs = 100 + faker.number.int({ min: -5, max: 5 }); // Almost constant
          break;
        case 'random':
        default:
          intervalMs = faker.number.int({ min: 50, max: 3000 });
      }

      currentTime += intervalMs;

      events.push({
        id: faker.string.uuid(),
        userId,
        taps: 1,
        energy: MAX_ENERGY - i,
        timestamp: new Date(currentTime),
        intervalMs: i === 0 ? null : intervalMs,
        nonce: faker.string.uuid(),
      });
    }

    return events;
  }

  /**
   * Create multiple game states
   */
  static createMany(count: number, overrides: Partial<GameStateData> = {}): GameStateData[] {
    return Array.from({ length: count }, () => this.createGameState(overrides));
  }

  /**
   * Create leaderboard data (sorted by points)
   */
  static createLeaderboard(count: number): GameStateData[] {
    const states = this.createMany(count);
    return states.sort((a, b) => b.points - a.points);
  }
}
