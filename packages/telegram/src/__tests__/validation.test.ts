import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  validateInitData,
  validateInitDataFull,
  parseInitData,
  isExpired,
  isInitDataExpired,
  createInitDataHash,
} from '../initData.js';
import { extractReferralCode, parseStartParam } from '../utils.js';
import { isOk, isFail } from '../types.js';

describe('Telegram initData Validation', () => {
  const BOT_TOKEN = '123456789:ABCdefGHIjklMNOpqrsTUVwxyz';

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('parseInitData', () => {
    it('should parse valid initData string', () => {
      const initData = 'query_id=AAHdF6IQAAAAAN0XohDhrOrc&user=%7B%22id%22%3A123456789%2C%22first_name%22%3A%22Juan%22%2C%22last_name%22%3A%22Perez%22%2C%22username%22%3A%22juanperez%22%2C%22language_code%22%3A%22es%22%7D&auth_date=1234567890&hash=abc123';

      const result = parseInitData(initData);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.queryId).toBe('AAHdF6IQAAAAAN0XohDhrOrc');
        expect(result.value.user?.id).toBe(123456789);
        expect(result.value.user?.firstName).toBe('Juan');
        expect(result.value.authDate).toBe(1234567890);
        expect(result.value.hash).toBe('abc123');
      }
    });

    it('should parse initData without optional fields', () => {
      const initData = 'auth_date=1234567890&hash=abc123';

      const result = parseInitData(initData);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.user).toBeUndefined();
        expect(result.value.queryId).toBeUndefined();
        expect(result.value.authDate).toBe(1234567890);
      }
    });

    it('should fail for empty string', () => {
      const result = parseInitData('');

      expect(isFail(result)).toBe(true);
    });

    it('should fail for missing hash', () => {
      const initData = 'auth_date=1234567890';

      const result = parseInitData(initData);

      expect(isFail(result)).toBe(true);
    });

    it('should fail for missing auth_date', () => {
      const initData = 'hash=abc123';

      const result = parseInitData(initData);

      expect(isFail(result)).toBe(true);
    });

    it('should parse start_param', () => {
      const initData = 'auth_date=1234567890&hash=abc123&start_param=ref_ABC12345';

      const result = parseInitData(initData);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.startParam).toBe('ref_ABC12345');
      }
    });
  });

  describe('createInitDataHash', () => {
    it('should create correct HMAC-SHA256 hash', () => {
      // This is the Telegram-specified algorithm
      const initData = 'auth_date=1234567890&query_id=test';

      const hash = createInitDataHash(initData, BOT_TOKEN);

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should create consistent hash for same input', () => {
      const initData = 'auth_date=1234567890&query_id=test';

      const hash1 = createInitDataHash(initData, BOT_TOKEN);
      const hash2 = createInitDataHash(initData, BOT_TOKEN);

      expect(hash1).toBe(hash2);
    });

    it('should create different hash for different input', () => {
      const initData1 = 'auth_date=1234567890&query_id=test1';
      const initData2 = 'auth_date=1234567890&query_id=test2';

      const hash1 = createInitDataHash(initData1, BOT_TOKEN);
      const hash2 = createInitDataHash(initData2, BOT_TOKEN);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('isExpired / isInitDataExpired', () => {
    it('should return false for recent auth_date', () => {
      const now = 1700000000;
      vi.setSystemTime(new Date(now * 1000));

      const result = isExpired(now - 60); // 1 minute ago

      expect(result).toBe(false);
    });

    it('should return true for auth_date older than 5 minutes', () => {
      const now = 1700000000;
      vi.setSystemTime(new Date(now * 1000));

      const result = isExpired(now - 301); // 5 minutes + 1 second ago

      expect(result).toBe(true);
    });

    it('should return false for auth_date exactly 5 minutes ago', () => {
      const now = 1700000000;
      vi.setSystemTime(new Date(now * 1000));

      const result = isExpired(now - 300); // exactly 5 minutes

      expect(result).toBe(false);
    });

    it('should support custom expiration time', () => {
      const now = 1700000000;
      vi.setSystemTime(new Date(now * 1000));

      // 10 minute expiration
      const result = isExpired(now - 500, 600);

      expect(result).toBe(false);
    });

    it('isInitDataExpired should be alias for isExpired', () => {
      const now = 1700000000;
      vi.setSystemTime(new Date(now * 1000));

      const result1 = isExpired(now - 60);
      const result2 = isInitDataExpired(now - 60);

      expect(result1).toBe(result2);
    });
  });

  describe('validateInitData', () => {
    it('should validate correctly signed initData and return ValidatedUser', () => {
      const now = 1700000000;
      vi.setSystemTime(new Date(now * 1000));

      // Create a properly signed initData
      const params = new URLSearchParams();
      params.set('auth_date', String(now - 60));
      params.set('query_id', 'test_query');
      params.set('user', JSON.stringify({ id: 123, first_name: 'Test' }));

      const dataCheckString = [...params.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join('\n');

      const hash = createInitDataHash(dataCheckString, BOT_TOKEN);
      params.set('hash', hash);

      const initData = params.toString();

      const result = validateInitData(initData, BOT_TOKEN);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.id).toBe(123);
        expect(result.value.firstName).toBe('Test');
        expect(result.value.isPremium).toBe(false);
      }
    });

    it('should fail for invalid signature with INVALID_HASH error', () => {
      const now = 1700000000;
      vi.setSystemTime(new Date(now * 1000));

      const params = new URLSearchParams();
      params.set('auth_date', String(now - 60));
      params.set('query_id', 'test');
      params.set('user', JSON.stringify({ id: 123, first_name: 'Test' }));
      params.set('hash', 'invalid_hash');

      const initData = params.toString();

      const result = validateInitData(initData, BOT_TOKEN);

      expect(isFail(result)).toBe(true);
      if (isFail(result)) {
        expect(result.error.code).toBe('INVALID_HASH');
      }
    });

    it('should fail for expired initData with EXPIRED error', () => {
      const now = 1700000000;
      vi.setSystemTime(new Date(now * 1000));

      // Create properly signed but expired initData
      const params = new URLSearchParams();
      params.set('auth_date', String(now - 600)); // 10 minutes ago
      params.set('query_id', 'test_query');
      params.set('user', JSON.stringify({ id: 123, first_name: 'Test' }));

      const dataCheckString = [...params.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join('\n');

      const hash = createInitDataHash(dataCheckString, BOT_TOKEN);
      params.set('hash', hash);

      const initData = params.toString();

      const result = validateInitData(initData, BOT_TOKEN);

      expect(isFail(result)).toBe(true);
      if (isFail(result)) {
        expect(result.error.code).toBe('EXPIRED');
      }
    });

    it('should fail for empty bot token with MISSING_DATA error', () => {
      const result = validateInitData('auth_date=123&hash=abc', '');

      expect(isFail(result)).toBe(true);
      if (isFail(result)) {
        expect(result.error.code).toBe('MISSING_DATA');
      }
    });

    it('should fail for missing user data with MISSING_DATA error', () => {
      const now = 1700000000;
      vi.setSystemTime(new Date(now * 1000));

      // Create properly signed initData without user
      const params = new URLSearchParams();
      params.set('auth_date', String(now - 60));
      params.set('query_id', 'test_query');

      const dataCheckString = [...params.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join('\n');

      const hash = createInitDataHash(dataCheckString, BOT_TOKEN);
      params.set('hash', hash);

      const initData = params.toString();

      const result = validateInitData(initData, BOT_TOKEN);

      expect(isFail(result)).toBe(true);
      if (isFail(result)) {
        expect(result.error.code).toBe('MISSING_DATA');
      }
    });
  });

  describe('validateInitDataFull', () => {
    it('should return full parsed data with validated user', () => {
      const now = 1700000000;
      vi.setSystemTime(new Date(now * 1000));

      const params = new URLSearchParams();
      params.set('auth_date', String(now - 60));
      params.set('query_id', 'test_query');
      params.set('start_param', 'ref_ABC123');
      params.set('user', JSON.stringify({ id: 123, first_name: 'Test', is_premium: true }));

      const dataCheckString = [...params.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join('\n');

      const hash = createInitDataHash(dataCheckString, BOT_TOKEN);
      params.set('hash', hash);

      const initData = params.toString();

      const result = validateInitDataFull(initData, BOT_TOKEN);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.queryId).toBe('test_query');
        expect(result.value.startParam).toBe('ref_ABC123');
        expect(result.value.validatedUser?.id).toBe(123);
        expect(result.value.validatedUser?.isPremium).toBe(true);
      }
    });
  });

  describe('extractReferralCode / parseStartParam', () => {
    it('should extract code from ref_ prefix', () => {
      const result = extractReferralCode('ref_ABC12345');

      expect(result).toBe('ABC12345');
    });

    it('should extract standalone code', () => {
      const result = extractReferralCode('XYZ98765');

      expect(result).toBe('XYZ98765');
    });

    it('should convert to uppercase', () => {
      const result = extractReferralCode('abc12345');

      expect(result).toBe('ABC12345');
    });

    it('should return null for undefined', () => {
      const result = extractReferralCode(undefined);

      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = extractReferralCode('');

      expect(result).toBeNull();
    });

    it('should return null for invalid format', () => {
      const result = extractReferralCode('not-a-valid-code!');

      expect(result).toBeNull();
    });

    it('should return null for code too short', () => {
      const result = extractReferralCode('ABC');

      expect(result).toBeNull();
    });

    it('should return null for code too long', () => {
      const result = extractReferralCode('ABCDEFGHIJKLMNOP');

      expect(result).toBeNull();
    });

    it('parseStartParam should be same as extractReferralCode', () => {
      expect(parseStartParam('ref_ABC123')).toBe(extractReferralCode('ref_ABC123'));
      expect(parseStartParam('ABC12345')).toBe(extractReferralCode('ABC12345'));
    });

    it('should handle r_ prefix', () => {
      const result = parseStartParam('r_CODE123');

      expect(result).toBe('CODE123');
    });

    it('should handle invite_ prefix', () => {
      const result = parseStartParam('invite_ABC123');

      expect(result).toBe('ABC123');
    });
  });
});
