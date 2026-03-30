import { ValueObject } from '../../shared/ValueObject.js';
import { Result } from '../../shared/Result.js';
import { ValidationError, NoEnergyError } from '../../shared/Errors.js';

interface EnergyProps {
  value: number;
}

/**
 * Energy Value Object
 * Represents player energy for tapping (0-1000)
 * Recharges at 1 energy per minute
 */
export class Energy extends ValueObject<EnergyProps> {
  static readonly MAX = 1000;
  static readonly RECHARGE_PER_MINUTE = 1;

  private constructor(props: EnergyProps) {
    super(props);
  }

  get value(): number {
    return this.props.value;
  }

  /**
   * Creates an Energy value object
   * Caps at MAX, fails for negative values
   */
  static create(value: number): Result<Energy, ValidationError> {
    if (value < 0) {
      return Result.fail(new ValidationError('Energy cannot be negative'));
    }

    const cappedValue = Math.min(value, Energy.MAX);
    return Result.ok(new Energy({ value: cappedValue }));
  }

  /**
   * Consumes 1 energy point
   */
  consume(): Result<Energy, NoEnergyError> {
    if (this.props.value <= 0) {
      return Result.fail(new NoEnergyError());
    }
    return Result.ok(new Energy({ value: this.props.value - 1 }));
  }

  /**
   * Consumes a specific amount of energy
   */
  consumeAmount(amount: number): Result<Energy, NoEnergyError> {
    if (this.props.value < amount) {
      return Result.fail(new NoEnergyError('Not enough energy'));
    }
    return Result.ok(new Energy({ value: this.props.value - amount }));
  }

  /**
   * Recharges energy based on minutes passed
   * Returns new energy amount (capped at MAX)
   */
  recharge(minutes: number): Energy {
    const recharged = this.props.value + (minutes * Energy.RECHARGE_PER_MINUTE);
    return new Energy({ value: Math.min(recharged, Energy.MAX) });
  }

  /**
   * Checks if energy is at maximum
   */
  isFull(): boolean {
    return this.props.value >= Energy.MAX;
  }

  /**
   * Checks if energy is zero
   */
  isEmpty(): boolean {
    return this.props.value <= 0;
  }

  /**
   * Returns energy as percentage (0-100)
   */
  percentage(): number {
    return Math.round((this.props.value / Energy.MAX) * 100);
  }
}
