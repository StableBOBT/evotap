import { describe, it, expect } from 'vitest';
import { UserFactory } from './userFactory.js';

describe('UserFactory', () => {
  describe('create', () => {
    it('should create a user with all required fields', () => {
      const user = UserFactory.create();

      expect(user.id).toBeDefined();
      expect(user.telegramId).toBeTypeOf('number');
      expect(user.firstName).toBeTypeOf('string');
      expect(user.referralCode).toHaveLength(8);
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should apply overrides', () => {
      const customId = 'custom-id-123';
      const customTelegramId = 999999999;

      const user = UserFactory.create({
        id: customId,
        telegramId: customTelegramId,
      });

      expect(user.id).toBe(customId);
      expect(user.telegramId).toBe(customTelegramId);
    });

    it('should create unique users', () => {
      const user1 = UserFactory.create();
      const user2 = UserFactory.create();

      expect(user1.id).not.toBe(user2.id);
      expect(user1.telegramId).not.toBe(user2.telegramId);
      expect(user1.referralCode).not.toBe(user2.referralCode);
    });
  });

  describe('createPremium', () => {
    it('should create a premium user', () => {
      const user = UserFactory.createPremium();

      expect(user.isPremium).toBe(true);
    });
  });

  describe('createWithWallet', () => {
    it('should create a user with wallet address', () => {
      const user = UserFactory.createWithWallet();

      expect(user.walletAddress).toBeDefined();
      expect(user.walletAddress).toMatch(/^UQ/);
    });
  });

  describe('createReferred', () => {
    it('should create a referred user', () => {
      const referrerCode = 'ABC12345';
      const user = UserFactory.createReferred(referrerCode);

      expect(user.referredBy).toBe(referrerCode);
    });
  });

  describe('createMany', () => {
    it('should create multiple users', () => {
      const users = UserFactory.createMany(5);

      expect(users).toHaveLength(5);
      users.forEach((user) => {
        expect(user.id).toBeDefined();
      });
    });

    it('should apply overrides to all users', () => {
      const users = UserFactory.createMany(3, { isPremium: true });

      users.forEach((user) => {
        expect(user.isPremium).toBe(true);
      });
    });
  });

  describe('createReferralChain', () => {
    it('should create a chain of referrals', () => {
      const chain = UserFactory.createReferralChain(4);

      expect(chain).toHaveLength(4);
      expect(chain[0]?.referredBy).toBeNull(); // First user has no referrer
      expect(chain[1]?.referredBy).toBe(chain[0]?.referralCode);
      expect(chain[2]?.referredBy).toBe(chain[1]?.referralCode);
      expect(chain[3]?.referredBy).toBe(chain[2]?.referralCode);
    });
  });
});
