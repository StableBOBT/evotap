import type { SupabaseClient } from '@supabase/supabase-js';
import type { GameStateRecord, GameStateInsert, GameStateUpdate } from '../types.js';

/**
 * GameState domain model (camelCase)
 */
export interface GameState {
  id?: string;
  userId: string;
  telegramId: number;
  points: number;
  energy: number;
  level: number;
  totalTaps: number;
  streakDays: number;
  lastTapAt: string | null;
  lastStreakDate: string | null;
  lastPlayDate?: string | null;
  team?: string | null;
  department?: string | null;
  tapPower?: number;
  trustScore?: number;
  isBanned?: boolean;
  banReason?: string | null;
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
 * Repository error
 */
export class RepositoryError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'RepositoryError';
  }
}

/**
 * GameState Repository Interface
 */
export interface GameStateRepository {
  findByTelegramId(telegramId: number): Promise<GameState | null>;
  findByUserId(userId: string): Promise<GameState | null>;
  save(gameState: Omit<GameState, 'id' | 'createdAt' | 'updatedAt'>): Promise<Result<GameState, RepositoryError>>;
  update(telegramId: number, data: Partial<GameState>): Promise<Result<GameState, RepositoryError>>;
  /**
   * Process taps and update points atomically
   * @param telegramId - User's Telegram ID
   * @param tapsCount - Number of taps to process (increments totalTaps)
   * @param pointsPerTap - Points earned per tap (default: 1)
   */
  processTaps(telegramId: number, tapsCount: number, pointsPerTap?: number): Promise<Result<GameState, RepositoryError>>;
  existsByTelegramId(telegramId: number): Promise<boolean>;
}

/**
 * Maps database record (snake_case) to domain model (camelCase)
 */
function toDomain(record: GameStateRecord): GameState {
  return {
    id: record.id,
    userId: record.user_id,
    telegramId: record.telegram_id,
    points: record.points,
    energy: record.energy,
    level: record.level,
    totalTaps: record.total_taps,
    streakDays: record.streak_days,
    lastTapAt: record.last_tap_at,
    lastStreakDate: record.last_streak_date,
    lastPlayDate: record.last_play_date,
    team: record.team,
    department: record.department,
    tapPower: record.tap_power,
    trustScore: record.trust_score,
    isBanned: record.is_banned,
    banReason: record.ban_reason,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

/**
 * Maps domain model (camelCase) to database insert (snake_case)
 */
function toInsert(gameState: Omit<GameState, 'id' | 'createdAt' | 'updatedAt'>): GameStateInsert {
  return {
    user_id: gameState.userId,
    telegram_id: gameState.telegramId,
    points: gameState.points,
    energy: gameState.energy,
    level: gameState.level,
    total_taps: gameState.totalTaps,
    streak_days: gameState.streakDays,
    last_tap_at: gameState.lastTapAt,
    last_streak_date: gameState.lastStreakDate,
    last_play_date: gameState.lastPlayDate,
    team: gameState.team,
    department: gameState.department,
    tap_power: gameState.tapPower,
    trust_score: gameState.trustScore,
    is_banned: gameState.isBanned,
    ban_reason: gameState.banReason,
  };
}

/**
 * Maps partial domain model to database update
 */
function toUpdate(data: Partial<GameState>): GameStateUpdate {
  const update: GameStateUpdate = {};

  if (data.points !== undefined) update.points = data.points;
  if (data.energy !== undefined) update.energy = data.energy;
  if (data.level !== undefined) update.level = data.level;
  if (data.totalTaps !== undefined) update.total_taps = data.totalTaps;
  if (data.streakDays !== undefined) update.streak_days = data.streakDays;
  if (data.lastTapAt !== undefined) update.last_tap_at = data.lastTapAt;
  if (data.lastStreakDate !== undefined) update.last_streak_date = data.lastStreakDate;
  if (data.lastPlayDate !== undefined) update.last_play_date = data.lastPlayDate;
  if (data.team !== undefined) update.team = data.team;
  if (data.department !== undefined) update.department = data.department;
  if (data.tapPower !== undefined) update.tap_power = data.tapPower;
  if (data.trustScore !== undefined) update.trust_score = data.trustScore;
  if (data.isBanned !== undefined) update.is_banned = data.isBanned;
  if (data.banReason !== undefined) update.ban_reason = data.banReason;

  update.updated_at = new Date().toISOString();

  return update;
}

/**
 * Supabase implementation of GameStateRepository
 */
export class SupabaseGameStateRepository implements GameStateRepository {
  private readonly TABLE = 'game_states';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly supabase: SupabaseClient<any>) {}

  async findByTelegramId(telegramId: number): Promise<GameState | null> {
    const { data, error } = await this.supabase
      .from(this.TABLE)
      .select()
      .eq('telegram_id', telegramId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new RepositoryError(error.message, error.code);
    }

    return data ? toDomain(data) : null;
  }

  async findByUserId(userId: string): Promise<GameState | null> {
    const { data, error } = await this.supabase
      .from(this.TABLE)
      .select()
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new RepositoryError(error.message, error.code);
    }

    return data ? toDomain(data) : null;
  }

  async save(gameState: Omit<GameState, 'id' | 'createdAt' | 'updatedAt'>): Promise<Result<GameState, RepositoryError>> {
    const { data, error } = await this.supabase
      .from(this.TABLE)
      .insert(toInsert(gameState))
      .select()
      .single();

    if (error) {
      return fail(new RepositoryError(error.message, error.code));
    }

    return ok(toDomain(data));
  }

  async update(telegramId: number, data: Partial<GameState>): Promise<Result<GameState, RepositoryError>> {
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

  async processTaps(
    telegramId: number,
    tapsCount: number,
    pointsPerTap: number = 1
  ): Promise<Result<GameState, RepositoryError>> {
    // Validate inputs
    if (tapsCount <= 0) {
      return fail(new RepositoryError('Taps count must be positive'));
    }
    if (pointsPerTap <= 0) {
      return fail(new RepositoryError('Points per tap must be positive'));
    }

    const pointsToAdd = tapsCount * pointsPerTap;

    // Use RPC for atomic increment to avoid race conditions
    // Fallback to read-then-write if RPC not available
    const { error } = await this.supabase.rpc('increment_game_stats', {
      p_telegram_id: telegramId,
      p_points: pointsToAdd,
      p_taps: tapsCount,
    });

    if (error) {
      // RPC might not exist, fallback to manual update
      if (error.code === '42883') { // function does not exist
        return this.processTapsFallback(telegramId, tapsCount, pointsToAdd);
      }
      return fail(new RepositoryError(error.message, error.code));
    }

    // Fetch updated state
    const updated = await this.findByTelegramId(telegramId);
    if (!updated) {
      return fail(new RepositoryError('Game state not found after update'));
    }

    return ok(updated);
  }

  /**
   * Fallback method when RPC is not available
   * Note: This has potential race condition under high concurrency
   */
  private async processTapsFallback(
    telegramId: number,
    tapsCount: number,
    pointsToAdd: number
  ): Promise<Result<GameState, RepositoryError>> {
    const current = await this.findByTelegramId(telegramId);
    if (!current) {
      return fail(new RepositoryError('Game state not found'));
    }

    return this.update(telegramId, {
      points: current.points + pointsToAdd,
      totalTaps: current.totalTaps + tapsCount, // Fixed: increment by taps, not points
      lastTapAt: new Date().toISOString(),
    });
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
