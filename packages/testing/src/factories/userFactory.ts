import { faker } from '@faker-js/faker';

/**
 * User data structure matching domain User entity
 */
export interface UserData {
  id: string;
  telegramId: number;
  username: string | null;
  firstName: string;
  lastName: string | null;
  languageCode: string;
  isPremium: boolean;
  referralCode: string;
  referredBy: string | null;
  walletAddress: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Factory for creating User test data
 */
export class UserFactory {
  private static generateReferralCode(): string {
    return faker.string.alphanumeric(8).toUpperCase();
  }

  /**
   * Create a single user with optional overrides
   */
  static create(overrides: Partial<UserData> = {}): UserData {
    const now = new Date();

    return {
      id: faker.string.uuid(),
      telegramId: faker.number.int({ min: 100000000, max: 999999999 }),
      username: faker.internet.username().toLowerCase(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      languageCode: faker.helpers.arrayElement(['es', 'en', 'pt', 'ru']),
      isPremium: faker.datatype.boolean({ probability: 0.15 }), // 15% premium
      referralCode: this.generateReferralCode(),
      referredBy: null,
      walletAddress: null,
      createdAt: faker.date.past({ years: 1 }),
      updatedAt: now,
      ...overrides,
    };
  }

  /**
   * Create a user with premium status
   */
  static createPremium(overrides: Partial<UserData> = {}): UserData {
    return this.create({ isPremium: true, ...overrides });
  }

  /**
   * Create a user with connected wallet
   */
  static createWithWallet(overrides: Partial<UserData> = {}): UserData {
    const address = `UQ${faker.string.alphanumeric(46)}`;
    return this.create({ walletAddress: address, ...overrides });
  }

  /**
   * Create a referred user
   */
  static createReferred(referrerCode: string, overrides: Partial<UserData> = {}): UserData {
    return this.create({ referredBy: referrerCode, ...overrides });
  }

  /**
   * Create multiple users
   */
  static createMany(count: number, overrides: Partial<UserData> = {}): UserData[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  /**
   * Create a batch of users with referral chain
   */
  static createReferralChain(depth: number): UserData[] {
    const users: UserData[] = [];
    let previousCode: string | null = null;

    for (let i = 0; i < depth; i++) {
      const user = this.create({
        referredBy: previousCode,
      });
      users.push(user);
      previousCode = user.referralCode;
    }

    return users;
  }
}
