/**
 * Static test fixtures for consistent testing
 */

export const TELEGRAM_USER_FIXTURES = {
  basic: {
    id: 123456789,
    firstName: 'Juan',
    lastName: 'Pérez',
    username: 'juanperez',
    languageCode: 'es',
    isPremium: false,
  },
  premium: {
    id: 987654321,
    firstName: 'María',
    lastName: 'García',
    username: 'mariagarcia',
    languageCode: 'es',
    isPremium: true,
  },
  minimal: {
    id: 111222333,
    firstName: 'Test',
    languageCode: 'en',
    isPremium: false,
  },
} as const;

export const GAME_STATE_FIXTURES = {
  newPlayer: {
    points: 0,
    energy: 1000,
    level: 1,
    totalTaps: 0,
    streakDays: 0,
    lastTapAt: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
  },
  activePlayer: {
    points: 50000,
    energy: 750,
    level: 5,
    totalTaps: 50000,
    streakDays: 7,
    lastTapAt: new Date('2024-01-15T12:00:00Z'),
    createdAt: new Date('2024-01-01T00:00:00Z'),
  },
  exhaustedPlayer: {
    points: 10000,
    energy: 0,
    level: 2,
    totalTaps: 10000,
    streakDays: 3,
    lastTapAt: new Date(),
    createdAt: new Date('2024-01-01T00:00:00Z'),
  },
  topPlayer: {
    points: 1000000,
    energy: 1000,
    level: 50,
    totalTaps: 1000000,
    streakDays: 30,
    lastTapAt: new Date(),
    createdAt: new Date('2024-01-01T00:00:00Z'),
  },
} as const;

export const WALLET_FIXTURES = {
  valid: {
    address: 'UQDrjaLahLkMB-hMCmkzOyBuHJ186Qg19FGW0b8vJqS-ubtV',
    network: 'mainnet' as const,
    publicKey: 'abc123def456',
  },
  testnet: {
    address: '0QDrjaLahLkMB-hMCmkzOyBuHJ186Qg19FGW0b8vJqS-ubtV',
    network: 'testnet' as const,
    publicKey: 'xyz789ghi012',
  },
} as const;

export const REFERRAL_FIXTURES = {
  basic: {
    code: 'ABC123',
    inviterId: 123456789,
    inviteeId: 987654321,
    pointsEarned: 5000,
    createdAt: new Date('2024-01-10T00:00:00Z'),
  },
} as const;

export const INIT_DATA_FIXTURES = {
  // Pre-computed hash for testing (not valid in production)
  valid: {
    raw: 'query_id=AAH1234&user=%7B%22id%22%3A123456789%2C%22first_name%22%3A%22Test%22%7D&auth_date=1704067200&hash=abc123',
    parsed: {
      queryId: 'AAH1234',
      user: { id: 123456789, firstName: 'Test' },
      authDate: 1704067200,
      hash: 'abc123',
    },
  },
  expired: {
    raw: 'query_id=AAH1234&user=%7B%22id%22%3A123456789%7D&auth_date=1000000000&hash=expired123',
    parsed: {
      queryId: 'AAH1234',
      user: { id: 123456789 },
      authDate: 1000000000, // Very old
      hash: 'expired123',
    },
  },
} as const;

export const RATE_LIMIT_FIXTURES = {
  normalUser: {
    tapsLastSecond: 5,
    tapsLast10Seconds: 30,
    isRateLimited: false,
  },
  suspiciousUser: {
    tapsLastSecond: 15,
    tapsLast10Seconds: 80,
    isRateLimited: true,
  },
} as const;

export const ENV_FIXTURES = {
  valid: {
    NODE_ENV: 'test',
    BOT_TOKEN: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
    BOT_USERNAME: 'testbot',
    DATABASE_URL: 'postgresql://localhost:5432/test',
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
    SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service',
    UPSTASH_REDIS_REST_URL: 'https://test.upstash.io',
    UPSTASH_REDIS_REST_TOKEN: 'AXXXxxxxxx',
    TON_NETWORK: 'testnet',
    MINI_APP_URL: 'https://app.example.com',
    API_URL: 'https://api.example.com',
    JWT_SECRET: 'this-is-a-very-long-secret-key-for-jwt-signing-purposes',
  },
} as const;

export type TelegramUserFixture = (typeof TELEGRAM_USER_FIXTURES)[keyof typeof TELEGRAM_USER_FIXTURES];
export type GameStateFixture = (typeof GAME_STATE_FIXTURES)[keyof typeof GAME_STATE_FIXTURES];
export type WalletFixture = (typeof WALLET_FIXTURES)[keyof typeof WALLET_FIXTURES];
