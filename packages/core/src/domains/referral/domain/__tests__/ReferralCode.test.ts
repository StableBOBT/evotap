import { describe, it, expect } from 'vitest';
import { ReferralCode } from '../ReferralCode.js';

describe('ReferralCode', () => {
  describe('create', () => {
    it('should create valid referral code', () => {
      const result = ReferralCode.create('ABC12345');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.value).toBe('ABC12345');
      }
    });

    it('should fail for code shorter than 6 characters', () => {
      const result = ReferralCode.create('ABC12');

      expect(result.isFail()).toBe(true);
    });

    it('should fail for code longer than 12 characters', () => {
      const result = ReferralCode.create('ABCDEFGHIJKLM');

      expect(result.isFail()).toBe(true);
    });

    it('should fail for empty code', () => {
      const result = ReferralCode.create('');

      expect(result.isFail()).toBe(true);
    });

    it('should fail for code with special characters', () => {
      const result = ReferralCode.create('ABC@123');

      expect(result.isFail()).toBe(true);
    });

    it('should allow lowercase and convert to uppercase', () => {
      const result = ReferralCode.create('abc12345');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.value).toBe('ABC12345');
      }
    });
  });

  describe('generate', () => {
    it('should generate 8 character code', () => {
      const code = ReferralCode.generate();

      expect(code.value.length).toBe(8);
    });

    it('should generate alphanumeric code', () => {
      const code = ReferralCode.generate();

      expect(code.value).toMatch(/^[A-Z0-9]{8}$/);
    });

    it('should generate unique codes', () => {
      const code1 = ReferralCode.generate();
      const code2 = ReferralCode.generate();

      expect(code1.value).not.toBe(code2.value);
    });
  });

  describe('equals', () => {
    it('should return true for equal codes', () => {
      const code1 = ReferralCode.create('ABC12345').value as ReferralCode;
      const code2 = ReferralCode.create('ABC12345').value as ReferralCode;

      expect(code1.equals(code2)).toBe(true);
    });

    it('should return true for case-insensitive comparison', () => {
      const code1 = ReferralCode.create('ABC12345').value as ReferralCode;
      const code2 = ReferralCode.create('abc12345').value as ReferralCode;

      expect(code1.equals(code2)).toBe(true);
    });

    it('should return false for different codes', () => {
      const code1 = ReferralCode.create('ABC12345').value as ReferralCode;
      const code2 = ReferralCode.create('XYZ98765').value as ReferralCode;

      expect(code1.equals(code2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return code as string', () => {
      const code = ReferralCode.create('ABC12345').value as ReferralCode;

      expect(code.toString()).toBe('ABC12345');
    });
  });
});
