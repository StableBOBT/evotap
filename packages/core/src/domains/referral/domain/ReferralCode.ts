import { ValueObject } from '../../shared/ValueObject.js';
import { Result } from '../../shared/Result.js';
import { ValidationError } from '../../shared/Errors.js';

interface ReferralCodeProps {
  value: string;
}

/**
 * ReferralCode Value Object
 * 6-12 character alphanumeric code
 */
export class ReferralCode extends ValueObject<ReferralCodeProps> {
  private static readonly MIN_LENGTH = 6;
  private static readonly MAX_LENGTH = 12;
  private static readonly DEFAULT_LENGTH = 8;
  private static readonly CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  private static readonly VALID_PATTERN = /^[A-Z0-9]+$/;

  private constructor(props: ReferralCodeProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  /**
   * Creates a ReferralCode from string
   * Converts to uppercase
   */
  static create(code: string): Result<ReferralCode, ValidationError> {
    if (!code || code.length === 0) {
      return Result.fail(new ValidationError('Referral code cannot be empty'));
    }

    const normalizedCode = code.toUpperCase();

    if (normalizedCode.length < ReferralCode.MIN_LENGTH) {
      return Result.fail(new ValidationError(
        `Referral code must be at least ${ReferralCode.MIN_LENGTH} characters`
      ));
    }

    if (normalizedCode.length > ReferralCode.MAX_LENGTH) {
      return Result.fail(new ValidationError(
        `Referral code cannot exceed ${ReferralCode.MAX_LENGTH} characters`
      ));
    }

    if (!ReferralCode.VALID_PATTERN.test(normalizedCode)) {
      return Result.fail(new ValidationError(
        'Referral code can only contain letters and numbers'
      ));
    }

    return Result.ok(new ReferralCode({ value: normalizedCode }));
  }

  /**
   * Generates a new random referral code
   */
  static generate(): ReferralCode {
    let code = '';
    for (let i = 0; i < ReferralCode.DEFAULT_LENGTH; i++) {
      const randomIndex = Math.floor(Math.random() * ReferralCode.CHARSET.length);
      code += ReferralCode.CHARSET[randomIndex];
    }
    return new ReferralCode({ value: code });
  }

  /**
   * Compares two referral codes (case-insensitive)
   */
  equals(other: ReferralCode | null | undefined): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    return this.props.value === other.props.value;
  }

  /**
   * Returns string representation
   */
  toString(): string {
    return this.props.value;
  }
}
