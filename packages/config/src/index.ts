// Environment validation
export {
  parseServerEnv,
  parseClientEnv,
  isProduction,
  isTestnet,
  isLocal,
  getTonNetwork,
  baseServerSchema,
  localServerSchema,
  productionServerSchema,
  clientEnvSchema,
  type Environment,
  type ServerEnv,
  type LocalServerEnv,
  type ClientEnv,
} from './env.js';

// Game constants
export {
  GAME,
  RATE_LIMITS,
  SECURITY,
  TOKENOMICS,
  API_PATHS,
  REDIS_KEYS,
  type GameConstants,
  type RateLimitConstants,
  type SecurityConstants,
} from './constants.js';

// Feature flags
export {
  DEFAULT_FEATURES,
  DEV_FEATURES,
  getFeatureFlags,
  isFeatureEnabled,
  withFeatureOverrides,
  type FeatureFlags,
} from './features.js';
