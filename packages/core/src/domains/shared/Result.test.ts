import { describe, it, expect } from 'vitest';
import { Result } from './Result.js';

describe('Result', () => {
  describe('ok', () => {
    it('should create a successful result', () => {
      const result = Result.ok(42);

      expect(result.isOk()).toBe(true);
      expect(result.isFail()).toBe(false);
      expect(result.value).toBe(42);
    });

    it('should allow null/undefined values', () => {
      const nullResult = Result.ok(null);
      const undefinedResult = Result.ok(undefined);

      expect(nullResult.isOk()).toBe(true);
      expect(nullResult.value).toBeNull();
      expect(undefinedResult.value).toBeUndefined();
    });
  });

  describe('fail', () => {
    it('should create a failed result', () => {
      const error = new Error('Something went wrong');
      const result = Result.fail(error);

      expect(result.isOk()).toBe(false);
      expect(result.isFail()).toBe(true);
      expect(result.error).toBe(error);
    });

    it('should allow string errors', () => {
      const result = Result.fail('error message');

      expect(result.isFail()).toBe(true);
      expect(result.error).toBe('error message');
    });
  });

  describe('map', () => {
    it('should transform ok value', () => {
      const result = Result.ok(5).map((x) => x * 2);

      expect(result.isOk()).toBe(true);
      expect(result.value).toBe(10);
    });

    it('should not transform fail value', () => {
      const result = Result.fail<Error>('error').map((x: never) => x);

      expect(result.isFail()).toBe(true);
      expect(result.error).toBe('error');
    });
  });

  describe('flatMap', () => {
    it('should chain successful results', () => {
      const result = Result.ok(5)
        .flatMap((x) => Result.ok(x * 2))
        .flatMap((x) => Result.ok(x + 1));

      expect(result.isOk()).toBe(true);
      expect(result.value).toBe(11);
    });

    it('should short-circuit on failure', () => {
      const result = Result.ok(5)
        .flatMap((_x) => Result.fail<Error>('error'))
        .flatMap((x: never) => Result.ok(x));

      expect(result.isFail()).toBe(true);
      expect(result.error).toBe('error');
    });
  });

  describe('mapError', () => {
    it('should transform error', () => {
      const result = Result.fail('original').mapError((e) => new Error(e));

      expect(result.isFail()).toBe(true);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('original');
    });

    it('should not transform ok value', () => {
      const result = Result.ok(5).mapError((_e: never) => new Error('ignored'));

      expect(result.isOk()).toBe(true);
      expect(result.value).toBe(5);
    });
  });

  describe('unwrap', () => {
    it('should return value for ok', () => {
      const result = Result.ok(42);

      expect(result.unwrap()).toBe(42);
    });

    it('should throw for fail', () => {
      const error = new Error('test error');
      const result = Result.fail(error);

      expect(() => result.unwrap()).toThrow(error);
    });
  });

  describe('unwrapOr', () => {
    it('should return value for ok', () => {
      const result = Result.ok(42);

      expect(result.unwrapOr(0)).toBe(42);
    });

    it('should return default for fail', () => {
      const result = Result.fail<Error>('error');

      expect(result.unwrapOr(0)).toBe(0);
    });
  });

  describe('match', () => {
    it('should call ok handler for ok result', () => {
      const result = Result.ok(5);
      const matched = result.match({
        ok: (value) => `success: ${value}`,
        fail: (error) => `error: ${error}`,
      });

      expect(matched).toBe('success: 5');
    });

    it('should call fail handler for fail result', () => {
      const result = Result.fail('oops');
      const matched = result.match({
        ok: (value: never) => `success: ${value}`,
        fail: (error) => `error: ${error}`,
      });

      expect(matched).toBe('error: oops');
    });
  });

  describe('fromThrowable', () => {
    it('should wrap successful function', () => {
      const result = Result.fromThrowable(() => 42);

      expect(result.isOk()).toBe(true);
      expect(result.value).toBe(42);
    });

    it('should catch thrown errors', () => {
      const result = Result.fromThrowable(() => {
        throw new Error('boom');
      });

      expect(result.isFail()).toBe(true);
      expect(result.error).toBeInstanceOf(Error);
    });

    it('should apply error mapper', () => {
      const result = Result.fromThrowable(
        () => {
          throw new Error('boom');
        },
        (e) => `Mapped: ${(e as Error).message}`
      );

      expect(result.isFail()).toBe(true);
      expect(result.error).toBe('Mapped: boom');
    });
  });

  describe('fromThrowableAsync', () => {
    it('should wrap successful async function', async () => {
      const result = await Result.fromThrowableAsync(async () => 42);

      expect(result.isOk()).toBe(true);
      expect(result.value).toBe(42);
    });

    it('should catch rejected promises', async () => {
      const result = await Result.fromThrowableAsync(async () => {
        throw new Error('async boom');
      });

      expect(result.isFail()).toBe(true);
      expect(result.error).toBeInstanceOf(Error);
    });
  });

  describe('combine', () => {
    it('should combine successful results', () => {
      const results = [Result.ok(1), Result.ok(2), Result.ok(3)] as const;
      const combined = Result.combine(results);

      expect(combined.isOk()).toBe(true);
      expect(combined.value).toEqual([1, 2, 3]);
    });

    it('should return first failure', () => {
      const results = [
        Result.ok(1),
        Result.fail<Error>('first error'),
        Result.fail<Error>('second error'),
      ] as const;
      const combined = Result.combine(results);

      expect(combined.isFail()).toBe(true);
      expect(combined.error).toBe('first error');
    });

    it('should handle empty array', () => {
      const combined = Result.combine([]);

      expect(combined.isOk()).toBe(true);
      expect(combined.value).toEqual([]);
    });
  });

  describe('isResult', () => {
    it('should identify Result types', () => {
      expect(Result.isResult(Result.ok(1))).toBe(true);
      expect(Result.isResult(Result.fail('error'))).toBe(true);
    });

    it('should reject non-Result types', () => {
      expect(Result.isResult(null)).toBe(false);
      expect(Result.isResult(undefined)).toBe(false);
      expect(Result.isResult({})).toBe(false);
      expect(Result.isResult({ _tag: 'Other' })).toBe(false);
    });
  });
});
