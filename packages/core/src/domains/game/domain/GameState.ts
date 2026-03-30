import { Entity } from '../../shared/Entity.js';
import { Result, isOk } from '../../shared/Result.js';
import { ValidationError, NoEnergyError } from '../../shared/Errors.js';
import { TelegramId } from '../../user/domain/TelegramId.js';
import { Energy } from './Energy.js';
import { Points } from './Points.js';
import { Level } from './Level.js';

interface GameStateProps {
  userId: TelegramId;
  energy: Energy;
  points: Points;
  level: Level;
  totalTaps: number;
  streakDays: number;
  lastTapAt: Date | null;
  lastStreakDate: Date | null;
}

interface CreateGameStateProps {
  userId: TelegramId;
}

interface TapResult {
  pointsEarned: number;
  newTotal: number;
}

/**
 * GameState Entity
 * Aggregate root for game state management
 */
export class GameState extends Entity<TelegramId> {
  private props: GameStateProps;

  private constructor(props: GameStateProps) {
    super(props.userId);
    this.props = props;
  }

  // Getters
  get userId(): TelegramId {
    return this.props.userId;
  }

  get energy(): number {
    return this.props.energy.value;
  }

  get points(): number {
    return this.props.points.value;
  }

  get level(): number {
    return this.props.level.value;
  }

  get totalTaps(): number {
    return this.props.totalTaps;
  }

  get streakDays(): number {
    return this.props.streakDays;
  }

  get lastTapAt(): Date | null {
    return this.props.lastTapAt;
  }

  /**
   * Creates a new game state with default values
   */
  static create(props: CreateGameStateProps): Result<GameState, ValidationError> {
    const energyResult = Energy.create(Energy.MAX);
    if (!isOk(energyResult)) {
      return Result.fail(new ValidationError('Failed to create energy'));
    }

    const level = Level.create() as Level;

    return Result.ok(new GameState({
      userId: props.userId,
      energy: energyResult.value,
      points: Points.zero(),
      level,
      totalTaps: 0,
      streakDays: 0,
      lastTapAt: null,
      lastStreakDate: null,
    }));
  }

  /**
   * Performs a single tap
   */
  tap(): Result<TapResult, NoEnergyError> {
    const consumeResult = this.props.energy.consume();
    if (!isOk(consumeResult)) {
      return Result.fail(new NoEnergyError());
    }

    this.props.energy = consumeResult.value;

    // Calculate points with level multiplier
    const pointsEarned = Math.floor(1 * this.props.level.tapMultiplier());
    this.props.points = this.props.points.add(pointsEarned);
    this.props.totalTaps += 1;
    this.props.lastTapAt = new Date();

    return Result.ok({
      pointsEarned,
      newTotal: this.props.points.value,
    });
  }

  /**
   * Performs multiple taps at once
   */
  multiTap(count: number): Result<TapResult, NoEnergyError> {
    const consumeResult = this.props.energy.consumeAmount(count);
    if (!isOk(consumeResult)) {
      return Result.fail(new NoEnergyError());
    }

    this.props.energy = consumeResult.value;

    // Calculate total points with level multiplier
    const pointsEarned = Math.floor(count * this.props.level.tapMultiplier());
    this.props.points = this.props.points.add(pointsEarned);
    this.props.totalTaps += count;
    this.props.lastTapAt = new Date();

    return Result.ok({
      pointsEarned,
      newTotal: this.props.points.value,
    });
  }

  /**
   * Recharges energy based on time since last tap
   */
  rechargeEnergy(): void {
    if (!this.props.lastTapAt) return;

    const now = new Date();
    const minutesPassed = Math.floor(
      (now.getTime() - this.props.lastTapAt.getTime()) / (1000 * 60)
    );

    if (minutesPassed > 0) {
      this.props.energy = this.props.energy.recharge(minutesPassed);
      // Update lastTapAt to prevent double recharge
      this.props.lastTapAt = now;
    }
  }

  /**
   * Checks and performs level up if eligible
   * Returns true if leveled up
   */
  checkLevelUp(): boolean {
    if (this.props.level.canLevelUp(this.props.points)) {
      this.props.level = this.props.level.levelUp();
      return true;
    }
    return false;
  }

  /**
   * Updates streak based on current date
   */
  updateStreak(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!this.props.lastStreakDate) {
      // First time playing
      this.props.streakDays = 1;
      this.props.lastStreakDate = today;
      return;
    }

    const lastDate = new Date(this.props.lastStreakDate);
    lastDate.setHours(0, 0, 0, 0);

    const diffDays = Math.floor(
      (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      // Same day, no change
      return;
    } else if (diffDays === 1) {
      // Consecutive day
      this.props.streakDays += 1;
    } else {
      // Streak broken
      this.props.streakDays = 1;
    }

    this.props.lastStreakDate = today;
  }

  /**
   * Checks if player has energy
   */
  hasEnergy(): boolean {
    return !this.props.energy.isEmpty();
  }

  /**
   * Returns energy percentage
   */
  energyPercentage(): number {
    return this.props.energy.percentage();
  }
}
