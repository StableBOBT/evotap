const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://evotap-api.andeanlabs-58f.workers.dev';

// =============================================================================
// TYPES
// =============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface GameState {
  points: number;
  energy: number;
  maxEnergy: number;
  level: number;
  totalTaps: number;
  lastTapAt: string | null;
  lastPlayDate: string | null;
  team: string | null;
  department: string | null;
  tapPower: number;
  streakDays: number;
}

export interface TapResponse {
  score: number;
  energy: number;
  maxEnergy?: number;
  level: number;
  leveledUp: boolean;
  streakDays?: number;
  isNewDay?: boolean;
}

export interface SyncRequest {
  points: number;
  energy: number;
  totalTaps: number;
  level: number;
  department?: string | null;
  team?: string | null;
  currentStreak?: number;
  lastPlayDate?: string | null;
}

export interface SyncResponse {
  points: number;
  energy: number;
  maxEnergy: number;
  level: number;
  totalTaps: number;
  streakDays: number;
  lastPlayDate: string | null;
  synced: boolean;
}

export interface User {
  id: string;
  telegramId: number;
  username: string | null;
  firstName: string;
  lastName: string | null;
  isPremium: boolean;
  referralCode: string;
  referredBy: string | null;
  walletAddress: string | null;
  createdAt: string;
}

// Anonymous leaderboard entry - no personal data, only rank and points
export interface LeaderboardEntry {
  rank: number;
  points: number;
  isCurrentUser?: boolean;
  team?: string | null;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  userRank: number | null;
  userScore?: number | null;
  total: number;
}

export interface TeamLeaderboardResponse {
  entries: LeaderboardEntry[];
  teamStats: {
    totalPoints: number;
    totalPlayers: number;
    averageLevel: number;
  };
  userRank: number | null;
}

export interface ReferralClaimResponse {
  success: boolean;
  pointsEarned: number;
  referrerCode: string;
}

export interface ReferralStats {
  totalReferrals: number;
  totalEarned: number;
  referralCode: string;
}

// =============================================================================
// RETRY CONFIGURATION
// =============================================================================

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
};

// Errors that should trigger a retry
const RETRYABLE_ERROR_CODES = ['NETWORK_ERROR', 'TIMEOUT', 'SERVICE_UNAVAILABLE'];

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculateBackoff(attempt: number, config: RetryConfig): number {
  const delay = config.baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * delay;
  return Math.min(delay + jitter, config.maxDelay);
}

function shouldRetry(error: ApiResponse<unknown>, attempt: number, config: RetryConfig): boolean {
  if (attempt >= config.maxRetries) return false;
  if (!error.code) return false;
  return RETRYABLE_ERROR_CODES.includes(error.code);
}

// =============================================================================
// API CLIENT
// =============================================================================

async function request<T>(
  endpoint: string,
  initData: string,
  options: RequestInit = {},
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `tma ${initData}`,
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        const error: ApiResponse<T> = {
          success: false,
          error: data.error || `HTTP ${response.status}`,
          code: data.code || `HTTP_${response.status}`,
        };

        if (shouldRetry(error, attempt, retryConfig)) {
          const delay = calculateBackoff(attempt, retryConfig);
          console.warn(`[API] Retry ${attempt + 1}/${retryConfig.maxRetries} after ${delay}ms`);
          await sleep(delay);
          continue;
        }

        return error;
      }

      return data;
    } catch (error) {
      const isTimeout = error instanceof DOMException && error.name === 'AbortError';
      const errorResponse: ApiResponse<T> = {
        success: false,
        error: isTimeout ? 'Request timeout' : (error instanceof Error ? error.message : 'Network error'),
        code: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
      };

      if (shouldRetry(errorResponse, attempt, retryConfig)) {
        const delay = calculateBackoff(attempt, retryConfig);
        console.warn(`[API] Retry ${attempt + 1}/${retryConfig.maxRetries} after ${delay}ms`);
        await sleep(delay);
        continue;
      }

      console.error('[API] Request failed:', error);
      return errorResponse;
    }
  }

  // Should never reach here, but TypeScript needs it
  return {
    success: false,
    error: 'Max retries exceeded',
    code: 'MAX_RETRIES',
  };
}

// =============================================================================
// API METHODS
// =============================================================================

export const api = {
  // Game endpoints
  getGameState: (initData: string): Promise<ApiResponse<GameState>> =>
    request<GameState>('/api/v1/game/state', initData),

  tap: (initData: string, taps: number): Promise<ApiResponse<TapResponse>> =>
    request<TapResponse>('/api/v1/game/tap', initData, {
      method: 'POST',
      body: JSON.stringify({ taps, nonce: crypto.randomUUID() }),
    }),

  sync: (initData: string, state: SyncRequest): Promise<ApiResponse<SyncResponse>> =>
    request<SyncResponse>('/api/v1/game/sync', initData, {
      method: 'POST',
      body: JSON.stringify({
        ...state,
        nonce: crypto.randomUUID(),
        timestamp: Date.now(),
      }),
    }),

  // User endpoints
  getUser: (initData: string): Promise<ApiResponse<User>> =>
    request<User>('/api/v1/user', initData),

  updateWallet: (
    initData: string,
    walletAddress: string
  ): Promise<ApiResponse<User>> =>
    request<User>('/api/v1/user/wallet', initData, {
      method: 'PUT',
      body: JSON.stringify({ walletAddress }),
    }),

  // Leaderboard endpoints
  getLeaderboard: (
    initData: string,
    period: 'daily' | 'weekly' | 'global' = 'global',
    limit = 100
  ): Promise<ApiResponse<LeaderboardResponse>> =>
    request<LeaderboardResponse>(
      `/api/v1/leaderboard?period=${period}&limit=${limit}`,
      initData
    ),

  getTeamLeaderboard: (
    initData: string,
    team: 'colla' | 'camba',
    limit = 100
  ): Promise<ApiResponse<TeamLeaderboardResponse>> =>
    request<TeamLeaderboardResponse>(
      `/api/v1/leaderboard/team/${team}?limit=${limit}`,
      initData
    ),

  // Referral endpoints
  getReferralStats: (initData: string): Promise<ApiResponse<ReferralStats>> =>
    request<ReferralStats>('/api/v1/referral/stats', initData),

  claimReferral: (
    initData: string,
    referrerCode: string
  ): Promise<ApiResponse<ReferralClaimResponse>> =>
    request<ReferralClaimResponse>('/api/v1/referral/claim', initData, {
      method: 'POST',
      body: JSON.stringify({ referrerCode }),
    }),

  // Anti-cheat endpoints
  registerDevice: (
    initData: string,
    fingerprint: {
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
      canvasHash: string;
    }
  ): Promise<ApiResponse<{ isNewDevice: boolean; accountsOnDevice: number; isSuspicious: boolean }>> =>
    request('/api/v1/anticheat/register-device', initData, {
      method: 'POST',
      body: JSON.stringify(fingerprint),
    }),

  // Trust score
  getTrustScore: (initData: string): Promise<ApiResponse<{
    score: number;
    isEligibleForAirdrop: boolean;
    airdropMultiplier: number;
  }>> =>
    request('/api/v1/anticheat/trust-score', initData),

  // Social task endpoints
  getSocialTasksStatus: (initData: string): Promise<ApiResponse<Record<string, { claimed: boolean; reward: number }>>> =>
    request('/api/v1/social/status', initData),

  verifySocialTask: (
    initData: string,
    taskId: 'telegram-channel' | 'telegram-group' | 'twitter-follow' | 'share-referral'
  ): Promise<ApiResponse<{
    verified: boolean;
    reward: number;
    message: string;
    newPoints: number;
  }>> =>
    request('/api/v1/social/verify', initData, {
      method: 'POST',
      body: JSON.stringify({ taskId }),
    }),

  checkSocialTask: (
    initData: string,
    taskId: string
  ): Promise<ApiResponse<{ canVerify: boolean; message: string }>> =>
    request(`/api/v1/social/check/${taskId}`, initData),

  // Airdrop endpoints
  getAirdropStatus: (initData: string): Promise<ApiResponse<{
    isActive: boolean;
    root?: string;
    hasClaimed?: boolean;
    allocation?: { amount: string; trustScore: number } | null;
    message?: string;
  }>> =>
    request('/api/v1/airdrop/status', initData),

  getAirdropEligibility: (initData: string): Promise<ApiResponse<{
    isEligible: boolean;
    reasons: string[];
    stats: {
      points: number;
      trustScore: number;
      hasWallet: boolean;
      walletAddress: string | null;
      isPremium: boolean;
      streakDays: number;
    };
  }>> =>
    request('/api/v1/airdrop/eligibility', initData),

  getAirdropProof: (
    initData: string,
    walletAddress: string
  ): Promise<ApiResponse<{
    proof: string[];
    leaf: string;
    amount: string;
    root: string;
    index: number;
  }>> =>
    request(`/api/v1/airdrop/proof?walletAddress=${encodeURIComponent(walletAddress)}`, initData),

  markAirdropClaimed: (initData: string): Promise<ApiResponse<{ claimed: boolean }>> =>
    request('/api/v1/airdrop/mark-claimed', initData, { method: 'POST' }),
};

// =============================================================================
// ONLINE STATUS CHECK
// =============================================================================

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

export function onOnlineStatusChange(callback: (online: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
