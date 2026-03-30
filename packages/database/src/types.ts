/**
 * Database model types for Supabase tables
 */

/**
 * User record in database
 */
export interface UserRecord {
  id: string;
  telegram_id: number;
  first_name: string;
  last_name: string | null;
  username: string | null;
  language_code: string | null;
  is_premium: boolean;
  referral_code: string;
  referred_by: string | null;
  wallet_address: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Game state record in database
 */
export interface GameStateRecord {
  id: string;
  user_id: string;
  telegram_id: number;
  points: number;
  energy: number;
  level: number;
  total_taps: number;
  streak_days: number;
  last_tap_at: string | null;
  last_streak_date: string | null;
  last_play_date: string | null;
  team: string | null;
  department: string | null;
  tap_power: number;
  trust_score: number;
  is_banned: boolean;
  ban_reason: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Referral record in database
 */
export interface ReferralRecord {
  id: string;
  code: string;
  inviter_id: string;
  inviter_telegram_id: number;
  invitee_id: string;
  invitee_telegram_id: number;
  points_earned: number;
  created_at: string;
}

/**
 * Insert types (without auto-generated fields)
 * Note: Optional fields from GameStateRecord are made partial
 */
export type UserInsert = Omit<UserRecord, 'id' | 'created_at' | 'updated_at'>;
export type GameStateInsert = Omit<GameStateRecord, 'id' | 'created_at' | 'updated_at' | 'last_play_date' | 'team' | 'department' | 'tap_power' | 'trust_score' | 'is_banned' | 'ban_reason'> & {
  last_play_date?: string | null | undefined;
  team?: string | null | undefined;
  department?: string | null | undefined;
  tap_power?: number | undefined;
  trust_score?: number | undefined;
  is_banned?: boolean | undefined;
  ban_reason?: string | null | undefined;
};
export type ReferralInsert = Omit<ReferralRecord, 'id' | 'created_at'>;

/**
 * Update types (partial, without immutable fields)
 * Immutable fields: id, telegram_id, referral_code, created_at
 */
export type UserUpdate = Partial<Omit<UserRecord, 'id' | 'telegram_id' | 'referral_code' | 'created_at'>>;
export type GameStateUpdate = Partial<Omit<GameStateRecord, 'id' | 'user_id' | 'telegram_id' | 'created_at'>>;

/**
 * Database schema type for Supabase client
 */
export interface Database {
  public: {
    Tables: {
      users: {
        Row: UserRecord;
        Insert: UserInsert;
        Update: UserUpdate;
      };
      game_states: {
        Row: GameStateRecord;
        Insert: GameStateInsert;
        Update: GameStateUpdate;
      };
      referrals: {
        Row: ReferralRecord;
        Insert: ReferralInsert;
        Update: never;
      };
    };
  };
}
