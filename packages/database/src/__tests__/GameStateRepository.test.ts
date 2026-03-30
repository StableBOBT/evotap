import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseGameStateRepository } from '../repositories/GameStateRepository.js';
import type { GameStateRecord } from '../types.js';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
};

const mockGameStateRecord: GameStateRecord = {
  id: 'uuid-game-123',
  user_id: 'uuid-user-123',
  telegram_id: 123456789,
  points: 5000,
  energy: 800,
  level: 3,
  total_taps: 5000,
  streak_days: 5,
  last_tap_at: '2024-01-15T12:00:00Z',
  last_streak_date: '2024-01-15',
  created_at: '2024-01-10T12:00:00Z',
  updated_at: '2024-01-15T12:00:00Z',
};

describe('SupabaseGameStateRepository', () => {
  let repository: SupabaseGameStateRepository;
  let mockSelect: ReturnType<typeof vi.fn>;
  let mockInsert: ReturnType<typeof vi.fn>;
  let mockUpdate: ReturnType<typeof vi.fn>;
  let mockEq: ReturnType<typeof vi.fn>;
  let mockSingle: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSingle = vi.fn();
    mockEq = vi.fn().mockReturnValue({
      single: mockSingle,
      select: vi.fn().mockReturnValue({ single: mockSingle }),
    });
    mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockInsert = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingle }) });
    mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
    });

    repository = new SupabaseGameStateRepository(mockSupabase as any);
  });

  describe('findByTelegramId', () => {
    it('should return game state when found', async () => {
      mockSingle.mockResolvedValue({ data: mockGameStateRecord, error: null });

      const result = await repository.findByTelegramId(123456789);

      expect(result).not.toBeNull();
      expect(result?.telegramId).toBe(123456789);
      expect(result?.points).toBe(5000);
      expect(result?.energy).toBe(800);
      expect(result?.level).toBe(3);
      expect(mockSupabase.from).toHaveBeenCalledWith('game_states');
      expect(mockEq).toHaveBeenCalledWith('telegram_id', 123456789);
    });

    it('should return null when not found', async () => {
      mockSingle.mockResolvedValue({ data: null, error: null });

      const result = await repository.findByTelegramId(999999999);

      expect(result).toBeNull();
    });

    it('should throw on database error', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(repository.findByTelegramId(123456789)).rejects.toThrow();
    });
  });

  describe('findByUserId', () => {
    it('should return game state when found', async () => {
      mockSingle.mockResolvedValue({ data: mockGameStateRecord, error: null });

      const result = await repository.findByUserId('uuid-user-123');

      expect(result).not.toBeNull();
      expect(result?.userId).toBe('uuid-user-123');
      expect(mockEq).toHaveBeenCalledWith('user_id', 'uuid-user-123');
    });
  });

  describe('save', () => {
    it('should insert new game state', async () => {
      mockSingle.mockResolvedValue({ data: mockGameStateRecord, error: null });

      const gameState = {
        userId: 'uuid-user-123',
        telegramId: 123456789,
        points: 0,
        energy: 1000,
        level: 1,
        totalTaps: 0,
        streakDays: 0,
        lastTapAt: null,
        lastStreakDate: null,
      };

      const result = await repository.save(gameState);

      expect(result.isOk).toBe(true);
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should return error on failure', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Insert failed' },
      });

      const gameState = {
        userId: 'uuid-user-123',
        telegramId: 123456789,
        points: 0,
        energy: 1000,
        level: 1,
        totalTaps: 0,
        streakDays: 0,
        lastTapAt: null,
        lastStreakDate: null,
      };

      const result = await repository.save(gameState as any);

      expect(result.isOk).toBe(false);
    });
  });

  describe('update', () => {
    it('should update game state fields', async () => {
      mockSingle.mockResolvedValue({ data: mockGameStateRecord, error: null });

      const result = await repository.update(123456789, {
        points: 6000,
        energy: 750,
      });

      expect(result.isOk).toBe(true);
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe('processTaps', () => {
    it('should increment points and total taps correctly', async () => {
      // Mock RPC call failure (function not exists) to trigger fallback
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: { code: '42883', message: 'function does not exist' },
      });
      (mockSupabase as any).rpc = mockRpc;

      // First call returns current state, second call returns updated state
      mockSingle
        .mockResolvedValueOnce({ data: mockGameStateRecord, error: null })
        .mockResolvedValueOnce({
          data: { ...mockGameStateRecord, points: 5100, total_taps: 5010 },
          error: null,
        });

      // 10 taps * 10 points per tap = 100 points, but totalTaps only increases by 10
      const result = await repository.processTaps(123456789, 10, 10);

      expect(result.isOk).toBe(true);
      if (result.isOk) {
        expect(result.data.points).toBe(5100); // 5000 + 100
        expect(result.data.totalTaps).toBe(5010); // 5000 + 10 (not 100!)
      }
    });

    it('should reject non-positive taps count', async () => {
      const result = await repository.processTaps(123456789, 0);

      expect(result.isOk).toBe(false);
      if (!result.isOk) {
        expect(result.error.message).toBe('Taps count must be positive');
      }
    });

    it('should reject non-positive points per tap', async () => {
      const result = await repository.processTaps(123456789, 10, 0);

      expect(result.isOk).toBe(false);
      if (!result.isOk) {
        expect(result.error.message).toBe('Points per tap must be positive');
      }
    });

    it('should use atomic RPC when available', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
      (mockSupabase as any).rpc = mockRpc;

      // After RPC succeeds, findByTelegramId is called
      mockSingle.mockResolvedValueOnce({
        data: { ...mockGameStateRecord, points: 5100, total_taps: 5010 },
        error: null,
      });

      const result = await repository.processTaps(123456789, 10, 10);

      expect(mockRpc).toHaveBeenCalledWith('increment_game_stats', {
        p_telegram_id: 123456789,
        p_points: 100,
        p_taps: 10,
      });
      expect(result.isOk).toBe(true);
    });
  });

  describe('existsByTelegramId', () => {
    it('should return true when game state exists', async () => {
      mockSingle.mockResolvedValue({ data: { id: 'uuid-game-123' }, error: null });

      const exists = await repository.existsByTelegramId(123456789);

      expect(exists).toBe(true);
    });

    it('should return false when game state does not exist', async () => {
      mockSingle.mockResolvedValue({ data: null, error: null });

      const exists = await repository.existsByTelegramId(999999999);

      expect(exists).toBe(false);
    });
  });
});
