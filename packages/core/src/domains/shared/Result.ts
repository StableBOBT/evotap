/**
 * Result type for type-safe error handling
 * Eliminates try/catch in favor of explicit error handling
 *
 * @example
 * ```ts
 * function divide(a: number, b: number): Result<number, DivisionError> {
 *   if (b === 0) {
 *     return Result.fail(new DivisionError('Cannot divide by zero'));
 *   }
 *   return Result.ok(a / b);
 * }
 *
 * const result = divide(10, 2);
 * if (result.isOk()) {
 *   console.log(result.value); // 5
 * } else {
 *   console.error(result.error.message);
 * }
 * ```
 */

interface ResultBase<T, E> {
  readonly _tag: 'Ok' | 'Fail';
  isOk(): boolean;
  isFail(): boolean;
  map<U>(fn: (value: T) => U): Result<U, E>;
  flatMap<U, E2>(fn: (value: T) => Result<U, E2>): Result<U, E | E2>;
  mapError<E2>(fn: (error: E) => E2): Result<T, E2>;
  unwrap(): T;
  unwrapOr(defaultValue: T): T;
  match<U>(handlers: { ok: (value: T) => U; fail: (error: E) => U }): U;
}

export interface ResultOk<T> extends ResultBase<T, never> {
  readonly _tag: 'Ok';
  readonly value: T;
}

export interface ResultFail<E> extends ResultBase<never, E> {
  readonly _tag: 'Fail';
  readonly error: E;
}

export type Result<T, E = Error> = ResultOk<T> | ResultFail<E>;

/**
 * Type guard for Ok results
 */
export function isOk<T, E>(result: Result<T, E>): result is ResultOk<T> {
  return result._tag === 'Ok';
}

/**
 * Type guard for Fail results
 */
export function isFail<T, E>(result: Result<T, E>): result is ResultFail<E> {
  return result._tag === 'Fail';
}

/**
 * Result namespace with factory methods and utilities
 */
export const Result = {
  /**
   * Create a successful result
   */
  ok<T>(value: T): ResultOk<T> {
    const self: ResultOk<T> = {
      _tag: 'Ok' as const,
      value,
      isOk: () => true,
      isFail: () => false,
      map: <U>(fn: (v: T) => U) => Result.ok(fn(value)),
      flatMap: <U, E2>(fn: (v: T) => Result<U, E2>) => fn(value),
      mapError: <E2>(_fn: (e: never) => E2) => self as unknown as Result<T, E2>,
      unwrap: () => value,
      unwrapOr: () => value,
      match: <U>(handlers: { ok: (v: T) => U; fail: (e: never) => U }) => handlers.ok(value),
    };
    return self;
  },

  /**
   * Create a failed result
   */
  fail<E>(error: E): ResultFail<E> {
    const self: ResultFail<E> = {
      _tag: 'Fail' as const,
      error,
      isOk: () => false,
      isFail: () => true,
      map: <U>(_fn: (v: never) => U) => self as unknown as Result<U, E>,
      flatMap: <U, E2>(_fn: (v: never) => Result<U, E2>) => self as unknown as Result<U, E | E2>,
      mapError: <E2>(fn: (e: E) => E2) => Result.fail(fn(error)),
      unwrap: (): never => {
        throw error;
      },
      unwrapOr: <T>(defaultValue: T) => defaultValue,
      match: <U>(handlers: { ok: (v: never) => U; fail: (e: E) => U }) => handlers.fail(error),
    };
    return self;
  },

  /**
   * Wrap a function that might throw into a Result
   */
  fromThrowable<T, E = Error>(fn: () => T, errorMapper?: (e: unknown) => E): Result<T, E> {
    try {
      return Result.ok(fn());
    } catch (e) {
      if (errorMapper) {
        return Result.fail(errorMapper(e));
      }
      return Result.fail(e as E);
    }
  },

  /**
   * Wrap an async function that might throw into a Result
   */
  async fromThrowableAsync<T, E = Error>(
    fn: () => Promise<T>,
    errorMapper?: (e: unknown) => E
  ): Promise<Result<T, E>> {
    try {
      const value = await fn();
      return Result.ok(value);
    } catch (e) {
      if (errorMapper) {
        return Result.fail(errorMapper(e));
      }
      return Result.fail(e as E);
    }
  },

  /**
   * Combine multiple Results into one
   * If any fails, returns the first failure
   */
  combine<T extends readonly Result<unknown, unknown>[]>(
    results: T
  ): Result<
    { [K in keyof T]: T[K] extends Result<infer U, unknown> ? U : never },
    T[number] extends Result<unknown, infer E> ? E : never
  > {
    const values: unknown[] = [];

    for (const result of results) {
      if (isFail(result)) {
        return result as unknown as ResultFail<
          T[number] extends Result<unknown, infer E> ? E : never
        >;
      }
      values.push((result as ResultOk<unknown>).value);
    }

    return Result.ok(values) as unknown as ResultOk<{
      [K in keyof T]: T[K] extends Result<infer U, unknown> ? U : never;
    }>;
  },

  /**
   * Check if a value is a Result
   */
  isResult<T, E>(value: unknown): value is Result<T, E> {
    return (
      typeof value === 'object' &&
      value !== null &&
      '_tag' in value &&
      (value._tag === 'Ok' || value._tag === 'Fail')
    );
  },

  /**
   * Type guard for Ok
   */
  isOk,

  /**
   * Type guard for Fail
   */
  isFail,
};
