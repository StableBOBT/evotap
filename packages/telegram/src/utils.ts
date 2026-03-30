/**
 * Generates a Telegram bot deep link with start parameter
 *
 * @param botUsername - Bot username without @ (e.g., 'MyBot')
 * @param payload - Payload to encode in start parameter (e.g., referral code)
 * @returns Deep link URL (e.g., 'https://t.me/MyBot?start=ref_ABC123')
 *
 * @example
 * ```typescript
 * // Generate referral link
 * const link = generateStartLink('EVOtapBot', 'ref_ABC123');
 * // => 'https://t.me/EVOtapBot?start=ref_ABC123'
 *
 * // Generate link with custom action
 * const link = generateStartLink('EVOtapBot', 'join_squad_123');
 * // => 'https://t.me/EVOtapBot?start=join_squad_123'
 * ```
 */
export function generateStartLink(botUsername: string, payload: string): string {
  // Remove @ if present
  const username = botUsername.startsWith('@')
    ? botUsername.slice(1)
    : botUsername;

  // Encode payload for URL safety (Telegram allows base64url chars)
  const encodedPayload = encodeURIComponent(payload);

  return `https://t.me/${username}?start=${encodedPayload}`;
}

/**
 * Generates a Telegram Mini App deep link
 *
 * @param botUsername - Bot username without @
 * @param appName - Mini app short name (as configured in BotFather)
 * @param payload - Optional start parameter payload
 * @returns Mini App deep link URL
 *
 * @example
 * ```typescript
 * const link = generateMiniAppLink('EVOtapBot', 'game', 'ref_ABC123');
 * // => 'https://t.me/EVOtapBot/game?startapp=ref_ABC123'
 * ```
 */
export function generateMiniAppLink(
  botUsername: string,
  appName: string,
  payload?: string
): string {
  const username = botUsername.startsWith('@')
    ? botUsername.slice(1)
    : botUsername;

  const baseUrl = `https://t.me/${username}/${appName}`;

  if (payload) {
    const encodedPayload = encodeURIComponent(payload);
    return `${baseUrl}?startapp=${encodedPayload}`;
  }

  return baseUrl;
}

/**
 * Parses start parameter to extract referral code
 *
 * Supports multiple formats:
 * - 'ref_CODE' -> returns 'CODE'
 * - 'CODE' (if alphanumeric 6-12 chars) -> returns 'CODE' (uppercase)
 * - 'r_CODE' -> returns 'CODE'
 * - 'invite_CODE' -> returns 'CODE'
 *
 * @param startParam - The start_param from initData
 * @returns Extracted referral code or null if not a referral
 *
 * @example
 * ```typescript
 * parseStartParam('ref_ABC123')     // => 'ABC123'
 * parseStartParam('ABC123')         // => 'ABC123'
 * parseStartParam('r_xyz789')       // => 'xyz789'
 * parseStartParam('join_squad_1')   // => null (not a referral format)
 * ```
 */
export function parseStartParam(startParam: string | undefined): string | null {
  if (!startParam || startParam.trim().length === 0) {
    return null;
  }

  const param = startParam.trim();

  // Check for common referral prefixes
  const referralPrefixes = ['ref_', 'r_', 'invite_', 'i_'];

  for (const prefix of referralPrefixes) {
    if (param.startsWith(prefix)) {
      const code = param.slice(prefix.length);
      if (code.length > 0) {
        return code;
      }
    }
  }

  // Check if it's a standalone alphanumeric code (6-12 chars)
  if (/^[A-Za-z0-9]{6,12}$/.test(param)) {
    return param.toUpperCase();
  }

  return null;
}

/**
 * Alias for parseStartParam for backward compatibility
 */
export const extractReferralCode = parseStartParam;

/**
 * Generates a unique referral code
 *
 * @param length - Length of the code (default: 8)
 * @param prefix - Optional prefix (e.g., 'ref_')
 * @returns Generated referral code
 *
 * @example
 * ```typescript
 * generateReferralCode()         // => 'A1B2C3D4'
 * generateReferralCode(6)        // => 'X7Y8Z9'
 * generateReferralCode(8, 'ref_') // => 'ref_A1B2C3D4'
 * ```
 */
export function generateReferralCode(
  length: number = 8,
  prefix: string = ''
): string {
  // Characters for code generation (avoiding confusing chars like 0/O, 1/I/l)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';

  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return prefix + code;
}

/**
 * Validates if a string is a valid referral code format
 *
 * @param code - Code to validate
 * @returns true if valid format
 */
export function isValidReferralCode(code: string | undefined): boolean {
  if (!code) return false;
  return /^[A-Za-z0-9]{6,12}$/.test(code);
}

/**
 * Encodes a payload for use in Telegram start parameters
 * Uses base64url encoding for safety
 *
 * @param data - Object to encode
 * @returns Base64url encoded string
 */
export function encodeStartPayload(data: Record<string, unknown>): string {
  const json = JSON.stringify(data);
  // Base64url encoding (safe for URLs)
  return Buffer.from(json)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Decodes a Telegram start parameter payload
 *
 * @param payload - Base64url encoded string
 * @returns Decoded object or null if invalid
 */
export function decodeStartPayload<T = Record<string, unknown>>(
  payload: string
): T | null {
  try {
    // Restore base64 padding
    let base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padding = (4 - (base64.length % 4)) % 4;
    base64 += '='.repeat(padding);

    const json = Buffer.from(base64, 'base64').toString('utf-8');
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
