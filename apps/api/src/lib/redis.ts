/**
 * Redis Client for Cloudflare Workers
 * Uses Upstash Redis REST API compatible with edge runtime
 */

import type { Env } from '../types.js';

/**
 * Redis client interface for use in rate limiting and leaderboards
 */
export interface RedisClient {
  // String operations
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { ex?: number }): Promise<'OK'>;
  setnx(key: string, value: string, exSeconds?: number): Promise<boolean>;
  incr(key: string): Promise<number>;
  incrby(key: string, increment: number): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
  del(...keys: string[]): Promise<number>;
  exists(...keys: string[]): Promise<number>;

  // Hash operations
  hget(key: string, field: string): Promise<string | null>;
  hset(key: string, field: string, value: string): Promise<number>;
  hgetall(key: string): Promise<Record<string, string>>;
  hmset(key: string, data: Record<string, string>): Promise<'OK'>;
  hincrby(key: string, field: string, increment: number): Promise<number>;
  hdel(key: string, ...fields: string[]): Promise<number>;

  // Sorted set operations
  zadd(key: string, score: number, member: string): Promise<number>;
  zincrby(key: string, increment: number, member: string): Promise<number>;
  zrevrank(key: string, member: string): Promise<number | null>;
  zscore(key: string, member: string): Promise<number | null>;
  zrevrange(key: string, start: number, stop: number, withScores?: boolean): Promise<string[]>;
  zcard(key: string): Promise<number>;
  zrem(key: string, ...members: string[]): Promise<number>;
  zrank(key: string, member: string): Promise<number | null>;

  // Set operations
  sadd(key: string, ...members: string[]): Promise<number>;
  sismember(key: string, member: string): Promise<number>;
  smembers(key: string): Promise<string[]>;
  srem(key: string, ...members: string[]): Promise<number>;
  scard(key: string): Promise<number>;

  // Key operations
  keys(pattern: string): Promise<string[]>;
}

/**
 * Upstash Redis REST API response
 */
interface UpstashResponse<T = unknown> {
  result: T;
  error?: string;
}

/**
 * Creates an Upstash Redis client using REST API
 * Compatible with Cloudflare Workers edge runtime
 */
export function createRedisClient(env: Env): RedisClient {
  const baseUrl = env.UPSTASH_REDIS_REST_URL.replace(/\/$/, '');
  const token = env.UPSTASH_REDIS_REST_TOKEN;

  async function command<T = unknown>(cmd: string, ...args: (string | number)[]): Promise<T> {
    const response = await fetch(`${baseUrl}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([cmd, ...args]),
    });

    if (!response.ok) {
      throw new Error(`Redis error: ${response.statusText}`);
    }

    const data = (await response.json()) as UpstashResponse<T>;

    if (data.error) {
      throw new Error(`Redis error: ${data.error}`);
    }

    return data.result;
  }

  return {
    // String operations
    get: (key) => command<string | null>('GET', key),
    set: (key, value, options) => {
      if (options?.ex) {
        return command<'OK'>('SETEX', key, options.ex, value);
      }
      return command<'OK'>('SET', key, value);
    },
    setnx: async (key, value, exSeconds) => {
      // SET key value NX EX seconds - atomic set if not exists with expiry
      if (exSeconds) {
        const result = await command<string | null>('SET', key, value, 'NX', 'EX', exSeconds);
        return result === 'OK';
      }
      const result = await command<number>('SETNX', key, value);
      return result === 1;
    },
    incr: (key) => command<number>('INCR', key),
    incrby: (key, increment) => command<number>('INCRBY', key, increment),
    expire: (key, seconds) => command<number>('EXPIRE', key, seconds),
    ttl: (key) => command<number>('TTL', key),
    del: (...keys) => command<number>('DEL', ...keys),
    exists: (...keys) => command<number>('EXISTS', ...keys),

    // Hash operations
    hget: (key, field) => command<string | null>('HGET', key, field),
    hset: (key, field, value) => command<number>('HSET', key, field, value),
    hgetall: async (key) => {
      const result = await command<string[]>('HGETALL', key);
      const obj: Record<string, string> = {};
      if (result && Array.isArray(result)) {
        for (let i = 0; i < result.length; i += 2) {
          const fieldKey = result[i];
          const fieldValue = result[i + 1];
          if (fieldKey !== undefined && fieldValue !== undefined) {
            obj[fieldKey] = fieldValue;
          }
        }
      }
      return obj;
    },
    hmset: async (key, data) => {
      const args: (string | number)[] = [];
      for (const [field, value] of Object.entries(data)) {
        args.push(field, value);
      }
      return command<'OK'>('HMSET', key, ...args);
    },
    hincrby: (key, field, increment) => command<number>('HINCRBY', key, field, increment),
    hdel: (key, ...fields) => command<number>('HDEL', key, ...fields),

    // Sorted set operations
    zadd: (key, score, member) => command<number>('ZADD', key, score, member),
    zincrby: (key, increment, member) => command<number>('ZINCRBY', key, increment, member),
    zrevrank: (key, member) => command<number | null>('ZREVRANK', key, member),
    zscore: async (key, member) => {
      const result = await command<string | null>('ZSCORE', key, member);
      return result !== null ? parseFloat(result) : null;
    },
    zrevrange: async (key, start, stop, withScores = false) => {
      if (withScores) {
        return command<string[]>('ZREVRANGE', key, start, stop, 'WITHSCORES');
      }
      return command<string[]>('ZREVRANGE', key, start, stop);
    },
    zcard: (key) => command<number>('ZCARD', key),
    zrem: (key, ...members) => command<number>('ZREM', key, ...members),
    zrank: (key, member) => command<number | null>('ZRANK', key, member),

    // Set operations
    sadd: (key, ...members) => command<number>('SADD', key, ...members),
    sismember: (key, member) => command<number>('SISMEMBER', key, member),
    smembers: (key) => command<string[]>('SMEMBERS', key),
    srem: (key, ...members) => command<number>('SREM', key, ...members),
    scard: (key) => command<number>('SCARD', key),

    // Key operations
    keys: (pattern) => command<string[]>('KEYS', pattern),
  };
}

/**
 * Redis key prefixes for different data types
 */
export const REDIS_KEYS = {
  // User data
  userState: (telegramId: number) => `user:${telegramId}:state`,
  userNonces: (telegramId: number) => `user:${telegramId}:nonces`,
  userReferrer: (telegramId: number) => `user:${telegramId}:referrer`,
  userReferrals: (telegramId: number) => `user:${telegramId}:referrals`,

  // Leaderboards
  leaderboardGlobal: 'leaderboard:global',
  leaderboardDaily: (date: string) => `leaderboard:daily:${date}`,
  leaderboardWeekly: (week: string) => `leaderboard:weekly:${week}`,
  leaderboardMonthly: (month: string) => `leaderboard:monthly:${month}`,
  leaderboardTeam: (team: string) => `leaderboard:team:${team}`,
  leaderboardDepartment: (dept: string) => `leaderboard:dept:${dept}`,

  // Rate limiting
  rateLimitTap: (telegramId: number) => `ratelimit:tap:${telegramId}`,
  rateLimitBurst: (telegramId: number) => `ratelimit:burst:${telegramId}`,
  rateLimitApi: (telegramId: number) => `ratelimit:api:${telegramId}`,

  // Referral codes
  referralCode: (code: string) => `referral:code:${code}`,
  referralCodeOwner: (code: string) => `referral:owner:${code}`,

  // Sessions and tracking
  sessionActive: (telegramId: number) => `session:${telegramId}`,
  deviceFingerprint: (fp: string) => `device:fp:${fp}`,
} as const;

/**
 * User game state stored in Redis
 */
export interface UserGameState {
  points: number;
  energy: number;
  maxEnergy: number;
  tapPower: number;
  level: number;
  totalTaps: number;
  streakDays: number;
  lastTapAt: string | null;
  lastPlayDate: string | null; // YYYY-MM-DD format for streak calculation
  lastEnergyRefill: string;
  team: string | null;
  department: string | null;
  referralCode: string;
  referredBy: string | null;
  referralCount: number;
  walletAddress: string | null;
  createdAt: string;
  // User info from Telegram
  firstName?: string;
  lastName?: string;
  username?: string;
  isPremium?: boolean;
}

/**
 * Default game state for new users
 */
export function createDefaultGameState(
  _telegramId: number,
  referralCode: string
): UserGameState {
  return {
    points: 0,
    energy: 1000,
    maxEnergy: 1000,
    tapPower: 1,
    level: 1,
    totalTaps: 0,
    streakDays: 0,
    lastTapAt: null,
    lastPlayDate: null,
    lastEnergyRefill: new Date().toISOString(),
    team: null,
    department: null,
    referralCode,
    referredBy: null,
    referralCount: 0,
    walletAddress: null,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Save user game state to Redis
 */
export async function saveUserState(
  redis: RedisClient,
  telegramId: number,
  state: UserGameState
): Promise<void> {
  const key = REDIS_KEYS.userState(telegramId);
  const data: Record<string, string> = {};

  for (const [field, value] of Object.entries(state)) {
    data[field] = value === null ? '' : String(value);
  }

  await redis.hmset(key, data);
}

/**
 * Load user game state from Redis
 */
export async function loadUserState(
  redis: RedisClient,
  telegramId: number
): Promise<UserGameState | null> {
  const key = REDIS_KEYS.userState(telegramId);
  const data = await redis.hgetall(key);

  if (!data || Object.keys(data).length === 0) {
    return null;
  }

  return {
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
    referredBy: data.referredBy || null,
    referralCount: parseInt(data.referralCount || '0', 10) || 0,
    walletAddress: data.walletAddress || null,
    createdAt: data.createdAt || new Date().toISOString(),
    firstName: data.firstName || undefined,
    lastName: data.lastName || undefined,
    username: data.username || undefined,
    isPremium: data.isPremium === 'true',
  };
}

/**
 * Get or create user state
 */
export async function getOrCreateUserState(
  redis: RedisClient,
  telegramId: number
): Promise<UserGameState> {
  let state = await loadUserState(redis, telegramId);

  if (!state) {
    const referralCode = generateReferralCode(telegramId);
    state = createDefaultGameState(telegramId, referralCode);
    await saveUserState(redis, telegramId, state);

    // Register referral code
    await redis.set(REDIS_KEYS.referralCode(referralCode), String(telegramId));

    // Add to global leaderboard with initial points (0)
    await redis.zadd(REDIS_KEYS.leaderboardGlobal, state.points, String(telegramId));
  } else {
    // Ensure existing users are also in leaderboard
    const existsInLeaderboard = await redis.zscore(REDIS_KEYS.leaderboardGlobal, String(telegramId));
    if (existsInLeaderboard === null) {
      await redis.zadd(REDIS_KEYS.leaderboardGlobal, state.points, String(telegramId));
    }
  }

  return state;
}

/**
 * Generate a unique referral code for a user
 */
function generateReferralCode(telegramId: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const idPart = telegramId.toString(36).toUpperCase().slice(-3);

  let code = idPart;
  while (code.length < 8) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return code.slice(0, 8);
}

/**
 * Get current date string for daily leaderboard
 */
export function getCurrentDateKey(): string {
  const dateStr = new Date().toISOString().split('T')[0];
  return dateStr ?? new Date().toISOString().slice(0, 10);
}

/**
 * Get current week string for weekly leaderboard
 */
export function getCurrentWeekKey(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  const weekStr = monday.toISOString().split('T')[0];
  return weekStr ?? monday.toISOString().slice(0, 10);
}

/**
 * Get current month string for monthly leaderboard
 */
export function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
