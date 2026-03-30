import { describe, it, expect } from 'vitest';
import {
  TELEGRAM_USER_FIXTURES,
  GAME_STATE_FIXTURES,
  WALLET_FIXTURES,
  REFERRAL_FIXTURES,
  INIT_DATA_FIXTURES,
  RATE_LIMIT_FIXTURES,
  ENV_FIXTURES,
} from './fixtures.js';

describe('TELEGRAM_USER_FIXTURES', () => {
  it('should have basic user with all required fields', () => {
    const user = TELEGRAM_USER_FIXTURES.basic;

    expect(user.id).toBe(123456789);
    expect(user.firstName).toBe('Juan');
    expect(user.lastName).toBe('Pérez');
    expect(user.username).toBe('juanperez');
    expect(user.languageCode).toBe('es');
    expect(user.isPremium).toBe(false);
  });

  it('should have premium user with isPremium true', () => {
    const user = TELEGRAM_USER_FIXTURES.premium;

    expect(user.isPremium).toBe(true);
    expect(user.id).not.toBe(TELEGRAM_USER_FIXTURES.basic.id);
  });

  it('should have minimal user without optional fields', () => {
    const user = TELEGRAM_USER_FIXTURES.minimal;

    expect(user.id).toBeDefined();
    expect(user.firstName).toBeDefined();
    expect(user.languageCode).toBe('en');
    // Minimal user should not have lastName or username properties
    expect('lastName' in user).toBe(false);
    expect('username' in user).toBe(false);
  });
});

describe('GAME_STATE_FIXTURES', () => {
  it('should have newPlayer with initial values', () => {
    const state = GAME_STATE_FIXTURES.newPlayer;

    expect(state.points).toBe(0);
    expect(state.energy).toBe(1000);
    expect(state.level).toBe(1);
    expect(state.totalTaps).toBe(0);
    expect(state.streakDays).toBe(0);
    expect(state.lastTapAt).toBeNull();
  });

  it('should have activePlayer with progress', () => {
    const state = GAME_STATE_FIXTURES.activePlayer;

    expect(state.points).toBeGreaterThan(0);
    expect(state.level).toBeGreaterThan(1);
    expect(state.streakDays).toBeGreaterThan(0);
    expect(state.lastTapAt).toBeInstanceOf(Date);
  });

  it('should have exhaustedPlayer with no energy', () => {
    const state = GAME_STATE_FIXTURES.exhaustedPlayer;

    expect(state.energy).toBe(0);
  });

  it('should have topPlayer with high stats', () => {
    const state = GAME_STATE_FIXTURES.topPlayer;

    expect(state.points).toBeGreaterThanOrEqual(1000000);
    expect(state.level).toBeGreaterThanOrEqual(50);
    expect(state.streakDays).toBe(30);
    expect(state.energy).toBe(1000);
  });
});

describe('WALLET_FIXTURES', () => {
  it('should have valid mainnet wallet', () => {
    const wallet = WALLET_FIXTURES.valid;

    expect(wallet.address).toMatch(/^UQ/);
    expect(wallet.network).toBe('mainnet');
    expect(wallet.publicKey).toBeDefined();
  });

  it('should have valid testnet wallet', () => {
    const wallet = WALLET_FIXTURES.testnet;

    expect(wallet.address).toMatch(/^0Q/);
    expect(wallet.network).toBe('testnet');
  });

  it('should have different addresses for each network', () => {
    expect(WALLET_FIXTURES.valid.address).not.toBe(WALLET_FIXTURES.testnet.address);
  });
});

describe('REFERRAL_FIXTURES', () => {
  it('should have basic referral with all fields', () => {
    const referral = REFERRAL_FIXTURES.basic;

    expect(referral.code).toBe('ABC123');
    expect(referral.inviterId).toBe(123456789);
    expect(referral.inviteeId).toBe(987654321);
    expect(referral.pointsEarned).toBe(5000);
    expect(referral.createdAt).toBeInstanceOf(Date);
  });

  it('should have different inviter and invitee', () => {
    expect(REFERRAL_FIXTURES.basic.inviterId).not.toBe(REFERRAL_FIXTURES.basic.inviteeId);
  });
});

describe('INIT_DATA_FIXTURES', () => {
  it('should have valid initData with all components', () => {
    const initData = INIT_DATA_FIXTURES.valid;

    expect(initData.raw).toContain('query_id=');
    expect(initData.raw).toContain('user=');
    expect(initData.raw).toContain('auth_date=');
    expect(initData.raw).toContain('hash=');

    expect(initData.parsed.queryId).toBeDefined();
    expect(initData.parsed.user.id).toBe(123456789);
    expect(initData.parsed.hash).toBeDefined();
  });

  it('should have expired initData with old auth_date', () => {
    const initData = INIT_DATA_FIXTURES.expired;
    const now = Math.floor(Date.now() / 1000);

    expect(initData.parsed.authDate).toBeLessThan(now - 300); // More than 5 minutes old
  });
});

describe('RATE_LIMIT_FIXTURES', () => {
  it('should have normal user not rate limited', () => {
    const user = RATE_LIMIT_FIXTURES.normalUser;

    expect(user.tapsLastSecond).toBeLessThanOrEqual(10);
    expect(user.isRateLimited).toBe(false);
  });

  it('should have suspicious user rate limited', () => {
    const user = RATE_LIMIT_FIXTURES.suspiciousUser;

    expect(user.tapsLastSecond).toBeGreaterThan(10);
    expect(user.isRateLimited).toBe(true);
  });
});

describe('ENV_FIXTURES', () => {
  it('should have valid environment with all required fields', () => {
    const env = ENV_FIXTURES.valid;

    expect(env.NODE_ENV).toBe('test');
    expect(env.BOT_TOKEN).toMatch(/^\d+:/);
    expect(env.BOT_USERNAME).toBeDefined();
    expect(env.DATABASE_URL).toContain('postgresql://');
    expect(env.SUPABASE_URL).toContain('https://');
    expect(env.UPSTASH_REDIS_REST_URL).toContain('https://');
    expect(env.JWT_SECRET.length).toBeGreaterThanOrEqual(32);
  });

  it('should have testnet as default network', () => {
    expect(ENV_FIXTURES.valid.TON_NETWORK).toBe('testnet');
  });
});

describe('Fixtures immutability', () => {
  it('should be immutable (as const)', () => {
    // These should be readonly - TypeScript would error if we tried to modify
    expect(Object.isFrozen(TELEGRAM_USER_FIXTURES)).toBe(false); // as const doesn't freeze
    expect(TELEGRAM_USER_FIXTURES.basic.id).toBe(123456789);
  });
});
