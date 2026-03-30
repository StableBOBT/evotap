import { ValueObject } from '../../shared/ValueObject.js';
import { Result } from '../../shared/Result.js';
import { ValidationError } from '../../shared/Errors.js';

interface PointsProps {
  value: number;
}

/**
 * Points Value Object
 * Represents player points (non-negative integers)
 */
export class Points extends ValueObject<PointsProps> {
  private constructor(props: PointsProps) {
    super(props);
  }

  get value(): number {
    return this.props.value;
  }

  /**
   * Creates a Points value object
   */
  static create(value: number): Result<Points, ValidationError> {
    if (value < 0) {
      return Result.fail(new ValidationError('Points cannot be negative'));
    }
    if (!Number.isInteger(value)) {
      return Result.fail(new ValidationError('Points must be an integer'));
    }
    return Result.ok(new Points({ value }));
  }

  /**
   * Creates zero points
   */
  static zero(): Points {
    return new Points({ value: 0 });
  }

  /**
   * Adds points
   */
  add(amount: number): Points {
    return new Points({ value: this.props.value + Math.floor(amount) });
  }

  /**
   * Subtracts points (fails if result would be negative)
   */
  subtract(amount: number): Result<Points, ValidationError> {
    if (this.props.value < amount) {
      return Result.fail(new ValidationError('Cannot subtract more than available points'));
    }
    return Result.ok(new Points({ value: this.props.value - amount }));
  }

  /**
   * Multiplies points by a factor (rounds down)
   */
  multiply(factor: number): Points {
    return new Points({ value: Math.floor(this.props.value * factor) });
  }

  /**
   * Checks if this is greater than other
   */
  isGreaterThan(other: Points): boolean {
    return this.props.value > other.props.value;
  }

  /**
   * Checks if this is greater than or equal to other
   */
  isGreaterThanOrEqual(other: Points): boolean {
    return this.props.value >= other.props.value;
  }

  /**
   * Formats points for display (K, M, B suffixes)
   */
  format(): string {
    const value = this.props.value;

    if (value >= 1_000_000_000) {
      const formatted = value / 1_000_000_000;
      return formatted % 1 === 0 ? `${formatted}B` : `${formatted.toFixed(1)}B`;
    }

    if (value >= 1_000_000) {
      const formatted = value / 1_000_000;
      return formatted % 1 === 0 ? `${formatted}M` : `${formatted.toFixed(1)}M`;
    }

    if (value >= 1_000) {
      const formatted = value / 1_000;
      return formatted % 1 === 0 ? `${formatted}K` : `${formatted.toFixed(1)}K`;
    }

    return String(value);
  }
}
