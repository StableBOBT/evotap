import { describe, it, expect } from 'vitest';
import { User } from '../User.js';
import { TelegramId } from '../TelegramId.js';

describe('User', () => {
  const createValidTelegramId = () => {
    const result = TelegramId.create(123456789);
    if (!result.isOk()) throw new Error('Failed to create TelegramId');
    return result.value;
  };

  describe('create', () => {
    it('should create valid user with required fields', () => {
      const telegramId = createValidTelegramId();

      const result = User.create({
        telegramId,
        firstName: 'Juan',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.telegramId.equals(telegramId)).toBe(true);
        expect(result.value.firstName).toBe('Juan');
        expect(result.value.referralCode).toBeDefined();
        expect(result.value.referralCode.length).toBe(8);
      }
    });

    it('should create user with all optional fields', () => {
      const telegramId = createValidTelegramId();

      const result = User.create({
        telegramId,
        firstName: 'María',
        lastName: 'García',
        username: 'mariagarcia',
        languageCode: 'es',
        isPremium: true,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.lastName).toBe('García');
        expect(result.value.username).toBe('mariagarcia');
        expect(result.value.languageCode).toBe('es');
        expect(result.value.isPremium).toBe(true);
      }
    });

    it('should fail with empty firstName', () => {
      const telegramId = createValidTelegramId();

      const result = User.create({
        telegramId,
        firstName: '',
      });

      expect(result.isFail()).toBe(true);
    });

    it('should fail with whitespace-only firstName', () => {
      const telegramId = createValidTelegramId();

      const result = User.create({
        telegramId,
        firstName: '   ',
      });

      expect(result.isFail()).toBe(true);
    });

    it('should generate unique referral codes', () => {
      const telegramId1 = createValidTelegramId();
      const telegramId2Result = TelegramId.create(987654321);
      if (!telegramId2Result.isOk()) throw new Error('Failed');
      const telegramId2 = telegramId2Result.value;

      const user1 = User.create({ telegramId: telegramId1, firstName: 'User1' });
      const user2 = User.create({ telegramId: telegramId2, firstName: 'User2' });

      expect(user1.isOk() && user2.isOk()).toBe(true);
      if (user1.isOk() && user2.isOk()) {
        expect(user1.value.referralCode).not.toBe(user2.value.referralCode);
      }
    });
  });

  describe('connectWallet', () => {
    it('should connect wallet address', () => {
      const telegramId = createValidTelegramId();
      const userResult = User.create({ telegramId, firstName: 'Test' });
      expect(userResult.isOk()).toBe(true);
      if (!userResult.isOk()) return;

      const user = userResult.value;
      const walletAddress = 'UQDrjaLahLkMB-hMCmkzOyBuHJ186Qg19FGW0b8vJqS-ubtV';

      const result = user.connectWallet(walletAddress);

      expect(result.isOk()).toBe(true);
      expect(user.walletAddress).toBe(walletAddress);
    });

    it('should fail with invalid wallet address', () => {
      const telegramId = createValidTelegramId();
      const userResult = User.create({ telegramId, firstName: 'Test' });
      expect(userResult.isOk()).toBe(true);
      if (!userResult.isOk()) return;

      const user = userResult.value;

      const result = user.connectWallet('invalid-address');

      expect(result.isFail()).toBe(true);
    });

    it('should fail with empty wallet address', () => {
      const telegramId = createValidTelegramId();
      const userResult = User.create({ telegramId, firstName: 'Test' });
      expect(userResult.isOk()).toBe(true);
      if (!userResult.isOk()) return;

      const user = userResult.value;

      const result = user.connectWallet('');

      expect(result.isFail()).toBe(true);
    });
  });

  describe('disconnectWallet', () => {
    it('should disconnect wallet', () => {
      const telegramId = createValidTelegramId();
      const userResult = User.create({ telegramId, firstName: 'Test' });
      expect(userResult.isOk()).toBe(true);
      if (!userResult.isOk()) return;

      const user = userResult.value;
      user.connectWallet('UQDrjaLahLkMB-hMCmkzOyBuHJ186Qg19FGW0b8vJqS-ubtV');

      user.disconnectWallet();

      expect(user.walletAddress).toBeNull();
    });
  });

  describe('setReferrer', () => {
    it('should set referrer code', () => {
      const telegramId = createValidTelegramId();
      const userResult = User.create({ telegramId, firstName: 'Test' });
      expect(userResult.isOk()).toBe(true);
      if (!userResult.isOk()) return;

      const user = userResult.value;
      const referrerCode = 'ABC12345';

      const result = user.setReferrer(referrerCode);

      expect(result.isOk()).toBe(true);
      expect(user.referredBy).toBe(referrerCode);
    });

    it('should fail if already has referrer', () => {
      const telegramId = createValidTelegramId();
      const userResult = User.create({ telegramId, firstName: 'Test' });
      expect(userResult.isOk()).toBe(true);
      if (!userResult.isOk()) return;

      const user = userResult.value;
      user.setReferrer('FIRST123');

      const result = user.setReferrer('SECOND12');

      expect(result.isFail()).toBe(true);
      expect(user.referredBy).toBe('FIRST123');
    });

    it('should fail if referrer code is own code', () => {
      const telegramId = createValidTelegramId();
      const userResult = User.create({ telegramId, firstName: 'Test' });
      expect(userResult.isOk()).toBe(true);
      if (!userResult.isOk()) return;

      const user = userResult.value;

      const result = user.setReferrer(user.referralCode);

      expect(result.isFail()).toBe(true);
    });
  });

  describe('hasWallet', () => {
    it('should return false when no wallet connected', () => {
      const telegramId = createValidTelegramId();
      const userResult = User.create({ telegramId, firstName: 'Test' });
      expect(userResult.isOk()).toBe(true);
      if (!userResult.isOk()) return;

      expect(userResult.value.hasWallet()).toBe(false);
    });

    it('should return true when wallet is connected', () => {
      const telegramId = createValidTelegramId();
      const userResult = User.create({ telegramId, firstName: 'Test' });
      expect(userResult.isOk()).toBe(true);
      if (!userResult.isOk()) return;

      const user = userResult.value;
      user.connectWallet('UQDrjaLahLkMB-hMCmkzOyBuHJ186Qg19FGW0b8vJqS-ubtV');

      expect(user.hasWallet()).toBe(true);
    });
  });

  describe('equality', () => {
    it('should be equal when telegramIds match', () => {
      const telegramId = createValidTelegramId();
      const user1 = User.create({ telegramId, firstName: 'User1' });
      const user2 = User.create({ telegramId, firstName: 'User2' });

      expect(user1.isOk() && user2.isOk()).toBe(true);
      if (user1.isOk() && user2.isOk()) {
        expect(user1.value.equals(user2.value)).toBe(true);
      }
    });
  });
});
