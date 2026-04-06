import { createBotAuth } from './auth.js';

/**
 * API response types
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface UserStats {
  points: number;
  level: number;
  rank: number;
  totalTaps: number;
  referralCount: number;
  referralPoints: number;
  streak?: number;
  nextLevelPoints?: number;
}

export interface ReferralStats {
  referralCode: string;
  referralLink: string;
  totalReferrals: number;
  totalPointsEarned: number;
}

export interface LeaderboardEntry {
  rank: number;
  telegramId: number;
  username: string | null;
  firstName: string;
  points: number;
  level: number;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  total: number;
  userRank: number | null;
}

export interface ClaimReferralResponse {
  claimed: boolean;
  bonusPoints: number;
  referrerName?: string;
  message?: string;
}

export interface TotalPlayersResponse {
  totalPlayers: number;
}

/**
 * API Client for bot to communicate with backend
 */
export class BotApiClient {
  private apiUrl: string;
  private botToken: string;

  constructor(apiUrl: string, botToken: string) {
    this.apiUrl = apiUrl.replace(/\/$/, ''); // Remove trailing slash
    this.botToken = botToken;
  }

  /**
   * Make authenticated request to API
   */
  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    options?: {
      body?: Record<string, unknown>;
      telegramId?: number;
      telegramUser?: {
        id: number;
        firstName: string;
        lastName?: string;
        username?: string;
        languageCode?: string;
        isPremium?: boolean;
      };
    }
  ): Promise<ApiResponse<T>> {
    const url = `${this.apiUrl}${path}`;
    const auth = await createBotAuth(this.botToken, options?.telegramId, options?.telegramUser);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': auth.authorization,
      'X-Bot-Signature': auth.signature,
      'X-Bot-Timestamp': auth.timestamp,
    };

    if (options?.telegramId) {
      headers['X-Telegram-User-Id'] = String(options.telegramId);
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: options?.body ? JSON.stringify(options.body) : undefined,
      });

      const data = await response.json() as ApiResponse<T>;
      return data;
    } catch (error) {
      console.error(`API request failed: ${method} ${path}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Request failed',
        code: 'REQUEST_FAILED',
      };
    }
  }

  /**
   * Claim referral bonus for new user
   * POST /api/v1/bot/referral/claim
   */
  async claimReferral(
    newUser: {
      id: number;
      firstName: string;
      lastName?: string;
      username?: string;
      languageCode?: string;
      isPremium?: boolean;
    },
    referralCode: string
  ): Promise<ApiResponse<ClaimReferralResponse>> {
    return this.request<ClaimReferralResponse>('POST', '/api/v1/bot/referral/claim', {
      body: {
        referralCode,
        newUser: {
          telegramId: newUser.id,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          username: newUser.username,
          languageCode: newUser.languageCode,
          isPremium: newUser.isPremium ?? false,
        },
      },
      telegramId: newUser.id,
      telegramUser: newUser,
    });
  }

  /**
   * Get user stats
   * GET /api/v1/bot/user/:telegramId/stats
   */
  async getUserStats(telegramId: number): Promise<ApiResponse<UserStats>> {
    return this.request<UserStats>('GET', `/api/v1/bot/user/${telegramId}/stats`, {
      telegramId,
    });
  }

  /**
   * Get user referral info
   * GET /api/v1/bot/user/:telegramId/referral
   */
  async getUserReferral(telegramId: number): Promise<ApiResponse<ReferralStats>> {
    return this.request<ReferralStats>('GET', `/api/v1/bot/user/${telegramId}/referral`, {
      telegramId,
    });
  }

  /**
   * Get leaderboard
   * GET /api/v1/leaderboard?limit=5&period=global
   */
  async getLeaderboard(
    limit: number = 5,
    period: 'global' | 'daily' | 'weekly' = 'global',
    telegramId?: number
  ): Promise<ApiResponse<LeaderboardResponse>> {
    const params = new URLSearchParams({
      limit: String(limit),
      period,
    });

    return this.request<LeaderboardResponse>(
      'GET',
      `/api/v1/leaderboard?${params.toString()}`,
      { telegramId }
    );
  }

  /**
   * Get total player count
   * GET /api/v1/bot/stats/players
   */
  async getTotalPlayers(): Promise<ApiResponse<TotalPlayersResponse>> {
    return this.request<TotalPlayersResponse>('GET', '/api/v1/bot/stats/players');
  }

  /**
   * Ensure user exists (create if not)
   * POST /api/v1/bot/user/ensure
   */
  async ensureUser(user: {
    id: number;
    firstName: string;
    lastName?: string;
    username?: string;
    languageCode?: string;
    isPremium?: boolean;
  }): Promise<ApiResponse<{ created: boolean; referralCode: string }>> {
    return this.request<{ created: boolean; referralCode: string }>(
      'POST',
      '/api/v1/bot/user/ensure',
      {
        body: {
          telegramId: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          languageCode: user.languageCode,
          isPremium: user.isPremium ?? false,
        },
        telegramId: user.id,
        telegramUser: user,
      }
    );
  }
}

/**
 * Create API client instance
 */
export function createApiClient(apiUrl: string, botToken: string): BotApiClient {
  return new BotApiClient(apiUrl, botToken);
}
