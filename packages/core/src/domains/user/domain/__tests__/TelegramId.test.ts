import { describe, it, expect } from 'vitest';
import { TelegramId } from '../TelegramId.js';

describe('TelegramId', () => {
  describe('create', () => {
    it('should create valid TelegramId from positive integer', () => {
      const result = TelegramId.create(123456789);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.value).toBe(123456789);
      }
    });

    it('should fail for zero', () => {
      const result = TelegramId.create(0);

      expect(result.isFail()).toBe(true);
    });

    it('should fail for negative numbers', () => {
      const result = TelegramId.create(-123);

      expect(result.isFail()).toBe(true);
    });

    it('should fail for non-integer numbers', () => {
      const result = TelegramId.create(123.456);

      expect(result.isFail()).toBe(true);
    });

    it('should fail for NaN', () => {
      const result = TelegramId.create(NaN);

      expect(result.isFail()).toBe(true);
    });

    it('should fail for Infinity', () => {
      const result = TelegramId.create(Infinity);

      expect(result.isFail()).toBe(true);
    });
  });

  describe('equality', () => {
    it('should be equal when values match', () => {
      const id1 = TelegramId.create(123456789);
      const id2 = TelegramId.create(123456789);

      expect(id1.isOk() && id2.isOk()).toBe(true);
      if (id1.isOk() && id2.isOk()) {
        expect(id1.value.equals(id2.value)).toBe(true);
      }
    });

    it('should not be equal when values differ', () => {
      const id1 = TelegramId.create(123456789);
      const id2 = TelegramId.create(987654321);

      expect(id1.isOk() && id2.isOk()).toBe(true);
      if (id1.isOk() && id2.isOk()) {
        expect(id1.value.equals(id2.value)).toBe(false);
      }
    });
  });

  describe('toString', () => {
    it('should convert to string', () => {
      const result = TelegramId.create(123456789);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.toString()).toBe('123456789');
      }
    });
  });
});
