import { ValueObject } from '../../shared/ValueObject.js';
import { Result } from '../../shared/Result.js';
import { ValidationError } from '../../shared/Errors.js';

interface TelegramIdProps {
  value: number;
}

/**
 * TelegramId Value Object
 * Represents a valid Telegram user ID (positive integer)
 */
export class TelegramId extends ValueObject<TelegramIdProps> {
  private constructor(props: TelegramIdProps) {
    super(props);
  }

  get value(): number {
    return this.props.value;
  }

  /**
   * Creates a TelegramId from a number
   * Validates that it's a positive integer
   */
  static create(id: number): Result<TelegramId, ValidationError> {
    // Check for NaN
    if (Number.isNaN(id)) {
      return Result.fail(new ValidationError('TelegramId cannot be NaN'));
    }

    // Check for Infinity
    if (!Number.isFinite(id)) {
      return Result.fail(new ValidationError('TelegramId must be finite'));
    }

    // Check for non-integer
    if (!Number.isInteger(id)) {
      return Result.fail(new ValidationError('TelegramId must be an integer'));
    }

    // Check for zero or negative
    if (id <= 0) {
      return Result.fail(new ValidationError('TelegramId must be a positive integer'));
    }

    return Result.ok(new TelegramId({ value: id }));
  }

  /**
   * Compares two TelegramIds for equality
   */
  equals(other: TelegramId | null | undefined): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    return this.props.value === other.props.value;
  }

  /**
   * Returns string representation
   */
  toString(): string {
    return String(this.props.value);
  }
}
