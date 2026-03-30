import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseUserRepository } from '../repositories/UserRepository.js';
import type { UserRecord } from '../types.js';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
};

const mockUserRecord: UserRecord = {
  id: 'uuid-123',
  telegram_id: 123456789,
  first_name: 'Juan',
  last_name: 'Pérez',
  username: 'juanperez',
  language_code: 'es',
  is_premium: false,
  referral_code: 'ABC12345',
  referred_by: null,
  wallet_address: null,
  created_at: '2024-01-15T12:00:00Z',
  updated_at: '2024-01-15T12:00:00Z',
};

describe('SupabaseUserRepository', () => {
  let repository: SupabaseUserRepository;
  let mockSelect: ReturnType<typeof vi.fn>;
  let mockInsert: ReturnType<typeof vi.fn>;
  let mockUpdate: ReturnType<typeof vi.fn>;
  let mockDelete: ReturnType<typeof vi.fn>;
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
    mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    });

    repository = new SupabaseUserRepository(mockSupabase as any);
  });

  describe('findByTelegramId', () => {
    it('should return user when found', async () => {
      mockSingle.mockResolvedValue({ data: mockUserRecord, error: null });

      const result = await repository.findByTelegramId(123456789);

      expect(result).not.toBeNull();
      expect(result?.telegramId).toBe(123456789);
      expect(result?.firstName).toBe('Juan');
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
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
        error: { message: 'Database error' }
      });

      await expect(repository.findByTelegramId(123456789)).rejects.toThrow();
    });
  });

  describe('findByReferralCode', () => {
    it('should return user when found', async () => {
      mockSingle.mockResolvedValue({ data: mockUserRecord, error: null });

      const result = await repository.findByReferralCode('ABC12345');

      expect(result).not.toBeNull();
      expect(result?.referralCode).toBe('ABC12345');
      expect(mockEq).toHaveBeenCalledWith('referral_code', 'ABC12345');
    });

    it('should return null when not found', async () => {
      mockSingle.mockResolvedValue({ data: null, error: null });

      const result = await repository.findByReferralCode('NOTFOUND');

      expect(result).toBeNull();
    });
  });

  describe('save', () => {
    it('should insert new user', async () => {
      mockSingle.mockResolvedValue({ data: mockUserRecord, error: null });

      const user = {
        telegramId: 123456789,
        firstName: 'Juan',
        lastName: 'Pérez',
        username: 'juanperez',
        languageCode: 'es',
        isPremium: false,
        referralCode: 'ABC12345',
        referredBy: null,
        walletAddress: null,
      };

      const result = await repository.save(user);

      expect(result.isOk).toBe(true);
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should return error on duplicate', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'Duplicate key' }
      });

      const user = {
        telegramId: 123456789,
        firstName: 'Juan',
        referralCode: 'ABC12345',
      };

      const result = await repository.save(user as any);

      expect(result.isOk).toBe(false);
    });
  });

  describe('update', () => {
    it('should update user fields', async () => {
      mockSingle.mockResolvedValue({ data: mockUserRecord, error: null });

      const result = await repository.update(123456789, {
        walletAddress: 'UQDrjaLahLkMB-hMCmkzOyBuHJ186Qg19FGW0b8vJqS-ubtV',
      });

      expect(result.isOk).toBe(true);
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete user by telegram ID', async () => {
      mockEq.mockResolvedValue({ error: null });

      await repository.delete(123456789);

      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('telegram_id', 123456789);
    });
  });

  describe('existsByTelegramId', () => {
    it('should return true when user exists', async () => {
      mockSingle.mockResolvedValue({ data: { id: 'uuid-123' }, error: null });

      const exists = await repository.existsByTelegramId(123456789);

      expect(exists).toBe(true);
    });

    it('should return false when user does not exist', async () => {
      mockSingle.mockResolvedValue({ data: null, error: null });

      const exists = await repository.existsByTelegramId(999999999);

      expect(exists).toBe(false);
    });
  });
});
