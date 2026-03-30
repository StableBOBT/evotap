import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserRecord, UserInsert, UserUpdate } from '../types.js';

/**
 * User domain model (camelCase)
 */
export interface User {
  id?: string;
  telegramId: number;
  firstName: string;
  lastName: string | null;
  username: string | null;
  languageCode: string | null;
  isPremium: boolean;
  referralCode: string;
  referredBy: string | null;
  walletAddress: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Result type for repository operations
 */
interface ResultOk<T> {
  readonly isOk: true;
  readonly data: T;
}

interface ResultFail<E> {
  readonly isOk: false;
  readonly error: E;
}

type Result<T, E = Error> = ResultOk<T> | ResultFail<E>;

function ok<T>(data: T): ResultOk<T> {
  return { isOk: true, data };
}

function fail<E>(error: E): ResultFail<E> {
  return { isOk: false, error };
}

/**
 * Repository error types
 */
export class RepositoryError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'RepositoryError';
  }
}

export class DuplicateError extends RepositoryError {
  constructor(message: string) {
    super(message, '23505');
    this.name = 'DuplicateError';
  }
}

/**
 * User Repository Interface
 */
export interface UserRepository {
  findByTelegramId(telegramId: number): Promise<User | null>;
  findByReferralCode(code: string): Promise<User | null>;
  save(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<Result<User, RepositoryError>>;
  update(telegramId: number, data: Partial<User>): Promise<Result<User, RepositoryError>>;
  delete(telegramId: number): Promise<void>;
  existsByTelegramId(telegramId: number): Promise<boolean>;
}

/**
 * Maps database record (snake_case) to domain model (camelCase)
 */
function toDomain(record: UserRecord): User {
  return {
    id: record.id,
    telegramId: record.telegram_id,
    firstName: record.first_name,
    lastName: record.last_name,
    username: record.username,
    languageCode: record.language_code,
    isPremium: record.is_premium,
    referralCode: record.referral_code,
    referredBy: record.referred_by,
    walletAddress: record.wallet_address,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

/**
 * Maps domain model (camelCase) to database insert (snake_case)
 */
function toInsert(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): UserInsert {
  return {
    telegram_id: user.telegramId,
    first_name: user.firstName,
    last_name: user.lastName,
    username: user.username,
    language_code: user.languageCode,
    is_premium: user.isPremium,
    referral_code: user.referralCode,
    referred_by: user.referredBy,
    wallet_address: user.walletAddress,
  };
}

/**
 * Maps partial domain model to database update
 * Note: referral_code is immutable and cannot be updated
 */
function toUpdate(data: Partial<User>): UserUpdate {
  const update: UserUpdate = {};

  if (data.firstName !== undefined) update.first_name = data.firstName;
  if (data.lastName !== undefined) update.last_name = data.lastName;
  if (data.username !== undefined) update.username = data.username;
  if (data.languageCode !== undefined) update.language_code = data.languageCode;
  if (data.isPremium !== undefined) update.is_premium = data.isPremium;
  // referral_code is immutable - intentionally not included
  if (data.referredBy !== undefined) update.referred_by = data.referredBy;
  if (data.walletAddress !== undefined) update.wallet_address = data.walletAddress;

  // updated_at is auto-set by database trigger, but we include it for manual override
  update.updated_at = new Date().toISOString();

  return update;
}

/**
 * Supabase implementation of UserRepository
 */
export class SupabaseUserRepository implements UserRepository {
  private readonly TABLE = 'users';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly supabase: SupabaseClient<any>) {}

  async findByTelegramId(telegramId: number): Promise<User | null> {
    const { data, error } = await this.supabase
      .from(this.TABLE)
      .select()
      .eq('telegram_id', telegramId)
      .single();

    if (error) {
      // PGRST116 = no rows found, not an error
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new RepositoryError(error.message, error.code);
    }

    return data ? toDomain(data) : null;
  }

  async findByReferralCode(code: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from(this.TABLE)
      .select()
      .eq('referral_code', code)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new RepositoryError(error.message, error.code);
    }

    return data ? toDomain(data) : null;
  }

  async save(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<Result<User, RepositoryError>> {
    const { data, error } = await this.supabase
      .from(this.TABLE)
      .insert(toInsert(user))
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return fail(new DuplicateError('User already exists'));
      }
      return fail(new RepositoryError(error.message, error.code));
    }

    return ok(toDomain(data));
  }

  async update(telegramId: number, data: Partial<User>): Promise<Result<User, RepositoryError>> {
    const { data: updated, error } = await this.supabase
      .from(this.TABLE)
      .update(toUpdate(data))
      .eq('telegram_id', telegramId)
      .select()
      .single();

    if (error) {
      return fail(new RepositoryError(error.message, error.code));
    }

    return ok(toDomain(updated));
  }

  async delete(telegramId: number): Promise<void> {
    const { error } = await this.supabase
      .from(this.TABLE)
      .delete()
      .eq('telegram_id', telegramId);

    if (error) {
      throw new RepositoryError(error.message, error.code);
    }
  }

  async existsByTelegramId(telegramId: number): Promise<boolean> {
    const { data, error } = await this.supabase
      .from(this.TABLE)
      .select('id')
      .eq('telegram_id', telegramId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return false;
      }
      throw new RepositoryError(error.message, error.code);
    }

    return data !== null;
  }
}
