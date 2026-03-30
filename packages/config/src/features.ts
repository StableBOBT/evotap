/**
 * Feature Flags
 * Centralized feature toggles for gradual rollout
 */

export interface FeatureFlags {
  // Core Features
  tapToEarn: boolean;
  referralSystem: boolean;
  leaderboard: boolean;
  streaks: boolean;

  // Wallet Features
  tonConnect: boolean;
  walletRewards: boolean;

  // Social Features
  squads: boolean;
  socialTasks: boolean;

  // Security Features
  antiCheat: boolean;
  behavioralAnalysis: boolean;
  deviceFingerprinting: boolean;

  // Premium Features
  premiumMultiplier: boolean;
  premiumTasks: boolean;

  // Experimental
  miniGames: boolean;
  nftRewards: boolean;
}

/**
 * Default feature flags for production
 * Immutable - use withFeatureOverrides() to create variants
 */
export const DEFAULT_FEATURES = Object.freeze({
  // Core - Always enabled
  tapToEarn: true,
  referralSystem: true,
  leaderboard: true,
  streaks: true,

  // Wallet - Enabled
  tonConnect: true,
  walletRewards: true,

  // Social - Gradual rollout
  squads: false,
  socialTasks: true,

  // Security - Always enabled
  antiCheat: true,
  behavioralAnalysis: true,
  deviceFingerprinting: true,

  // Premium - Enabled
  premiumMultiplier: true,
  premiumTasks: true,

  // Experimental - Disabled by default
  miniGames: false,
  nftRewards: false,
} as const satisfies FeatureFlags);

/**
 * Feature flags for development/testing
 * Immutable - use withFeatureOverrides() to create variants
 */
export const DEV_FEATURES = Object.freeze({
  ...DEFAULT_FEATURES,
  // Enable experimental features in dev
  squads: true,
  miniGames: true,
  nftRewards: true,
  // Disable strict security for easier testing
  behavioralAnalysis: false,
} as const satisfies FeatureFlags);

/**
 * Get feature flags based on environment
 */
export function getFeatureFlags(env: 'development' | 'test' | 'production'): FeatureFlags {
  switch (env) {
    case 'development':
    case 'test':
      return DEV_FEATURES;
    case 'production':
      return DEFAULT_FEATURES;
    default:
      return DEFAULT_FEATURES;
  }
}

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(
  feature: keyof FeatureFlags,
  flags: FeatureFlags = DEFAULT_FEATURES
): boolean {
  return flags[feature] ?? false;
}

/**
 * Override specific features (useful for A/B testing)
 */
export function withFeatureOverrides(
  base: FeatureFlags,
  overrides: Partial<FeatureFlags>
): FeatureFlags {
  return { ...base, ...overrides };
}
