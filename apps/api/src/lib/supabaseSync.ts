/**
 * Supabase Sync Service
 * Periodically syncs Redis data to Supabase for persistence
 *
 * Architecture:
 * - Redis: Real-time operations (taps, energy, leaderboards)
 * - Supabase: Persistent storage, historical data, backups
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../types.js';
import { createRedisClient, type RedisClient, type UserGameState } from './redis.js';

interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

/**
 * Create Supabase client from env
 */
export function createSupabaseClient(env: Env): SupabaseClient | null {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[SupabaseSync] Missing Supabase credentials, sync disabled');
    return null;
  }

  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Sync a single user's state from Redis to Supabase
 */
export async function syncUserToSupabase(
  supabase: SupabaseClient,
  telegramId: number,
  state: UserGameState
): Promise<{ success: boolean; error?: string }> {
  try {
    // First, ensure user exists in users table
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', telegramId)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      // PGRST116 = not found, which is ok
      throw new Error(`User lookup error: ${userError.message}`);
    }

    let userId: string;

    if (!existingUser) {
      // Create user (minimal info, will be enriched later)
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          telegram_id: telegramId,
          first_name: 'User',
          referral_code: state.referralCode,
          wallet_address: state.walletAddress,
        })
        .select('id')
        .single();

      if (createError) {
        throw new Error(`User create error: ${createError.message}`);
      }

      userId = newUser.id;
    } else {
      userId = existingUser.id;
    }

    // Upsert game state
    const { error: gameError } = await supabase.from('game_states').upsert(
      {
        user_id: userId,
        telegram_id: telegramId,
        points: state.points,
        energy: state.energy,
        level: state.level,
        total_taps: state.totalTaps,
        streak_days: state.streakDays,
        last_tap_at: state.lastTapAt,
        last_play_date: state.lastPlayDate,
        team: state.team,
        department: state.department,
        tap_power: state.tapPower,
      },
      {
        onConflict: 'telegram_id',
      }
    );

    if (gameError) {
      throw new Error(`Game state upsert error: ${gameError.message}`);
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[SupabaseSync] Failed to sync user ${telegramId}:`, message);
    return { success: false, error: message };
  }
}

/**
 * Batch sync multiple users from Redis to Supabase
 * Called periodically by a scheduled worker
 */
export async function batchSyncToSupabase(
  redis: RedisClient,
  supabase: SupabaseClient,
  telegramIds: number[]
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    synced: 0,
    failed: 0,
    errors: [],
  };

  for (const telegramId of telegramIds) {
    try {
      // Load state from Redis
      const stateKey = `user:${telegramId}:state`;
      const data = await redis.hgetall(stateKey);

      if (!data || Object.keys(data).length === 0) {
        continue; // Skip users with no Redis state
      }

      const state: UserGameState = {
        points: parseInt(data.points || '0', 10) || 0,
        energy: parseInt(data.energy || '1000', 10) || 1000,
        maxEnergy: parseInt(data.maxEnergy || '1000', 10) || 1000,
        tapPower: parseInt(data.tapPower || '1', 10) || 1,
        level: parseInt(data.level || '1', 10) || 1,
        totalTaps: parseInt(data.totalTaps || '0', 10) || 0,
        streakDays: parseInt(data.streakDays || '0', 10) || 0,
        lastTapAt: data.lastTapAt || null,
        lastPlayDate: data.lastPlayDate || null,
        lastEnergyRefill: data.lastEnergyRefill || new Date().toISOString(),
        team: data.team || null,
        department: data.department || null,
        referralCode: data.referralCode || '',
        referredBy: data.referredBy ? parseInt(data.referredBy, 10) : null,
        referralCount: parseInt(data.referralCount || '0', 10) || 0,
        walletAddress: data.walletAddress || null,
        createdAt: data.createdAt || new Date().toISOString(),
      };

      const syncResult = await syncUserToSupabase(supabase, telegramId, state);

      if (syncResult.success) {
        result.synced++;
      } else {
        result.failed++;
        if (syncResult.error) {
          result.errors.push(`${telegramId}: ${syncResult.error}`);
        }
      }
    } catch (error) {
      result.failed++;
      const message = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`${telegramId}: ${message}`);
    }
  }

  result.success = result.failed === 0;
  return result;
}

/**
 * Get all active user IDs from global leaderboard
 * These are users who have played at least once
 */
export async function getActiveUserIds(redis: RedisClient): Promise<number[]> {
  const members = await redis.zrevrange('leaderboard:global', 0, -1);
  return members.map((m) => parseInt(m, 10)).filter((id) => !isNaN(id));
}

/**
 * Sync all active users to Supabase
 * Should be called by a scheduled worker (e.g., every 5 minutes)
 */
export async function syncAllActiveUsers(env: Env): Promise<SyncResult> {
  const supabase = createSupabaseClient(env);

  if (!supabase) {
    return {
      success: false,
      synced: 0,
      failed: 0,
      errors: ['Supabase not configured'],
    };
  }

  const redis = createRedisClient(env);
  const userIds = await getActiveUserIds(redis);

  console.log(`[SupabaseSync] Starting sync for ${userIds.length} active users`);

  const result = await batchSyncToSupabase(redis, supabase, userIds);

  console.log(
    `[SupabaseSync] Sync complete: ${result.synced} synced, ${result.failed} failed`
  );

  if (result.errors.length > 0) {
    console.error('[SupabaseSync] Errors:', result.errors.slice(0, 10));
  }

  return result;
}
