import { describe, it, expect } from 'vitest';
import {
  generateStartLink,
  generateMiniAppLink,
  parseStartParam,
  extractReferralCode,
  generateReferralCode,
  isValidReferralCode,
  encodeStartPayload,
  decodeStartPayload,
} from '../utils.js';

describe('Utils', () => {
  describe('generateStartLink', () => {
    it('should generate correct deep link', () => {
      const link = generateStartLink('EVOtapBot', 'ref_ABC123');

      expect(link).toBe('https://t.me/EVOtapBot?start=ref_ABC123');
    });

    it('should handle username with @ prefix', () => {
      const link = generateStartLink('@EVOtapBot', 'ref_ABC123');

      expect(link).toBe('https://t.me/EVOtapBot?start=ref_ABC123');
    });

    it('should encode special characters in payload', () => {
      const link = generateStartLink('MyBot', 'hello world');

      expect(link).toBe('https://t.me/MyBot?start=hello%20world');
    });
  });

  describe('generateMiniAppLink', () => {
    it('should generate mini app link without payload', () => {
      const link = generateMiniAppLink('EVOtapBot', 'game');

      expect(link).toBe('https://t.me/EVOtapBot/game');
    });

    it('should generate mini app link with payload', () => {
      const link = generateMiniAppLink('EVOtapBot', 'game', 'ref_ABC123');

      expect(link).toBe('https://t.me/EVOtapBot/game?startapp=ref_ABC123');
    });

    it('should handle username with @ prefix', () => {
      const link = generateMiniAppLink('@EVOtapBot', 'game', 'ref_ABC123');

      expect(link).toBe('https://t.me/EVOtapBot/game?startapp=ref_ABC123');
    });
  });

  describe('parseStartParam', () => {
    it('should extract code from ref_ prefix', () => {
      expect(parseStartParam('ref_ABC123')).toBe('ABC123');
    });

    it('should extract code from r_ prefix', () => {
      expect(parseStartParam('r_XYZ789')).toBe('XYZ789');
    });

    it('should extract code from invite_ prefix', () => {
      expect(parseStartParam('invite_CODE01')).toBe('CODE01');
    });

    it('should extract code from i_ prefix', () => {
      expect(parseStartParam('i_SHORT')).toBe('SHORT');
    });

    it('should extract standalone alphanumeric code', () => {
      expect(parseStartParam('ABC12345')).toBe('ABC12345');
    });

    it('should convert standalone code to uppercase', () => {
      expect(parseStartParam('abc12345')).toBe('ABC12345');
    });

    it('should return null for undefined', () => {
      expect(parseStartParam(undefined)).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(parseStartParam('')).toBeNull();
    });

    it('should return null for whitespace', () => {
      expect(parseStartParam('   ')).toBeNull();
    });

    it('should return null for non-referral format', () => {
      expect(parseStartParam('join_squad_123')).toBeNull();
    });

    it('should return null for code too short', () => {
      expect(parseStartParam('ABC')).toBeNull();
    });

    it('should return null for code too long', () => {
      expect(parseStartParam('ABCDEFGHIJKLMNOP')).toBeNull();
    });
  });

  describe('extractReferralCode (alias)', () => {
    it('should work same as parseStartParam', () => {
      expect(extractReferralCode('ref_ABC123')).toBe(parseStartParam('ref_ABC123'));
      expect(extractReferralCode('ABC12345')).toBe(parseStartParam('ABC12345'));
      expect(extractReferralCode(undefined)).toBe(parseStartParam(undefined));
    });
  });

  describe('generateReferralCode', () => {
    it('should generate code of default length', () => {
      const code = generateReferralCode();

      expect(code.length).toBe(8);
      expect(code).toMatch(/^[A-Z0-9]+$/);
    });

    it('should generate code of specified length', () => {
      const code = generateReferralCode(6);

      expect(code.length).toBe(6);
    });

    it('should add prefix when specified', () => {
      const code = generateReferralCode(8, 'ref_');

      expect(code.startsWith('ref_')).toBe(true);
      expect(code.length).toBe(12); // 4 (prefix) + 8 (code)
    });

    it('should generate unique codes', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        codes.add(generateReferralCode());
      }
      // Should have high uniqueness (allow some collisions due to randomness)
      expect(codes.size).toBeGreaterThan(95);
    });

    it('should not include confusing characters', () => {
      // Generate many codes and check for confusing chars
      for (let i = 0; i < 50; i++) {
        const code = generateReferralCode();
        expect(code).not.toMatch(/[0OIl1]/);
      }
    });
  });

  describe('isValidReferralCode', () => {
    it('should return true for valid codes', () => {
      expect(isValidReferralCode('ABC123')).toBe(true);
      expect(isValidReferralCode('ABCD1234')).toBe(true);
      expect(isValidReferralCode('123456')).toBe(true);
      expect(isValidReferralCode('abcdef')).toBe(true);
      expect(isValidReferralCode('AAAAAAAAAAAA')).toBe(true); // 12 chars
    });

    it('should return false for too short codes', () => {
      expect(isValidReferralCode('ABC')).toBe(false);
      expect(isValidReferralCode('ABCDE')).toBe(false);
    });

    it('should return false for too long codes', () => {
      expect(isValidReferralCode('ABCDEFGHIJKLM')).toBe(false); // 13 chars
    });

    it('should return false for codes with special chars', () => {
      expect(isValidReferralCode('ABC-123')).toBe(false);
      expect(isValidReferralCode('ABC_123')).toBe(false);
      expect(isValidReferralCode('ABC 123')).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isValidReferralCode(undefined)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidReferralCode('')).toBe(false);
    });
  });

  describe('encodeStartPayload / decodeStartPayload', () => {
    it('should encode and decode simple object', () => {
      const data = { action: 'join', squadId: 123 };
      const encoded = encodeStartPayload(data);
      const decoded = decodeStartPayload(encoded);

      expect(decoded).toEqual(data);
    });

    it('should encode to URL-safe string', () => {
      const data = { text: 'Hello World!' };
      const encoded = encodeStartPayload(data);

      // Should not contain base64 special chars
      expect(encoded).not.toContain('+');
      expect(encoded).not.toContain('/');
      expect(encoded).not.toContain('=');
    });

    it('should decode with generic type', () => {
      interface MyPayload {
        userId: number;
        action: string;
      }
      const data: MyPayload = { userId: 123, action: 'invite' };
      const encoded = encodeStartPayload(data);
      const decoded = decodeStartPayload<MyPayload>(encoded);

      expect(decoded?.userId).toBe(123);
      expect(decoded?.action).toBe('invite');
    });

    it('should return null for invalid payload', () => {
      expect(decodeStartPayload('not-valid-base64!')).toBeNull();
      expect(decodeStartPayload('')).toBeNull();
    });

    it('should handle complex nested objects', () => {
      const data = {
        user: { id: 1, name: 'Test' },
        items: [1, 2, 3],
        metadata: { nested: { deep: true } },
      };
      const encoded = encodeStartPayload(data);
      const decoded = decodeStartPayload(encoded);

      expect(decoded).toEqual(data);
    });
  });
});
