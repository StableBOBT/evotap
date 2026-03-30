import type { SupabaseClient } from '@supabase/supabase-js';
import type { ReferralRecord, ReferralInsert } from '../types.js';

/**
 * Referral domain model (camelCase)
 */
export interface Referral {
  id?: string;
  code: string;
  inviterId: string;
  inviterTelegramId: number;
  inviteeId: string;
  inviteeTelegramId: number;
  pointsEarned: number;
  createdAt?: string;
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
 * Repository error
 */
export class RepositoryError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'RepositoryError';
  }
}

export class DuplicateReferralError extends RepositoryError {
  constructor(message: string) {
    super(message, '23505');
    this.name = 'DuplicateReferralError';
  }
}

/**
 * Referral Repository Interface
 */
export interface ReferralRepository {
  findByCode(code: string, limit?: number): Promise<Referral[]>;
  findByInviterId(inviterId: string, limit?: number): Promise<Referral[]>;
  countByInviterId(inviterId: string): Promise<number>;
  save(referral: Omit<Referral, 'id' | 'createdAt'>): Promise<Result<Referral, RepositoryError>>;
  existsByInviteeId(inviteeId: string): Promise<boolean>;
  getTotalPointsEarned(inviterId: string): Promise<number>;
}

/**
 * Maps database record (snake_case) to domain model (camelCase)
 */
function toDomain(record: ReferralRecord): Referral {
  return {
    id: record.id,
    code: record.code,
    inviterId: record.inviter_id,
    inviterTelegramId: record.inviter_telegram_id,
    inviteeId: record.invitee_id,
    inviteeTelegramId: record.invitee_telegram_id,
    pointsEarned: record.points_earned,
    createdAt: record.created_at,
  };
}

/**
 * Maps domain model (camelCase) to database insert (snake_case)
 */
function toInsert(referral: Omit<Referral, 'id' | 'createdAt'>): ReferralInsert {
  return {
    code: referral.code,
    inviter_id: referral.inviterId,
    inviter_telegram_id: referral.inviterTelegramId,
    invitee_id: referral.inviteeId,
    invitee_telegram_id: referral.inviteeTelegramId,
    points_earned: referral.pointsEarned,
  };
}

/**
 * Supabase implementation of ReferralRepository
 */
export class SupabaseReferralRepository implements ReferralRepository {
  private readonly TABLE = 'referrals';
  private readonly DEFAULT_LIMIT = 100;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly supabase: SupabaseClient<any>) {}

  async findByCode(code: string, limit: number = this.DEFAULT_LIMIT): Promise<Referral[]> {
    const { data, error } = await this.supabase
      .from(this.TABLE)
      .select()
      .eq('code', code)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new RepositoryError(error.message, error.code);
    }

    return (data || []).map(toDomain);
  }

  async findByInviterId(inviterId: string, limit: number = this.DEFAULT_LIMIT): Promise<Referral[]> {
    const { data, error } = await this.supabase
      .from(this.TABLE)
      .select()
      .eq('inviter_id', inviterId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new RepositoryError(error.message, error.code);
    }

    return (data || []).map(toDomain);
  }

  async countByInviterId(inviterId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from(this.TABLE)
      .select('*', { count: 'exact', head: true })
      .eq('inviter_id', inviterId);

    if (error) {
      throw new RepositoryError(error.message, error.code);
    }

    return count || 0;
  }

  async save(referral: Omit<Referral, 'id' | 'createdAt'>): Promise<Result<Referral, RepositoryError>> {
    const { data, error } = await this.supabase
      .from(this.TABLE)
      .insert(toInsert(referral))
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return fail(new DuplicateReferralError('Referral already exists'));
      }
      return fail(new RepositoryError(error.message, error.code));
    }

    return ok(toDomain(data));
  }

  async existsByInviteeId(inviteeId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from(this.TABLE)
      .select('id')
      .eq('invitee_id', inviteeId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return false;
      }
      throw new RepositoryError(error.message, error.code);
    }

    return data !== null;
  }

  async getTotalPointsEarned(inviterId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from(this.TABLE)
      .select('points_earned')
      .eq('inviter_id', inviterId);

    if (error) {
      throw new RepositoryError(error.message, error.code);
    }

    return (data || []).reduce((sum, r) => sum + r.points_earned, 0);
  }
}
