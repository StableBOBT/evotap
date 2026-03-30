import type { Context, SessionFlavor } from 'grammy';

/**
 * Environment bindings for Cloudflare Workers
 */
export interface Env {
  ENVIRONMENT: 'development' | 'staging' | 'production';
  BOT_TOKEN: string;
  MINI_APP_URL: string;
  API_URL: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

/**
 * Session data stored per user
 */
export interface SessionData {
  referralCode?: string;
}

/**
 * Extended context with session
 */
export type BotContext = Context & SessionFlavor<SessionData>;

/**
 * Deep link payload structure
 */
export interface DeepLinkPayload {
  type: 'referral' | 'invite';
  code: string;
}

/**
 * Parse deep link payload from start parameter
 * Supports formats:
 * - REF_ABC12345 (uppercase prefix)
 * - ref_ABC12345 (lowercase prefix)
 * - ABC12345 (plain 8-char code)
 */
export function parseDeepLink(startParam: string | undefined): DeepLinkPayload | null {
  if (!startParam) return null;

  // Format: REF_ABC12345 or ref_ABC12345
  const refMatch = startParam.match(/^[Rr][Ee][Ff]_(.+)$/);
  if (refMatch) {
    return {
      type: 'referral',
      code: refMatch[1],
    };
  }

  // Plain referral code (8 chars alphanumeric)
  if (/^[A-Z0-9]{8}$/i.test(startParam)) {
    return {
      type: 'referral',
      code: startParam.toUpperCase(),
    };
  }

  return null;
}
