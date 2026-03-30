import { describe, it, expect } from 'vitest';
import {
  parseServerEnv,
  parseClientEnv,
  isProduction,
  isTestnet,
  isLocal,
  getTonNetwork,
} from './env.js';

describe('parseServerEnv', () => {
  const validLocalEnv = {
    NODE_ENV: 'development',
    ENVIRONMENT: 'local',
    BOT_TOKEN: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
    SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service',
    TON_NETWORK: 'testnet',
    MINI_APP_URL: 'http://localhost:3000',
  };

  const validProductionEnv = {
    ...validLocalEnv,
    ENVIRONMENT: 'mainnet',
    MINI_APP_URL: 'https://evotap.app',
    UPSTASH_REDIS_URL: 'https://test.upstash.io',
    UPSTASH_REDIS_TOKEN: 'AXXXxxxxxx',
  };

  it('should parse valid local environment variables', () => {
    const result = parseServerEnv(validLocalEnv);

    expect(result.NODE_ENV).toBe('development');
    expect(result.ENVIRONMENT).toBe('local');
    expect(result.BOT_TOKEN).toBe(validLocalEnv.BOT_TOKEN);
    expect(result.TON_NETWORK).toBe('testnet');
  });

  it('should parse valid production environment variables', () => {
    const result = parseServerEnv(validProductionEnv);

    expect(result.ENVIRONMENT).toBe('mainnet');
    expect(result.UPSTASH_REDIS_URL).toBe(validProductionEnv.UPSTASH_REDIS_URL);
  });

  it('should use default values when optional fields are missing', () => {
    const result = parseServerEnv(validLocalEnv);

    expect(result.NODE_ENV).toBe('development');
    expect(result.LOG_LEVEL).toBe('info');
  });

  it('should NOT require Redis for local environment', () => {
    const localEnv = { ...validLocalEnv };
    delete (localEnv as Record<string, string | undefined>).UPSTASH_REDIS_URL;

    const result = parseServerEnv(localEnv);
    expect(result.ENVIRONMENT).toBe('local');
  });

  it('should REQUIRE Redis for production environment', () => {
    const prodEnv = { ...validLocalEnv, ENVIRONMENT: 'mainnet' };

    expect(() => parseServerEnv(prodEnv)).toThrow('UPSTASH_REDIS_URL');
  });

  it('should throw error when BOT_TOKEN is missing', () => {
    const invalidEnv = { ...validLocalEnv };
    delete (invalidEnv as Record<string, string | undefined>).BOT_TOKEN;

    expect(() => parseServerEnv(invalidEnv)).toThrow('Environment validation failed');
  });

  it('should throw error when URL fields are invalid', () => {
    const invalidEnv = {
      ...validLocalEnv,
      SUPABASE_URL: 'not-a-valid-url',
    };

    expect(() => parseServerEnv(invalidEnv)).toThrow('Environment validation failed');
  });

  it('should accept valid NODE_ENV values', () => {
    const envs = ['development', 'test', 'production'] as const;

    for (const nodeEnv of envs) {
      const result = parseServerEnv({ ...validLocalEnv, NODE_ENV: nodeEnv });
      expect(result.NODE_ENV).toBe(nodeEnv);
    }
  });

  it('should reject invalid NODE_ENV values', () => {
    const invalidEnv = {
      ...validLocalEnv,
      NODE_ENV: 'invalid',
    };

    expect(() => parseServerEnv(invalidEnv)).toThrow('Environment validation failed');
  });

  it('should reject invalid BOT_TOKEN format', () => {
    const invalidEnv = {
      ...validLocalEnv,
      BOT_TOKEN: 'invalid-token-format',
    };

    expect(() => parseServerEnv(invalidEnv)).toThrow('BOT_TOKEN format invalid');
  });

  it('should accept valid BOT_TOKEN format', () => {
    const validTokenEnv = {
      ...validLocalEnv,
      BOT_TOKEN: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz_1234567',
    };

    const result = parseServerEnv(validTokenEnv);
    expect(result.BOT_TOKEN).toBe(validTokenEnv.BOT_TOKEN);
  });
});

describe('parseClientEnv', () => {
  const validClientEnv = {
    VITE_API_URL: 'https://api.example.com',
    VITE_TON_NETWORK: 'testnet',
    VITE_ENVIRONMENT: 'local',
  };

  it('should parse valid client environment variables', () => {
    const result = parseClientEnv(validClientEnv);

    expect(result.VITE_API_URL).toBe(validClientEnv.VITE_API_URL);
    expect(result.VITE_TON_NETWORK).toBe('testnet');
  });

  it('should throw error when required client fields are missing', () => {
    const invalidEnv = { ...validClientEnv };
    delete (invalidEnv as Record<string, string | undefined>).VITE_API_URL;

    expect(() => parseClientEnv(invalidEnv)).toThrow('Client environment validation failed');
  });

  it('should use default testnet when network not specified', () => {
    const envWithoutNetwork = { ...validClientEnv };
    delete (envWithoutNetwork as Record<string, string | undefined>).VITE_TON_NETWORK;

    const result = parseClientEnv(envWithoutNetwork);
    expect(result.VITE_TON_NETWORK).toBe('testnet');
  });
});

describe('environment helpers', () => {
  it('isProduction should return true for mainnet', () => {
    expect(isProduction({ ENVIRONMENT: 'mainnet' })).toBe(true);
    expect(isProduction({ ENVIRONMENT: 'testnet' })).toBe(false);
    expect(isProduction({ ENVIRONMENT: 'local' })).toBe(false);
  });

  it('isTestnet should return true for testnet', () => {
    expect(isTestnet({ ENVIRONMENT: 'testnet' })).toBe(true);
    expect(isTestnet({ ENVIRONMENT: 'mainnet' })).toBe(false);
  });

  it('isLocal should return true for local or undefined', () => {
    expect(isLocal({ ENVIRONMENT: 'local' })).toBe(true);
    expect(isLocal({})).toBe(true);
    expect(isLocal({ ENVIRONMENT: 'mainnet' })).toBe(false);
  });

  it('getTonNetwork should return mainnet for mainnet env', () => {
    expect(getTonNetwork({ ENVIRONMENT: 'mainnet' })).toBe('mainnet');
    expect(getTonNetwork({ ENVIRONMENT: 'testnet' })).toBe('testnet');
    expect(getTonNetwork({ ENVIRONMENT: 'local', TON_NETWORK: 'testnet' })).toBe('testnet');
  });
});
