import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Referral } from '../Referral.js';
import { ReferralCode } from '../ReferralCode.js';
import { TelegramId } from '../../../user/domain/TelegramId.js';

describe('Referral', () => {
  const createUserId = (id: number) => {
    const result = TelegramId.create(id);
    if (!result.isOk()) throw new Error('Failed to create TelegramId');
    return result.value;
  };

  const createCode = (code: string) => {
    const result = ReferralCode.create(code);
    if (!result.isOk()) throw new Error('Failed to create ReferralCode');
    return result.value;
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('create', () => {
    it('should create valid referral', () => {
      const inviterId = createUserId(123456789);
      const inviteeId = createUserId(987654321);
      const code = createCode('ABC12345');

      const result = Referral.create({
        code,
        inviterId,
        inviteeId,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.code.equals(code)).toBe(true);
        expect(result.value.inviterId.equals(inviterId)).toBe(true);
        expect(result.value.inviteeId.equals(inviteeId)).toBe(true);
        expect(result.value.pointsEarned).toBe(0);
        expect(result.value.createdAt).toBeInstanceOf(Date);
      }
    });

    it('should fail if inviter and invitee are the same', () => {
      const userId = createUserId(123456789);
      const code = createCode('ABC12345');

      const result = Referral.create({
        code,
        inviterId: userId,
        inviteeId: userId,
      });

      expect(result.isFail()).toBe(true);
    });

    it('should set createdAt to current time', () => {
      const now = new Date('2024-01-15T12:00:00Z');
      vi.setSystemTime(now);

      const inviterId = createUserId(123456789);
      const inviteeId = createUserId(987654321);
      const code = createCode('ABC12345');

      const result = Referral.create({
        code,
        inviterId,
        inviteeId,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.createdAt).toEqual(now);
      }
    });
  });

  describe('awardPoints', () => {
    it('should award points to referral', () => {
      const inviterId = createUserId(123456789);
      const inviteeId = createUserId(987654321);
      const code = createCode('ABC12345');

      const referral = Referral.create({
        code,
        inviterId,
        inviteeId,
      }).value as Referral;

      referral.awardPoints(5000);

      expect(referral.pointsEarned).toBe(5000);
    });

    it('should accumulate points', () => {
      const inviterId = createUserId(123456789);
      const inviteeId = createUserId(987654321);
      const code = createCode('ABC12345');

      const referral = Referral.create({
        code,
        inviterId,
        inviteeId,
      }).value as Referral;

      referral.awardPoints(3000);
      referral.awardPoints(2000);

      expect(referral.pointsEarned).toBe(5000);
    });
  });

  describe('isActive', () => {
    it('should return true for recent referral', () => {
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));

      const inviterId = createUserId(123456789);
      const inviteeId = createUserId(987654321);
      const code = createCode('ABC12345');

      const referral = Referral.create({
        code,
        inviterId,
        inviteeId,
      }).value as Referral;

      expect(referral.isActive()).toBe(true);
    });

    it('should return false for referral older than 30 days', () => {
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));

      const inviterId = createUserId(123456789);
      const inviteeId = createUserId(987654321);
      const code = createCode('ABC12345');

      const referral = Referral.create({
        code,
        inviterId,
        inviteeId,
      }).value as Referral;

      // Advance 31 days
      vi.advanceTimersByTime(31 * 24 * 60 * 60 * 1000);

      expect(referral.isActive()).toBe(false);
    });
  });

  describe('daysSinceCreation', () => {
    it('should return 0 for same day', () => {
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));

      const inviterId = createUserId(123456789);
      const inviteeId = createUserId(987654321);
      const code = createCode('ABC12345');

      const referral = Referral.create({
        code,
        inviterId,
        inviteeId,
      }).value as Referral;

      expect(referral.daysSinceCreation()).toBe(0);
    });

    it('should return correct number of days', () => {
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));

      const inviterId = createUserId(123456789);
      const inviteeId = createUserId(987654321);
      const code = createCode('ABC12345');

      const referral = Referral.create({
        code,
        inviterId,
        inviteeId,
      }).value as Referral;

      // Advance 10 days
      vi.advanceTimersByTime(10 * 24 * 60 * 60 * 1000);

      expect(referral.daysSinceCreation()).toBe(10);
    });
  });
});
