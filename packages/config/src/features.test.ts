import { describe, it, expect } from 'vitest';
import {
  DEFAULT_FEATURES,
  DEV_FEATURES,
  getFeatureFlags,
  isFeatureEnabled,
  withFeatureOverrides,
} from './features.js';

describe('DEFAULT_FEATURES', () => {
  it('should have core features enabled', () => {
    expect(DEFAULT_FEATURES.tapToEarn).toBe(true);
    expect(DEFAULT_FEATURES.referralSystem).toBe(true);
    expect(DEFAULT_FEATURES.leaderboard).toBe(true);
  });

  it('should have security features enabled', () => {
    expect(DEFAULT_FEATURES.antiCheat).toBe(true);
    expect(DEFAULT_FEATURES.behavioralAnalysis).toBe(true);
    expect(DEFAULT_FEATURES.deviceFingerprinting).toBe(true);
  });

  it('should have experimental features disabled', () => {
    expect(DEFAULT_FEATURES.miniGames).toBe(false);
    expect(DEFAULT_FEATURES.nftRewards).toBe(false);
  });
});

describe('DEV_FEATURES', () => {
  it('should have experimental features enabled', () => {
    expect(DEV_FEATURES.miniGames).toBe(true);
    expect(DEV_FEATURES.nftRewards).toBe(true);
    expect(DEV_FEATURES.squads).toBe(true);
  });

  it('should have relaxed security for testing', () => {
    expect(DEV_FEATURES.behavioralAnalysis).toBe(false);
  });
});

describe('getFeatureFlags', () => {
  it('should return dev features for development', () => {
    const flags = getFeatureFlags('development');
    expect(flags.miniGames).toBe(true);
  });

  it('should return dev features for test', () => {
    const flags = getFeatureFlags('test');
    expect(flags.miniGames).toBe(true);
  });

  it('should return production features for production', () => {
    const flags = getFeatureFlags('production');
    expect(flags.miniGames).toBe(false);
  });
});

describe('isFeatureEnabled', () => {
  it('should check if feature is enabled', () => {
    expect(isFeatureEnabled('tapToEarn')).toBe(true);
    expect(isFeatureEnabled('miniGames')).toBe(false);
  });

  it('should use provided flags', () => {
    expect(isFeatureEnabled('miniGames', DEV_FEATURES)).toBe(true);
    expect(isFeatureEnabled('miniGames', DEFAULT_FEATURES)).toBe(false);
  });
});

describe('withFeatureOverrides', () => {
  it('should override specific features', () => {
    const customFlags = withFeatureOverrides(DEFAULT_FEATURES, {
      miniGames: true,
      nftRewards: true,
    });

    expect(customFlags.miniGames).toBe(true);
    expect(customFlags.nftRewards).toBe(true);
    expect(customFlags.tapToEarn).toBe(true); // Unchanged
  });

  it('should not modify original flags', () => {
    withFeatureOverrides(DEFAULT_FEATURES, { miniGames: true });

    expect(DEFAULT_FEATURES.miniGames).toBe(false);
  });
});
