import { Entity } from '../../shared/Entity.js';
import { Result } from '../../shared/Result.js';
import { ValidationError } from '../../shared/Errors.js';
import { TelegramId } from './TelegramId.js';

interface UserProps {
  telegramId: TelegramId;
  firstName: string;
  lastName: string | undefined;
  username: string | undefined;
  languageCode: string | undefined;
  isPremium: boolean | undefined;
  referralCode: string;
  referredBy: string | null;
  walletAddress: string | null;
}

interface CreateUserProps {
  telegramId: TelegramId;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  isPremium?: boolean;
}

/**
 * User Entity
 * Aggregate root for user domain
 */
export class User extends Entity<TelegramId> {
  private props: UserProps;

  private constructor(props: UserProps) {
    super(props.telegramId);
    this.props = props;
  }

  // Getters
  get telegramId(): TelegramId {
    return this.props.telegramId;
  }

  get firstName(): string {
    return this.props.firstName;
  }

  get lastName(): string | undefined {
    return this.props.lastName;
  }

  get username(): string | undefined {
    return this.props.username;
  }

  get languageCode(): string | undefined {
    return this.props.languageCode;
  }

  get isPremium(): boolean {
    return this.props.isPremium ?? false;
  }

  get referralCode(): string {
    return this.props.referralCode;
  }

  get referredBy(): string | null {
    return this.props.referredBy;
  }

  get walletAddress(): string | null {
    return this.props.walletAddress;
  }

  /**
   * Generates a unique 8-character referral code
   */
  private static generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Validates TON wallet address format
   * TON addresses start with UQ (mainnet) or 0Q (testnet)
   */
  private static isValidWalletAddress(address: string): boolean {
    if (!address || address.length === 0) {
      return false;
    }
    // Basic TON address validation - starts with UQ or 0Q and has proper length
    const tonAddressRegex = /^(UQ|0Q|EQ)[A-Za-z0-9_-]{46}$/;
    return tonAddressRegex.test(address);
  }

  /**
   * Creates a new User
   */
  static create(props: CreateUserProps): Result<User, ValidationError> {
    // Validate firstName
    const trimmedFirstName = props.firstName.trim();
    if (trimmedFirstName.length === 0) {
      return Result.fail(new ValidationError('firstName cannot be empty'));
    }

    const referralCode = User.generateReferralCode();

    return Result.ok(new User({
      telegramId: props.telegramId,
      firstName: trimmedFirstName,
      lastName: props.lastName,
      username: props.username,
      languageCode: props.languageCode,
      isPremium: props.isPremium,
      referralCode,
      referredBy: null,
      walletAddress: null,
    }));
  }

  /**
   * Connects a TON wallet to the user
   */
  connectWallet(address: string): Result<void, ValidationError> {
    if (!User.isValidWalletAddress(address)) {
      return Result.fail(new ValidationError('Invalid wallet address format'));
    }

    this.props.walletAddress = address;
    return Result.ok(undefined);
  }

  /**
   * Disconnects the wallet
   */
  disconnectWallet(): void {
    this.props.walletAddress = null;
  }

  /**
   * Sets the referrer code (who referred this user)
   */
  setReferrer(code: string): Result<void, ValidationError> {
    // Cannot set referrer if already has one
    if (this.props.referredBy !== null) {
      return Result.fail(new ValidationError('User already has a referrer'));
    }

    // Cannot refer yourself
    if (code === this.props.referralCode) {
      return Result.fail(new ValidationError('Cannot refer yourself'));
    }

    this.props.referredBy = code;
    return Result.ok(undefined);
  }

  /**
   * Checks if user has a connected wallet
   */
  hasWallet(): boolean {
    return this.props.walletAddress !== null;
  }

  /**
   * Compares two users for equality (by telegramId)
   */
  equals(other: User | null | undefined): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    return this.props.telegramId.equals(other.props.telegramId);
  }
}
