import { z } from 'zod';

/**
 * Environment type
 */
export type Environment = 'local' | 'testnet' | 'mainnet';

/**
 * Base server environment schema (required for all environments)
 */
const baseServerSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  ENVIRONMENT: z.enum(['local', 'testnet', 'mainnet']).default('local'),

  // Telegram Bot (always required)
  BOT_TOKEN: z
    .string()
    .min(1, 'BOT_TOKEN is required')
    .regex(/^\d+:[A-Za-z0-9_-]+$/, 'BOT_TOKEN format invalid'),

  // Supabase (always required)
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // App URLs
  MINI_APP_URL: z.string().url('MINI_APP_URL must be a valid URL'),
  API_URL: z.string().url().optional(),

  // TON
  TON_NETWORK: z.enum(['mainnet', 'testnet']).default('testnet'),
  TON_CENTER_API_KEY: z.string().optional(),

  // Jetton contracts (optional, filled after deployment)
  JETTON_MASTER_ADDRESS: z.string().optional(),
  JETTON_WALLET_ADDRESS: z.string().optional(),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

/**
 * Production-only requirements
 */
const productionExtensions = z.object({
  // Redis required in production
  UPSTASH_REDIS_URL: z.string().url('UPSTASH_REDIS_URL required in production'),
  UPSTASH_REDIS_TOKEN: z.string().min(1, 'UPSTASH_REDIS_TOKEN required in production'),

  // Monitoring
  SENTRY_DSN: z.string().url().optional(),
});

/**
 * Local development schema (relaxed)
 */
const localServerSchema = baseServerSchema.extend({
  UPSTASH_REDIS_URL: z.string().url().optional(),
  UPSTASH_REDIS_TOKEN: z.string().optional(),
});

/**
 * Production schema (strict)
 */
const productionServerSchema = baseServerSchema.merge(productionExtensions);

/**
 * Client-side environment variables schema
 */
const clientEnvSchema = z.object({
  VITE_API_URL: z.string().url('VITE_API_URL must be a valid URL'),
  VITE_TON_NETWORK: z.enum(['mainnet', 'testnet']).default('testnet'),
  VITE_TONCONNECT_MANIFEST_URL: z.string().url().optional(),
  VITE_ENVIRONMENT: z.enum(['local', 'testnet', 'mainnet']).default('local'),
});

export type ServerEnv = z.infer<typeof productionServerSchema>;
export type LocalServerEnv = z.infer<typeof localServerSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

/**
 * Parse environment based on ENVIRONMENT variable
 */
export function parseServerEnv(env: Record<string, string | undefined>): ServerEnv | LocalServerEnv {
  const environment = env.ENVIRONMENT || 'local';

  const schema = environment === 'local' ? localServerSchema : productionServerSchema;
  const result = schema.safeParse(env);

  if (!result.success) {
    const formatted = result.error.format();
    const errors = Object.entries(formatted)
      .filter(([key]) => key !== '_errors')
      .map(([key, value]) => {
        const messages = (value as { _errors?: string[] })._errors || [];
        return `  - ${key}: ${messages.join(', ')}`;
      })
      .join('\n');

    throw new Error(`Environment validation failed:\n${errors}`);
  }

  return result.data;
}

/**
 * Parse client environment variables
 */
export function parseClientEnv(env: Record<string, string | undefined>): ClientEnv {
  const result = clientEnvSchema.safeParse(env);

  if (!result.success) {
    const formatted = result.error.format();
    const errors = Object.entries(formatted)
      .filter(([key]) => key !== '_errors')
      .map(([key, value]) => {
        const messages = (value as { _errors?: string[] })._errors || [];
        return `  - ${key}: ${messages.join(', ')}`;
      })
      .join('\n');

    throw new Error(`Client environment validation failed:\n${errors}`);
  }

  return result.data;
}

/**
 * Check if running in production environment
 */
export function isProduction(env: { ENVIRONMENT?: string }): boolean {
  return env.ENVIRONMENT === 'mainnet';
}

/**
 * Check if running in testnet
 */
export function isTestnet(env: { ENVIRONMENT?: string }): boolean {
  return env.ENVIRONMENT === 'testnet';
}

/**
 * Check if running locally
 */
export function isLocal(env: { ENVIRONMENT?: string }): boolean {
  return !env.ENVIRONMENT || env.ENVIRONMENT === 'local';
}

/**
 * Get TON network based on environment
 */
export function getTonNetwork(env: { ENVIRONMENT?: string; TON_NETWORK?: string }): 'mainnet' | 'testnet' {
  if (env.ENVIRONMENT === 'mainnet') return 'mainnet';
  return (env.TON_NETWORK as 'mainnet' | 'testnet') || 'testnet';
}

export { baseServerSchema, localServerSchema, productionServerSchema, clientEnvSchema };
