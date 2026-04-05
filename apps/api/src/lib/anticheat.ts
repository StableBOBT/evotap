/**
 * Anti-Cheat System for EVO Tap
 * Detects bots, emulators, and suspicious behavior
 * Based on Hamster Kombat learnings (banned 2.3M users)
 */

import type { Context } from 'hono';
import { createRedisClient } from './redis.js';

// =============================================================================
// TYPES
// =============================================================================

export interface TapEvent {
  timestamp: number;
  taps: number;
}

export interface BehaviorAnalysis {
  score: number; // 0-100 (100 = definitely human)
  flags: string[];
  isSuspicious: boolean;
  shouldBan: boolean;
}

export interface DeviceFingerprint {
  userAgent: string;
  screenWidth: number;
  screenHeight: number;
  colorDepth: number;
  pixelRatio: number;
  timezone: string;
  language: string;
  platform: string;
  touchSupport: boolean;
  maxTouchPoints: number;
  canvasHash?: string;
}

export interface UserTrustScore {
  score: number; // 0-100
  factors: {
    accountAge: number;      // 0-20 points
    telegramPremium: number; // 0-10 points
    behaviorScore: number;   // 0-30 points
    uniqueDevice: number;    // 0-20 points
    referralQuality: number; // 0-10 points
    walletConnected: number; // 0-10 points
  };
  isEligibleForAirdrop: boolean;
  airdropMultiplier: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const REDIS_KEYS = {
  tapHistory: (id: number) => `anticheat:taps:${id}`,
  fingerprint: (id: number) => `anticheat:fp:${id}`,
  trustScore: (id: number) => `anticheat:trust:${id}`,
  warnings: (id: number) => `anticheat:warnings:${id}`,
  banned: (id: number) => `anticheat:banned:${id}`,
  deviceUsers: (fpHash: string) => `anticheat:device:${fpHash}`,
};

// Thresholds
const TAP_HISTORY_SIZE = 100;
const MIN_VARIANCE_THRESHOLD = 15; // ms - bots have very low variance
const MAX_TAPS_PER_SECOND = 12;
const BURST_WINDOW_MS = 10000;
const MAX_BURST_TAPS = 60;
const EMULATOR_INDICATORS = [
  'bluestacks', 'nox', 'memu', 'ldplayer', 'genymotion',
  'android sdk', 'google_sdk', 'emulator', 'goldfish',
];
const MAX_ACCOUNTS_PER_DEVICE = 3;
const WARNING_THRESHOLD = 3;
const BAN_THRESHOLD = 5;

// =============================================================================
// BEHAVIORAL ANALYSIS
// =============================================================================

/**
 * Analyze tap patterns to detect bot behavior
 */
export function analyzeTapBehavior(tapHistory: TapEvent[]): BehaviorAnalysis {
  const flags: string[] = [];
  let score = 100;

  if (tapHistory.length < 10) {
    return { score: 50, flags: ['insufficient_data'], isSuspicious: false, shouldBan: false };
  }

  // Calculate intervals between taps
  const intervals: number[] = [];
  for (let i = 1; i < tapHistory.length; i++) {
    intervals.push(tapHistory[i].timestamp - tapHistory[i - 1].timestamp);
  }

  // 1. Check variance (bots have very consistent timing)
  const variance = calculateVariance(intervals);
  if (variance < MIN_VARIANCE_THRESHOLD) {
    flags.push('low_variance');
    score -= 30;
  }

  // 2. Check for impossibly fast taps
  const minInterval = Math.min(...intervals);
  if (minInterval < 50) { // Less than 50ms between taps
    flags.push('superhuman_speed');
    score -= 25;
  }

  // 3. Check for burst patterns (many taps in short time)
  const recentTaps = tapHistory.filter(t => Date.now() - t.timestamp < BURST_WINDOW_MS);
  const totalRecentTaps = recentTaps.reduce((sum, t) => sum + t.taps, 0);
  if (totalRecentTaps > MAX_BURST_TAPS) {
    flags.push('burst_detected');
    score -= 20;
  }

  // 4. Check for unnatural patterns (exact same intervals)
  const uniqueIntervals = new Set(intervals.map(i => Math.round(i / 10) * 10));
  if (uniqueIntervals.size < intervals.length * 0.3) {
    flags.push('repetitive_pattern');
    score -= 15;
  }

  // 5. Check for human-like pauses (humans take breaks)
  const hasPauses = intervals.some(i => i > 2000);
  if (!hasPauses && tapHistory.length > 50) {
    flags.push('no_pauses');
    score -= 10;
  }

  // Ensure score is within bounds
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    flags,
    isSuspicious: score < 50,
    shouldBan: score < 20,
  };
}

/**
 * Calculate variance of an array of numbers
 */
function calculateVariance(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
  const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length);
}

// =============================================================================
// DEVICE FINGERPRINTING
// =============================================================================

/**
 * Check if user agent indicates an emulator
 */
export function isEmulator(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return EMULATOR_INDICATORS.some(indicator => ua.includes(indicator));
}

/**
 * Generate a hash from device fingerprint
 */
export function hashFingerprint(fp: DeviceFingerprint): string {
  const data = [
    fp.screenWidth,
    fp.screenHeight,
    fp.colorDepth,
    fp.pixelRatio,
    fp.timezone,
    fp.language,
    fp.platform,
    fp.maxTouchPoints,
    fp.canvasHash || '',
  ].join('|');

  // Simple hash for fingerprint
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

// =============================================================================
// TRUST SCORE SYSTEM
// =============================================================================

interface TrustScoreInput {
  telegramId: number;
  accountCreatedAt: Date;
  isPremium: boolean;
  behaviorScore: number;
  deviceHash: string;
  referralCount: number;
  referredByTrusted: boolean;
  walletConnected: boolean;
  totalSessions: number;
  totalDaysPlayed: number;
}

/**
 * Calculate trust score for airdrop eligibility
 */
export async function calculateTrustScore(
  redis: ReturnType<typeof createRedisClient>,
  input: TrustScoreInput
): Promise<UserTrustScore> {
  const factors = {
    accountAge: 0,
    telegramPremium: 0,
    behaviorScore: 0,
    uniqueDevice: 0,
    referralQuality: 0,
    walletConnected: 0,
  };

  // 1. Account age (max 20 points)
  const accountAgeMs = Date.now() - input.accountCreatedAt.getTime();
  const accountAgeDays = accountAgeMs / (1000 * 60 * 60 * 24);
  if (accountAgeDays >= 30) factors.accountAge = 20;
  else if (accountAgeDays >= 14) factors.accountAge = 15;
  else if (accountAgeDays >= 7) factors.accountAge = 10;
  else if (accountAgeDays >= 3) factors.accountAge = 5;

  // 2. Telegram Premium (max 10 points)
  if (input.isPremium) factors.telegramPremium = 10;

  // 3. Behavior score (max 30 points)
  factors.behaviorScore = Math.round(input.behaviorScore * 0.3);

  // 4. Unique device (max 20 points)
  const deviceUsers = await redis.smembers(REDIS_KEYS.deviceUsers(input.deviceHash));
  if (deviceUsers.length === 1) factors.uniqueDevice = 20;
  else if (deviceUsers.length === 2) factors.uniqueDevice = 10;
  else if (deviceUsers.length <= MAX_ACCOUNTS_PER_DEVICE) factors.uniqueDevice = 5;
  // More than 3 accounts = 0 points

  // 5. Referral quality (max 10 points)
  if (input.referredByTrusted) factors.referralQuality += 3;
  if (input.referralCount >= 5) factors.referralQuality += 4;
  else if (input.referralCount >= 2) factors.referralQuality += 2;
  if (input.totalDaysPlayed >= 7) factors.referralQuality += 3;

  // 6. Wallet connected (max 10 points)
  if (input.walletConnected) factors.walletConnected = 10;

  // Calculate total
  const score = Object.values(factors).reduce((a, b) => a + b, 0);

  // Determine airdrop eligibility and multiplier
  let isEligibleForAirdrop = false;
  let airdropMultiplier = 0;

  if (score >= 70) {
    isEligibleForAirdrop = true;
    airdropMultiplier = 1.25; // 125% bonus
  } else if (score >= 50) {
    isEligibleForAirdrop = true;
    airdropMultiplier = 1.0;
  } else if (score >= 30) {
    isEligibleForAirdrop = true;
    airdropMultiplier = 0.5; // 50% reduction
  }
  // Below 30 = not eligible

  return {
    score,
    factors,
    isEligibleForAirdrop,
    airdropMultiplier,
  };
}

// =============================================================================
// BAN SYSTEM
// =============================================================================

/**
 * Add a warning to a user
 */
export async function addWarning(
  redis: ReturnType<typeof createRedisClient>,
  telegramId: number,
  reason: string
): Promise<{ warnings: number; banned: boolean }> {
  const key = REDIS_KEYS.warnings(telegramId);

  // Add warning with timestamp
  await redis.rpush(key, JSON.stringify({ reason, timestamp: Date.now() }));

  // Get total warnings
  const warnings = await redis.llen(key);

  // Check if should be banned
  if (warnings >= BAN_THRESHOLD) {
    await banUser(redis, telegramId, 'Exceeded warning threshold');
    return { warnings, banned: true };
  }

  return { warnings, banned: false };
}

/**
 * Ban a user permanently
 */
export async function banUser(
  redis: ReturnType<typeof createRedisClient>,
  telegramId: number,
  reason: string
): Promise<void> {
  const key = REDIS_KEYS.banned(telegramId);
  await redis.set(key, JSON.stringify({
    reason,
    bannedAt: Date.now(),
    permanent: true,
  }));
}

/**
 * Temporarily ban a user
 */
export async function tempBanUser(
  redis: ReturnType<typeof createRedisClient>,
  telegramId: number,
  reason: string,
  durationSeconds: number
): Promise<void> {
  const key = REDIS_KEYS.banned(telegramId);
  await redis.set(key, JSON.stringify({
    reason,
    bannedAt: Date.now(),
    permanent: false,
    expiresAt: Date.now() + (durationSeconds * 1000),
  }), { ex: durationSeconds });
}

/**
 * Check if user is banned
 */
export async function isUserBanned(
  redis: ReturnType<typeof createRedisClient>,
  telegramId: number
): Promise<{ banned: boolean; reason?: string; expiresAt?: number }> {
  const key = REDIS_KEYS.banned(telegramId);
  const data = await redis.get(key);

  if (!data) {
    return { banned: false };
  }

  try {
    const banInfo = JSON.parse(data as string);

    // Safety check: if temp ban has expiresAt and it's in the past, clean up
    // (Redis TTL should handle this, but this is defense-in-depth)
    if (banInfo.expiresAt && Date.now() > banInfo.expiresAt) {
      await redis.del(key);
      return { banned: false };
    }

    return {
      banned: true,
      reason: banInfo.reason,
      expiresAt: banInfo.expiresAt,
    };
  } catch {
    console.error('[Anticheat] Failed to parse ban info');
    return { banned: false };
  }
}

/**
 * Unban a user
 */
export async function unbanUser(
  redis: ReturnType<typeof createRedisClient>,
  telegramId: number
): Promise<void> {
  await redis.del(REDIS_KEYS.banned(telegramId));
}

// =============================================================================
// TAP HISTORY TRACKING
// =============================================================================

/**
 * Record a tap event for behavior analysis
 */
export async function recordTapEvent(
  redis: ReturnType<typeof createRedisClient>,
  telegramId: number,
  taps: number
): Promise<void> {
  const key = REDIS_KEYS.tapHistory(telegramId);
  const event: TapEvent = { timestamp: Date.now(), taps };

  await redis.rpush(key, JSON.stringify(event));
  await redis.ltrim(key, -TAP_HISTORY_SIZE, -1); // Keep only last N events
  await redis.expire(key, 86400); // Expire after 24 hours
}

/**
 * Get tap history for analysis
 */
export async function getTapHistory(
  redis: ReturnType<typeof createRedisClient>,
  telegramId: number
): Promise<TapEvent[]> {
  const key = REDIS_KEYS.tapHistory(telegramId);
  const data = await redis.lrange(key, 0, -1);
  return data.map(d => {
    try {
      return JSON.parse(d as string);
    } catch {
      return { timestamp: 0, taps: 0 };
    }
  }).filter(e => e.timestamp > 0);
}

// =============================================================================
// DEVICE TRACKING
// =============================================================================

/**
 * Register a device fingerprint for a user
 */
export async function registerDevice(
  redis: ReturnType<typeof createRedisClient>,
  telegramId: number,
  fingerprint: DeviceFingerprint
): Promise<{ isNewDevice: boolean; accountsOnDevice: number; isSuspicious: boolean }> {
  const fpHash = hashFingerprint(fingerprint);
  const deviceKey = REDIS_KEYS.deviceUsers(fpHash);
  const fpKey = REDIS_KEYS.fingerprint(telegramId);

  // Store fingerprint for user
  await redis.set(fpKey, JSON.stringify({ ...fingerprint, hash: fpHash }));

  // Add user to device's user set
  const wasNew = await redis.sadd(deviceKey, String(telegramId));
  const accountsOnDevice = await redis.scard(deviceKey);

  // Expire device tracking after 30 days
  await redis.expire(deviceKey, 30 * 24 * 60 * 60);

  return {
    isNewDevice: wasNew === 1,
    accountsOnDevice,
    isSuspicious: accountsOnDevice > MAX_ACCOUNTS_PER_DEVICE,
  };
}

// =============================================================================
// MIDDLEWARE FOR ANTI-CHEAT
// =============================================================================

/**
 * Check if user's device has too many accounts (Sybil detection)
 */
async function checkDeviceSybil(
  redis: ReturnType<typeof createRedisClient>,
  telegramId: number
): Promise<{ suspicious: boolean; accountCount: number; reason?: string }> {
  const fpKey = REDIS_KEYS.fingerprint(telegramId);
  const fpData = await redis.get(fpKey);

  if (!fpData) {
    // No device registered - allow but track
    return { suspicious: false, accountCount: 0 };
  }

  try {
    const fp = JSON.parse(fpData as string);
    const deviceHash = fp.hash;

    if (!deviceHash) {
      return { suspicious: false, accountCount: 0 };
    }

    // Check how many accounts use this device
    const deviceKey = REDIS_KEYS.deviceUsers(deviceHash);
    const accountCount = await redis.scard(deviceKey);

    if (accountCount > MAX_ACCOUNTS_PER_DEVICE) {
      return {
        suspicious: true,
        accountCount,
        reason: `Device shared by ${accountCount} accounts (max ${MAX_ACCOUNTS_PER_DEVICE})`,
      };
    }

    return { suspicious: false, accountCount };
  } catch (error) {
    console.error('[Anticheat] Error checking device Sybil:', error);
    return { suspicious: false, accountCount: 0 };
  }
}

/**
 * Anti-cheat middleware for tap endpoint
 */
export async function antiCheatCheck(
  redis: ReturnType<typeof createRedisClient>,
  telegramId: number,
  taps: number,
  userAgent: string
): Promise<{ allowed: boolean; reason?: string; warning?: boolean }> {
  // 1. Check if banned
  const banStatus = await isUserBanned(redis, telegramId);
  if (banStatus.banned) {
    return { allowed: false, reason: `Banned: ${banStatus.reason}` };
  }

  // 2. Check for emulator
  if (isEmulator(userAgent)) {
    await addWarning(redis, telegramId, 'Emulator detected');
    return { allowed: false, reason: 'Emulators are not allowed' };
  }

  // 3. Check for Sybil attack (multiple accounts on same device)
  const sybilCheck = await checkDeviceSybil(redis, telegramId);
  if (sybilCheck.suspicious) {
    const { warnings, banned } = await addWarning(
      redis,
      telegramId,
      sybilCheck.reason || 'Multiple accounts detected'
    );
    if (banned) {
      return { allowed: false, reason: 'Too many accounts on this device' };
    }
    // Allow with warning for now, but flag
    console.warn('[Anticheat] Sybil warning:', {
      telegramId,
      accountCount: sybilCheck.accountCount,
    });
  }

  // 4. Record tap and analyze behavior
  await recordTapEvent(redis, telegramId, taps);
  const history = await getTapHistory(redis, telegramId);
  const analysis = analyzeTapBehavior(history);

  // 5. Take action based on analysis
  if (analysis.shouldBan) {
    await banUser(redis, telegramId, `Bot behavior detected: ${analysis.flags.join(', ')}`);
    return { allowed: false, reason: 'Suspicious activity detected' };
  }

  if (analysis.isSuspicious) {
    const { warnings, banned } = await addWarning(
      redis,
      telegramId,
      `Suspicious behavior: ${analysis.flags.join(', ')}`
    );
    if (banned) {
      return { allowed: false, reason: 'Too many warnings' };
    }
    return { allowed: true, warning: true };
  }

  return { allowed: true };
}
