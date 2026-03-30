import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseReferralRepository } from '../repositories/ReferralRepository.js';
import type { ReferralRecord } from '../types.js';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
};

const mockReferralRecord: ReferralRecord = {
  id: 'uuid-ref-123',
  code: 'ABC12345',
  inviter_id: 'uuid-inviter-123',
  inviter_telegram_id: 123456789,
  invitee_id: 'uuid-invitee-456',
  invitee_telegram_id: 987654321,
  points_earned: 5000,
  created_at: '2024-01-15T12:00:00Z',
};

describe('SupabaseReferralRepository', () => {
  let repository: SupabaseReferralRepository;
  let mockSelect: ReturnType<typeof vi.fn>;
  let mockInsert: ReturnType<typeof vi.fn>;
  let mockEq: ReturnType<typeof vi.fn>;
  let mockSingle: ReturnType<typeof vi.fn>;
  let mockOrder: ReturnType<typeof vi.fn>;
  let mockLimit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSingle = vi.fn();
    mockLimit = vi.fn().mockResolvedValue({ data: [], error: null });
    mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    mockEq = vi.fn().mockReturnValue({
      single: mockSingle,
      order: mockOrder,
    });
    mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockInsert = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingle }) });

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
    });

    repository = new SupabaseReferralRepository(mockSupabase as any);
  });

  describe('findByCode', () => {
    it('should return referrals for a code', async () => {
      mockLimit.mockResolvedValue({
        data: [mockReferralRecord],
        error: null,
      });

      const result = await repository.findByCode('ABC12345');

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('ABC12345');
      expect(mockSupabase.from).toHaveBeenCalledWith('referrals');
      expect(mockEq).toHaveBeenCalledWith('code', 'ABC12345');
    });

    it('should return empty array when no referrals', async () => {
      mockLimit.mockResolvedValue({ data: [], error: null });

      const result = await repository.findByCode('NOTFOUND');

      expect(result).toHaveLength(0);
    });
  });

  describe('findByInviterId', () => {
    it('should return referrals by inviter', async () => {
      mockLimit.mockResolvedValue({
        data: [mockReferralRecord, { ...mockReferralRecord, id: 'uuid-ref-456' }],
        error: null,
      });

      const result = await repository.findByInviterId('uuid-inviter-123');

      expect(result).toHaveLength(2);
      expect(mockEq).toHaveBeenCalledWith('inviter_id', 'uuid-inviter-123');
    });
  });

  describe('countByInviterId', () => {
    it('should return count of referrals', async () => {
      // The countByInviterId uses a different select pattern with head: true
      const mockCountSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count: 5, error: null }),
      });
      mockSupabase.from.mockReturnValue({
        select: mockCountSelect,
      });

      const count = await repository.countByInviterId('uuid-inviter-123');

      expect(count).toBe(5);
    });
  });

  describe('save', () => {
    it('should insert new referral', async () => {
      mockSingle.mockResolvedValue({ data: mockReferralRecord, error: null });

      const referral = {
        code: 'ABC12345',
        inviterId: 'uuid-inviter-123',
        inviterTelegramId: 123456789,
        inviteeId: 'uuid-invitee-456',
        inviteeTelegramId: 987654321,
        pointsEarned: 5000,
      };

      const result = await repository.save(referral);

      expect(result.isOk).toBe(true);
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should return error on duplicate', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'Duplicate referral' },
      });

      const referral = {
        code: 'ABC12345',
        inviterId: 'uuid-inviter-123',
        inviterTelegramId: 123456789,
        inviteeId: 'uuid-invitee-456',
        inviteeTelegramId: 987654321,
        pointsEarned: 5000,
      };

      const result = await repository.save(referral);

      expect(result.isOk).toBe(false);
    });
  });

  describe('existsByInviteeId', () => {
    it('should return true when referral exists', async () => {
      mockSingle.mockResolvedValue({ data: { id: 'uuid-ref-123' }, error: null });

      const exists = await repository.existsByInviteeId('uuid-invitee-456');

      expect(exists).toBe(true);
    });

    it('should return false when referral does not exist', async () => {
      mockSingle.mockResolvedValue({ data: null, error: null });

      const exists = await repository.existsByInviteeId('new-user');

      expect(exists).toBe(false);
    });
  });

  describe('getTotalPointsEarned', () => {
    it('should return sum of points earned', async () => {
      // Mock the RPC call
      const mockRpc = vi.fn().mockResolvedValue({ data: 25000, error: null });
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [
              { points_earned: 5000 },
              { points_earned: 10000 },
              { points_earned: 10000 },
            ],
            error: null,
          }),
        }),
      });

      const total = await repository.getTotalPointsEarned('uuid-inviter-123');

      expect(total).toBe(25000);
    });
  });
});
