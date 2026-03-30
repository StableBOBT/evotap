import { Entity } from '../../shared/Entity.js';
import { Result } from '../../shared/Result.js';
import { ValidationError } from '../../shared/Errors.js';
import { TelegramId } from '../../user/domain/TelegramId.js';
import { ReferralCode } from './ReferralCode.js';

interface ReferralProps {
  id: string;
  code: ReferralCode;
  inviterId: TelegramId;
  inviteeId: TelegramId;
  pointsEarned: number;
  createdAt: Date;
}

interface CreateReferralProps {
  code: ReferralCode;
  inviterId: TelegramId;
  inviteeId: TelegramId;
}

/**
 * Referral Entity
 * Tracks referral relationships between users
 */
export class Referral extends Entity<string> {
  private static readonly ACTIVE_DAYS = 30;

  private props: ReferralProps;

  private constructor(props: ReferralProps) {
    super(props.id);
    this.props = props;
  }

  // Getters
  get code(): ReferralCode {
    return this.props.code;
  }

  get inviterId(): TelegramId {
    return this.props.inviterId;
  }

  get inviteeId(): TelegramId {
    return this.props.inviteeId;
  }

  get pointsEarned(): number {
    return this.props.pointsEarned;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  /**
   * Generates a unique ID for the referral
   */
  private static generateId(): string {
    return `ref_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Creates a new Referral
   */
  static create(props: CreateReferralProps): Result<Referral, ValidationError> {
    // Inviter and invitee cannot be the same
    if (props.inviterId.equals(props.inviteeId)) {
      return Result.fail(new ValidationError('Cannot refer yourself'));
    }

    return Result.ok(new Referral({
      id: Referral.generateId(),
      code: props.code,
      inviterId: props.inviterId,
      inviteeId: props.inviteeId,
      pointsEarned: 0,
      createdAt: new Date(),
    }));
  }

  /**
   * Awards points for this referral
   */
  awardPoints(amount: number): void {
    this.props.pointsEarned += amount;
  }

  /**
   * Checks if referral is still active (within 30 days)
   */
  isActive(): boolean {
    const daysSinceCreation = this.daysSinceCreation();
    return daysSinceCreation < Referral.ACTIVE_DAYS;
  }

  /**
   * Returns days since referral was created
   */
  daysSinceCreation(): number {
    const now = new Date();
    const diffMs = now.getTime() - this.props.createdAt.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }
}
