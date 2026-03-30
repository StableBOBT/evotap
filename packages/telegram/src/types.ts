/**
 * Telegram WebApp User from initData (snake_case as received from Telegram)
 */
export interface RawTelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
  allows_write_to_pm?: boolean;
}

/**
 * Telegram WebApp User (camelCase for internal use)
 */
export interface TelegramUser {
  id: number;
  firstName: string;
  lastName: string | undefined;
  username: string | undefined;
  languageCode: string | undefined;
  isPremium: boolean | undefined;
  photoUrl: string | undefined;
  allowsWriteToPm: boolean | undefined;
}

/**
 * Telegram WebApp Chat from initData
 */
export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title: string | undefined;
  username: string | undefined;
  photoUrl: string | undefined;
}

/**
 * Parsed initData structure
 */
export interface ParsedInitData {
  queryId: string | undefined;
  user: TelegramUser | undefined;
  receiver: TelegramUser | undefined;
  chat: TelegramChat | undefined;
  chatType: string | undefined;
  chatInstance: string | undefined;
  startParam: string | undefined;
  canSendAfter: number | undefined;
  authDate: number;
  hash: string;
}

/**
 * Validated user data (after signature verification)
 * Contains only the essential user fields for application use
 */
export interface ValidatedUser {
  id: number;
  firstName: string;
  lastName: string | undefined;
  username: string | undefined;
  isPremium: boolean;
  languageCode: string | undefined;
  photoUrl: string | undefined;
}

/**
 * Authentication error codes
 */
export type AuthErrorCode =
  | 'INVALID_HASH'
  | 'EXPIRED'
  | 'MISSING_DATA'
  | 'PARSE_ERROR';

/**
 * Authentication error with structured information
 */
export interface AuthError {
  code: AuthErrorCode;
  message: string;
}

/**
 * Detailed validation error codes (internal use)
 */
export type InitDataErrorCode =
  | 'EMPTY_DATA'
  | 'MISSING_HASH'
  | 'MISSING_AUTH_DATE'
  | 'INVALID_SIGNATURE'
  | 'EXPIRED'
  | 'INVALID_USER_DATA'
  | 'EMPTY_BOT_TOKEN'
  | 'PARSE_ERROR';

/**
 * Detailed validation error (internal use)
 */
export interface InitDataError {
  code: InitDataErrorCode;
  message: string;
}

/**
 * Result type for validation operations
 */
export interface ResultOk<T> {
  readonly _tag: 'Ok';
  readonly value: T;
}

export interface ResultFail<E> {
  readonly _tag: 'Fail';
  readonly error: E;
}

export type Result<T, E> = ResultOk<T> | ResultFail<E>;

/**
 * Converts raw Telegram user (snake_case) to TelegramUser (camelCase)
 */
export function toTelegramUser(raw: RawTelegramUser): TelegramUser {
  return {
    id: raw.id,
    firstName: raw.first_name,
    lastName: raw.last_name,
    username: raw.username,
    languageCode: raw.language_code,
    isPremium: raw.is_premium,
    photoUrl: raw.photo_url,
    allowsWriteToPm: raw.allows_write_to_pm,
  };
}

/**
 * Converts TelegramUser to ValidatedUser
 */
export function toValidatedUser(user: TelegramUser): ValidatedUser {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    isPremium: user.isPremium ?? false,
    languageCode: user.languageCode,
    photoUrl: user.photoUrl,
  };
}

/**
 * Creates a successful Result
 */
export function ok<T>(value: T): ResultOk<T> {
  return { _tag: 'Ok' as const, value };
}

/**
 * Creates a failed Result
 */
export function fail<E>(error: E): ResultFail<E> {
  return { _tag: 'Fail' as const, error };
}

/**
 * Type guard for successful Result
 */
export function isOk<T, E>(result: Result<T, E>): result is ResultOk<T> {
  return result._tag === 'Ok';
}

/**
 * Type guard for failed Result
 */
export function isFail<T, E>(result: Result<T, E>): result is ResultFail<E> {
  return result._tag === 'Fail';
}

/**
 * Maps InitDataError to AuthError for public API
 */
export function toAuthError(error: InitDataError): AuthError {
  switch (error.code) {
    case 'INVALID_SIGNATURE':
      return { code: 'INVALID_HASH', message: error.message };
    case 'EXPIRED':
      return { code: 'EXPIRED', message: error.message };
    case 'EMPTY_DATA':
    case 'MISSING_HASH':
    case 'MISSING_AUTH_DATE':
    case 'INVALID_USER_DATA':
    case 'EMPTY_BOT_TOKEN':
      return { code: 'MISSING_DATA', message: error.message };
    case 'PARSE_ERROR':
      return { code: 'PARSE_ERROR', message: error.message };
    default:
      return { code: 'PARSE_ERROR', message: 'Unknown error' };
  }
}
