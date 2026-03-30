// Client exports
export {
  createSupabaseClient,
  createSupabaseAdmin,
  createSupabaseFromEnv,
  type TypedSupabaseClient,
  type SupabaseConfig,
} from './client.js';

// Type exports
export type {
  Database,
  UserRecord,
  GameStateRecord,
  ReferralRecord,
  UserInsert,
  GameStateInsert,
  ReferralInsert,
  UserUpdate,
  GameStateUpdate,
} from './types.js';

// Repository exports
export {
  SupabaseUserRepository,
  type UserRepository,
  type User,
  RepositoryError,
  DuplicateError,
  SupabaseGameStateRepository,
  type GameStateRepository,
  type GameState,
  SupabaseReferralRepository,
  type ReferralRepository,
  type Referral,
  DuplicateReferralError,
} from './repositories/index.js';
