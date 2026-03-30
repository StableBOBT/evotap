import { ValueObject } from '../../shared/ValueObject.js';
import { Result } from '../../shared/Result.js';
import { ValidationError } from '../../shared/Errors.js';
import { Points } from './Points.js';

interface LevelProps {
  value: number;
}

/**
 * Level Value Object
 * Represents player level (1+)
 */
export class Level extends ValueObject<LevelProps> {
  private constructor(props: LevelProps) {
    super(props);
  }

  get value(): number {
    return this.props.value;
  }

  /**
   * Creates level 1 (default) or validates a specific level
   */
  static create(value?: number): Level | Result<Level, ValidationError> {
    // Default to level 1 if no value provided
    if (value === undefined) {
      return new Level({ value: 1 });
    }

    // Validate provided value
    if (!Number.isInteger(value)) {
      return Result.fail(new ValidationError('Level must be an integer'));
    }
    if (value < 1) {
      return Result.fail(new ValidationError('Level must be at least 1'));
    }

    return Result.ok(new Level({ value }));
  }

  /**
   * Returns points needed to reach the next level
   * Formula: 1000 * level^1.5
   */
  pointsToNextLevel(): number {
    return Math.floor(1000 * Math.pow(this.props.value, 1.5));
  }

  /**
   * Checks if player can level up based on points
   */
  canLevelUp(points: Points): boolean {
    return points.value >= this.pointsToNextLevel();
  }

  /**
   * Returns the next level
   */
  levelUp(): Level {
    return new Level({ value: this.props.value + 1 });
  }

  /**
   * Returns tap multiplier based on level
   * Formula: 1 + (level - 1) * 0.1
   */
  tapMultiplier(): number {
    return 1 + (this.props.value - 1) * 0.1;
  }

  /**
   * Returns energy bonus based on level
   * Formula: (level - 1) * 10
   */
  energyBonus(): number {
    return (this.props.value - 1) * 10;
  }

  /**
   * Returns title based on level
   */
  title(): string {
    const level = this.props.value;

    if (level >= 100) return 'Legend';
    if (level >= 50) return 'Master';
    if (level >= 25) return 'Pro';
    if (level >= 10) return 'Tapper';
    return 'Novice';
  }
}
