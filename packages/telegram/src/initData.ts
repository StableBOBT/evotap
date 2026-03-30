import { createHmac } from 'crypto';
import type {
  ParsedInitData,
  ValidatedUser,
  InitDataError,
  AuthError,
  RawTelegramUser,
  TelegramUser,
  Result,
} from './types.js';
import {
  toTelegramUser,
  toValidatedUser,
  toAuthError,
  ok,
  fail,
  isOk,
  isFail,
} from './types.js';

/**
 * Default expiration time for initData (5 minutes)
 */
const DEFAULT_EXPIRATION_SECONDS = 300;

/**
 * Parses initData string into structured object
 * Does NOT validate signature - use validateInitData for full validation
 */
export function parseInitData(
  initData: string
): Result<ParsedInitData, InitDataError> {
  if (!initData || initData.trim().length === 0) {
    return fail({ code: 'EMPTY_DATA', message: 'initData is empty' });
  }

  try {
    const params = new URLSearchParams(initData);

    const hash = params.get('hash');
    if (!hash) {
      return fail({ code: 'MISSING_HASH', message: 'hash is required' });
    }

    const authDateStr = params.get('auth_date');
    if (!authDateStr) {
      return fail({
        code: 'MISSING_AUTH_DATE',
        message: 'auth_date is required',
      });
    }

    const authDate = parseInt(authDateStr, 10);
    if (isNaN(authDate)) {
      return fail({
        code: 'PARSE_ERROR',
        message: 'auth_date must be a number',
      });
    }

    // Parse user if present
    let user: TelegramUser | undefined;
    const userStr = params.get('user');
    if (userStr) {
      try {
        const rawUser: RawTelegramUser = JSON.parse(userStr);
        user = toTelegramUser(rawUser);
      } catch {
        return fail({
          code: 'INVALID_USER_DATA',
          message: 'Failed to parse user data',
        });
      }
    }

    // Parse receiver if present
    let receiver: TelegramUser | undefined;
    const receiverStr = params.get('receiver');
    if (receiverStr) {
      try {
        const rawReceiver: RawTelegramUser = JSON.parse(receiverStr);
        receiver = toTelegramUser(rawReceiver);
      } catch {
        // Receiver parsing failure is not critical
      }
    }

    return ok({
      queryId: params.get('query_id') ?? undefined,
      user,
      receiver,
      chat: undefined,
      chatType: params.get('chat_type') ?? undefined,
      chatInstance: params.get('chat_instance') ?? undefined,
      startParam: params.get('start_param') ?? undefined,
      canSendAfter: params.get('can_send_after')
        ? parseInt(params.get('can_send_after')!, 10)
        : undefined,
      authDate,
      hash,
    });
  } catch {
    return fail({ code: 'PARSE_ERROR', message: 'Failed to parse initData' });
  }
}

/**
 * Creates HMAC-SHA256 hash for initData validation
 * Follows Telegram's WebApp data validation algorithm:
 * 1. secret_key = HMAC_SHA256("WebAppData", bot_token)
 * 2. hash = HMAC_SHA256(secret_key, data_check_string)
 */
export function createInitDataHash(
  dataCheckString: string,
  botToken: string
): string {
  // Create secret key: HMAC-SHA256 of bot token with "WebAppData" as key
  const secretKey = createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  // Create hash of data check string
  return createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');
}

/**
 * Checks if initData has expired based on auth_date
 * @param authDate - Unix timestamp of authentication
 * @param maxAgeSeconds - Maximum age in seconds (default: 300 = 5 minutes)
 * @returns true if expired, false if still valid
 */
export function isExpired(
  authDate: number,
  maxAgeSeconds: number = DEFAULT_EXPIRATION_SECONDS
): boolean {
  const now = Math.floor(Date.now() / 1000);
  return now - authDate > maxAgeSeconds;
}

/**
 * Alias for isExpired for backward compatibility
 */
export const isInitDataExpired = isExpired;

/**
 * Validates initData signature and expiration
 * Returns Result<ValidatedUser, AuthError> pattern
 *
 * Algorithm (as per Telegram docs):
 * 1. Sort params alphabetically
 * 2. Create data_check_string with newlines
 * 3. secret_key = HMAC_SHA256("WebAppData", bot_token)
 * 4. hash = HMAC_SHA256(secret_key, data_check_string)
 * 5. Compare with provided hash
 */
export function validateInitData(
  initData: string,
  botToken: string,
  options: { maxAgeSeconds?: number } = {}
): Result<ValidatedUser, AuthError> {
  const { maxAgeSeconds = DEFAULT_EXPIRATION_SECONDS } = options;

  // Check bot token
  if (!botToken || botToken.trim().length === 0) {
    return fail(toAuthError({
      code: 'EMPTY_BOT_TOKEN',
      message: 'Bot token is required',
    }));
  }

  // Parse initData
  const parseResult = parseInitData(initData);
  if (isFail(parseResult)) {
    return fail(toAuthError(parseResult.error));
  }

  const parsed = parseResult.value;

  // Check expiration
  if (isExpired(parsed.authDate, maxAgeSeconds)) {
    return fail({
      code: 'EXPIRED',
      message: `initData has expired (older than ${maxAgeSeconds} seconds)`,
    });
  }

  // Validate signature
  const params = new URLSearchParams(initData);
  params.delete('hash');

  // Create data check string (sorted alphabetically, joined with newlines)
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const calculatedHash = createInitDataHash(dataCheckString, botToken);

  if (calculatedHash !== parsed.hash) {
    return fail({
      code: 'INVALID_HASH',
      message: 'Invalid signature - hash mismatch',
    });
  }

  // Require user data for ValidatedUser
  if (!parsed.user) {
    return fail({
      code: 'MISSING_DATA',
      message: 'User data is required but missing',
    });
  }

  // Return validated user
  return ok(toValidatedUser(parsed.user));
}

/**
 * Full validation that returns both parsed data and validated user
 * For cases where you need access to startParam, queryId, etc.
 */
export function validateInitDataFull(
  initData: string,
  botToken: string,
  options: { maxAgeSeconds?: number } = {}
): Result<ParsedInitData & { validatedUser: ValidatedUser | undefined }, AuthError> {
  const { maxAgeSeconds = DEFAULT_EXPIRATION_SECONDS } = options;

  // Check bot token
  if (!botToken || botToken.trim().length === 0) {
    return fail(toAuthError({
      code: 'EMPTY_BOT_TOKEN',
      message: 'Bot token is required',
    }));
  }

  // Parse initData
  const parseResult = parseInitData(initData);
  if (isFail(parseResult)) {
    return fail(toAuthError(parseResult.error));
  }

  const parsed = parseResult.value;

  // Check expiration
  if (isExpired(parsed.authDate, maxAgeSeconds)) {
    return fail({
      code: 'EXPIRED',
      message: `initData has expired (older than ${maxAgeSeconds} seconds)`,
    });
  }

  // Validate signature
  const params = new URLSearchParams(initData);
  params.delete('hash');

  // Create data check string (sorted alphabetically, joined with newlines)
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const calculatedHash = createInitDataHash(dataCheckString, botToken);

  if (calculatedHash !== parsed.hash) {
    return fail({
      code: 'INVALID_HASH',
      message: 'Invalid signature - hash mismatch',
    });
  }

  // Return validated data with user
  return ok({
    ...parsed,
    validatedUser: parsed.user ? toValidatedUser(parsed.user) : undefined,
  });
}

// Re-export Result helpers for convenience
export { isOk, isFail };
