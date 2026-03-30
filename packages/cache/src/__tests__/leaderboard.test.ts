import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createLeaderboard,
  createTeamLeaderboard,
  createDepartmentLeaderboard,
  LEADERBOARD_KEYS,
} from '../leaderboard.js';

// Mock Redis client
const mockRedis = {
  zadd: vi.fn(),
  zincrby: vi.fn(),
  zrevrank: vi.fn(),
  zscore: vi.fn(),
  zrange: vi.fn(),
  zcard: vi.fn(),
  zrem: vi.fn(),
  set: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
};

describe('Leaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createLeaderboard', () => {
    it('should create leaderboard with default key', () => {
      const leaderboard = createLeaderboard(mockRedis as any);

      expect(leaderboard).toBeDefined();
      expect(leaderboard.setScore).toBeDefined();
      expect(leaderboard.addScore).toBeDefined();
      expect(leaderboard.getTop).toBeDefined();
      expect(leaderboard.getTopPlayers).toBeDefined();
      expect(leaderboard.getRank).toBeDefined();
      expect(leaderboard.getPlayerRank).toBeDefined();
    });

    it('should create leaderboard with custom key', () => {
      const leaderboard = createLeaderboard(mockRedis as any, 'weekly:scores');

      expect(leaderboard).toBeDefined();
    });
  });

  describe('setScore', () => {
    it('should set user score', async () => {
      mockRedis.zadd.mockResolvedValue(1);

      const leaderboard = createLeaderboard(mockRedis as any);

      await leaderboard.setScore('user:123', 1000);

      expect(mockRedis.zadd).toHaveBeenCalledWith(
        expect.any(String),
        { score: 1000, member: 'user:123' }
      );
    });

    it('should throw error for empty userId', async () => {
      const leaderboard = createLeaderboard(mockRedis as any);

      await expect(leaderboard.setScore('', 1000)).rejects.toThrow('User ID cannot be empty');
      await expect(leaderboard.setScore('   ', 1000)).rejects.toThrow('User ID cannot be empty');
    });
  });

  describe('addScore', () => {
    it('should add score without metadata', async () => {
      mockRedis.zadd.mockResolvedValue(1);

      const leaderboard = createLeaderboard(mockRedis as any);

      await leaderboard.addScore('user:123', 1000);

      expect(mockRedis.zadd).toHaveBeenCalledWith(
        expect.any(String),
        { score: 1000, member: 'user:123' }
      );
      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    it('should add score with metadata', async () => {
      mockRedis.zadd.mockResolvedValue(1);
      mockRedis.set.mockResolvedValue('OK');

      const leaderboard = createLeaderboard(mockRedis as any);
      const metadata = { displayName: 'Player1', teamId: 'team-1' };

      await leaderboard.addScore('user:123', 1000, metadata);

      expect(mockRedis.zadd).toHaveBeenCalled();
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining('user:123'),
        JSON.stringify(metadata)
      );
    });
  });

  describe('incrementScore', () => {
    it('should increment user score', async () => {
      mockRedis.zincrby.mockResolvedValue('1100');

      const leaderboard = createLeaderboard(mockRedis as any);

      const newScore = await leaderboard.incrementScore('user:123', 100);

      expect(newScore).toBe(1100);
      expect(mockRedis.zincrby).toHaveBeenCalledWith(
        expect.any(String),
        100,
        'user:123'
      );
    });
  });

  describe('getRank', () => {
    it('should return user rank (1-indexed)', async () => {
      mockRedis.zrevrank.mockResolvedValue(5);
      mockRedis.zscore.mockResolvedValue('5000');

      const leaderboard = createLeaderboard(mockRedis as any);

      const result = await leaderboard.getRank('user:123');

      expect(result).not.toBeNull();
      expect(result!.rank).toBe(6); // Convert to 1-indexed
      expect(result!.score).toBe(5000);
    });

    it('should return null if user not in leaderboard', async () => {
      mockRedis.zrevrank.mockResolvedValue(null);

      const leaderboard = createLeaderboard(mockRedis as any);

      const result = await leaderboard.getRank('user:unknown');

      expect(result).toBeNull();
    });
  });

  describe('getPlayerRank', () => {
    it('should be an alias for getRank', async () => {
      mockRedis.zrevrank.mockResolvedValue(2);
      mockRedis.zscore.mockResolvedValue('3000');

      const leaderboard = createLeaderboard(mockRedis as any);

      const result = await leaderboard.getPlayerRank('user:123');

      expect(result).not.toBeNull();
      expect(result!.rank).toBe(3);
      expect(result!.score).toBe(3000);
    });
  });

  describe('getTop', () => {
    it('should return top N users', async () => {
      mockRedis.zrange.mockResolvedValue([
        'user:1',
        10000,
        'user:2',
        8000,
        'user:3',
        6000,
      ]);

      const leaderboard = createLeaderboard(mockRedis as any);

      const result = await leaderboard.getTop(3);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ userId: 'user:1', score: 10000, rank: 1 });
      expect(result[1]).toEqual({ userId: 'user:2', score: 8000, rank: 2 });
      expect(result[2]).toEqual({ userId: 'user:3', score: 6000, rank: 3 });
    });

    it('should return empty array if no users', async () => {
      mockRedis.zrange.mockResolvedValue([]);

      const leaderboard = createLeaderboard(mockRedis as any);

      const result = await leaderboard.getTop(10);

      expect(result).toHaveLength(0);
    });

    it('should throw error for non-positive count', async () => {
      const leaderboard = createLeaderboard(mockRedis as any);

      await expect(leaderboard.getTop(0)).rejects.toThrow('Count must be a positive number');
      await expect(leaderboard.getTop(-5)).rejects.toThrow('Count must be a positive number');
    });

    it('should limit count to maximum', async () => {
      mockRedis.zrange.mockResolvedValue([]);

      const leaderboard = createLeaderboard(mockRedis as any);

      await leaderboard.getTop(5000); // Exceeds MAX_QUERY_LIMIT (1000)

      expect(mockRedis.zrange).toHaveBeenCalledWith(
        expect.any(String),
        0,
        999, // Capped to 1000 - 1
        { rev: true, withScores: true }
      );
    });
  });

  describe('getTopPlayers', () => {
    it('should return top players with pagination', async () => {
      mockRedis.zrange.mockResolvedValue([
        'user:11',
        9000,
        'user:12',
        8500,
      ]);
      mockRedis.get.mockResolvedValue(null);

      const leaderboard = createLeaderboard(mockRedis as any);

      const result = await leaderboard.getTopPlayers(2, 10);

      expect(result).toHaveLength(2);
      expect(result[0].rank).toBe(11);
      expect(result[1].rank).toBe(12);
    });

    it('should include metadata when available', async () => {
      mockRedis.zrange.mockResolvedValue(['user:1', 10000]);
      mockRedis.get.mockResolvedValue(JSON.stringify({ displayName: 'Player1' }));

      const leaderboard = createLeaderboard(mockRedis as any);

      const result = await leaderboard.getTopPlayers(1);

      expect(result[0].metadata).toEqual({ displayName: 'Player1' });
    });
  });

  describe('getAroundUser', () => {
    it('should return users around a specific user', async () => {
      mockRedis.zrevrank.mockResolvedValue(50);
      mockRedis.zrange.mockResolvedValue([
        'user:48',
        5200,
        'user:49',
        5100,
        'user:123',
        5000,
        'user:51',
        4900,
        'user:52',
        4800,
      ]);

      const leaderboard = createLeaderboard(mockRedis as any);

      const result = await leaderboard.getAroundUser('user:123', 2);

      expect(result).toHaveLength(5);
      expect(result[2].userId).toBe('user:123');
    });

    it('should return empty array if user not found', async () => {
      mockRedis.zrevrank.mockResolvedValue(null);

      const leaderboard = createLeaderboard(mockRedis as any);

      const result = await leaderboard.getAroundUser('user:unknown', 2);

      expect(result).toHaveLength(0);
    });
  });

  describe('getTotalUsers', () => {
    it('should return total number of users', async () => {
      mockRedis.zcard.mockResolvedValue(1500);

      const leaderboard = createLeaderboard(mockRedis as any);

      const count = await leaderboard.getTotalUsers();

      expect(count).toBe(1500);
    });
  });

  describe('removeUser', () => {
    it('should remove user from leaderboard', async () => {
      mockRedis.zrem.mockResolvedValue(1);
      mockRedis.del.mockResolvedValue(1);

      const leaderboard = createLeaderboard(mockRedis as any);

      const removed = await leaderboard.removeUser('user:123');

      expect(removed).toBe(true);
      expect(mockRedis.zrem).toHaveBeenCalledWith(
        expect.any(String),
        'user:123'
      );
      expect(mockRedis.del).toHaveBeenCalled(); // Removes metadata
    });
  });
});

describe('LEADERBOARD_KEYS', () => {
  it('should generate correct global key', () => {
    expect(LEADERBOARD_KEYS.global).toBe('leaderboard:global');
  });

  it('should generate correct daily key', () => {
    const date = new Date('2024-03-15');
    expect(LEADERBOARD_KEYS.daily(date)).toBe('leaderboard:daily:2024-03-15');
  });

  it('should generate correct team key', () => {
    expect(LEADERBOARD_KEYS.team('team-123')).toBe('leaderboard:team:team-123');
  });

  it('should generate correct department key', () => {
    expect(LEADERBOARD_KEYS.department('LP')).toBe('leaderboard:dept:LP');
  });
});

describe('Team Leaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should add team score', async () => {
    mockRedis.zadd.mockResolvedValue(1);
    mockRedis.zincrby.mockResolvedValue('1000');

    const teamManager = createTeamLeaderboard(mockRedis as any);

    await teamManager.addTeamScore('team-1', 'user:123', 100);

    expect(mockRedis.zadd).toHaveBeenCalled();
    expect(mockRedis.zincrby).toHaveBeenCalledWith(
      'leaderboard:teams:rankings',
      100,
      'team-1'
    );
  });

  it('should throw error for empty team ID', async () => {
    const teamManager = createTeamLeaderboard(mockRedis as any);

    await expect(teamManager.addTeamScore('', 'user:123', 100)).rejects.toThrow('Team ID cannot be empty');
  });
});

describe('Department Leaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should add department score', async () => {
    mockRedis.zadd.mockResolvedValue(1);
    mockRedis.zincrby.mockResolvedValue('1000');

    const deptManager = createDepartmentLeaderboard(mockRedis as any);

    await deptManager.addDepartmentScore('LP', 'user:123', 100);

    expect(mockRedis.zadd).toHaveBeenCalled();
    expect(mockRedis.zincrby).toHaveBeenCalledWith(
      'leaderboard:depts:rankings',
      100,
      'LP'
    );
  });

  it('should throw error for empty department code', async () => {
    const deptManager = createDepartmentLeaderboard(mockRedis as any);

    await expect(deptManager.addDepartmentScore('', 'user:123', 100)).rejects.toThrow('Department code cannot be empty');
  });
});
