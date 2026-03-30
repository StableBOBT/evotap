// Types
export type {
  TelegramUser,
  TelegramChat,
  ParsedInitData,
  ValidatedUser,
  AuthError,
  AuthErrorCode,
  InitDataError,
  InitDataErrorCode,
  RawTelegramUser,
  Result,
  ResultOk,
  ResultFail,
} from './types.js';

export {
  toTelegramUser,
  toValidatedUser,
  toAuthError,
  ok,
  fail,
  isOk,
  isFail,
} from './types.js';

// initData validation
export {
  parseInitData,
  validateInitData,
  validateInitDataFull,
  createInitDataHash,
  isExpired,
  isInitDataExpired,
} from './initData.js';

// Middleware
export type {
  TelegramAuthVariables,
  TelegramAuthMiddlewareOptions,
} from './middleware.js';

export {
  telegramAuthMiddleware,
  telegramAuthOptionalMiddleware,
  getUser,
  getUserOrNull,
} from './middleware.js';

// Utils
export {
  generateStartLink,
  generateMiniAppLink,
  parseStartParam,
  extractReferralCode,
  generateReferralCode,
  isValidReferralCode,
  encodeStartPayload,
  decodeStartPayload,
} from './utils.js';
