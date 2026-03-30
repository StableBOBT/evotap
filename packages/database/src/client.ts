import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types.js';

export type TypedSupabaseClient = SupabaseClient<Database>;

/**
 * Configuration for Supabase client
 */
export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
}

/**
 * Creates a Supabase client for public/anon access
 */
export function createSupabaseClient(config: SupabaseConfig): TypedSupabaseClient {
  return createClient<Database>(config.url, config.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Creates a Supabase client with service role (admin) access
 * Use with caution - bypasses RLS
 */
export function createSupabaseAdmin(config: SupabaseConfig): TypedSupabaseClient {
  if (!config.serviceRoleKey) {
    throw new Error('Service role key is required for admin client');
  }

  return createClient<Database>(config.url, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Creates Supabase client from environment variables
 */
export function createSupabaseFromEnv(): TypedSupabaseClient {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required');
  }

  return createSupabaseClient({ url, anonKey });
}
