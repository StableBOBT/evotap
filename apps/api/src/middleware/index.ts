export {
  authMiddleware,
  optionalAuthMiddleware,
  strictAuthMiddleware,
} from './auth.js';

export {
  createRateLimitMiddleware,
  tapRateLimitMiddleware,
  tapRateLimit,
  burstRateLimit,
  apiRateLimit,
  walletRateLimit,
  referralRateLimit,
  claimRateLimit,
  ipRateLimitMiddleware,
  RATE_LIMIT_CONFIGS,
} from './rateLimit.js';

export { errorHandler, AppError, ErrorCodes } from './errorHandler.js';
export { requestIdMiddleware } from './requestId.js';
