/**
 * Base Domain Error class
 * All domain errors should extend this
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace?.(this, this.constructor);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
    };
  }
}

/**
 * Validation Error
 * For invalid input/state errors
 */
export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR';

  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message);
  }
}

/**
 * Not Found Error
 * For missing entity/resource errors
 */
export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';

  constructor(
    public readonly entityType: string,
    public readonly entityId: string
  ) {
    super(`${entityType} with id '${entityId}' not found`);
  }
}

/**
 * Conflict Error
 * For duplicate/already exists errors
 */
export class ConflictError extends DomainError {
  readonly code = 'CONFLICT';

  constructor(message: string) {
    super(message);
  }
}

/**
 * Authorization Error
 * For permission denied errors
 */
export class AuthorizationError extends DomainError {
  readonly code = 'UNAUTHORIZED';

  constructor(message: string = 'You are not authorized to perform this action') {
    super(message);
  }
}

/**
 * Business Rule Error
 * For domain invariant violations
 */
export class BusinessRuleError extends DomainError {
  readonly code = 'BUSINESS_RULE_VIOLATION';

  constructor(
    message: string,
    public readonly rule: string
  ) {
    super(message);
  }
}

/**
 * Rate Limit Error
 */
export class RateLimitError extends DomainError {
  readonly code = 'RATE_LIMITED';

  constructor(
    message: string = 'Too many requests',
    public readonly retryAfterSeconds?: number
  ) {
    super(message);
  }
}

// Game-specific errors

/**
 * No Energy Error
 */
export class NoEnergyError extends BusinessRuleError {
  constructor(message: string = 'Not enough energy to perform this action') {
    super(message, 'ENERGY_REQUIRED');
  }
}

/**
 * Game Not Found Error
 */
export class GameNotFoundError extends NotFoundError {
  constructor(userId: string) {
    super('GameState', userId);
  }
}

/**
 * User Not Found Error
 */
export class UserNotFoundError extends NotFoundError {
  constructor(userId: string) {
    super('User', userId);
  }
}

/**
 * Invalid Referral Error
 */
export class InvalidReferralError extends BusinessRuleError {
  constructor(reason: string) {
    super(reason, 'INVALID_REFERRAL');
  }
}

/**
 * Duplicate User Error
 */
export class DuplicateUserError extends ConflictError {
  constructor(telegramId: number) {
    super(`User with Telegram ID ${telegramId} already exists`);
  }
}
