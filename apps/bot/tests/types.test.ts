import { describe, it, expect } from 'vitest';
import { parseDeepLink } from '../src/types.js';

describe('parseDeepLink', () => {
  describe('referral codes with ref_ prefix', () => {
    it('should parse ref_ABC12345 format', () => {
      const result = parseDeepLink('ref_ABC12345');
      expect(result).toEqual({
        type: 'referral',
        code: 'ABC12345',
      });
    });

    it('should parse ref_ with lowercase code', () => {
      const result = parseDeepLink('ref_abc12345');
      expect(result).toEqual({
        type: 'referral',
        code: 'abc12345',
      });
    });

    it('should parse ref_ with long code', () => {
      const result = parseDeepLink('ref_VERYLONGCODE123');
      expect(result).toEqual({
        type: 'referral',
        code: 'VERYLONGCODE123',
      });
    });
  });

  describe('plain 8-character referral codes', () => {
    it('should parse 8-char alphanumeric code', () => {
      const result = parseDeepLink('ABC12345');
      expect(result).toEqual({
        type: 'referral',
        code: 'ABC12345',
      });
    });

    it('should parse 8-char all numbers', () => {
      const result = parseDeepLink('12345678');
      expect(result).toEqual({
        type: 'referral',
        code: '12345678',
      });
    });

    it('should parse 8-char all uppercase', () => {
      const result = parseDeepLink('ABCDEFGH');
      expect(result).toEqual({
        type: 'referral',
        code: 'ABCDEFGH',
      });
    });
  });

  describe('invalid inputs', () => {
    it('should return null for undefined', () => {
      const result = parseDeepLink(undefined);
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = parseDeepLink('');
      expect(result).toBeNull();
    });

    it('should return null for 7-char code', () => {
      const result = parseDeepLink('ABC1234');
      expect(result).toBeNull();
    });

    it('should return null for 9-char code', () => {
      const result = parseDeepLink('ABC123456');
      expect(result).toBeNull();
    });

    it('should return null for lowercase 8-char (regex requires uppercase)', () => {
      const result = parseDeepLink('abcdefgh');
      expect(result).toBeNull();
    });

    it('should return null for code with special characters', () => {
      const result = parseDeepLink('ABC-1234');
      expect(result).toBeNull();
    });

    it('should return null for random text', () => {
      const result = parseDeepLink('randomtext');
      expect(result).toBeNull();
    });
  });
});
