import type { Context, MiddlewareHandler } from 'hono';
import { validateInitData, isOk } from './initData.js';
import type { ValidatedUser, AuthError } from './types.js';

/**
 * Context variables added by the telegram auth middleware
 */
export interface TelegramAuthVariables {
  user: ValidatedUser;
}

/**
 * Options for the telegram auth middleware
 */
export interface TelegramAuthMiddlewareOptions {
  /**
   * Maximum age of initData in seconds (default: 300 = 5 minutes)
   */
  maxAgeSeconds?: number;

  /**
   * Header name to read initData from (default: 'x-telegram-init-data')
   */
  headerName?: string;

  /**
   * Custom error response handler
   */
  onError?: (c: Context, error: AuthError) => Response;
}

/**
 * Creates Hono middleware for Telegram WebApp authentication
 *
 * Validates initData from the request header and adds the validated user
 * to the context via c.set('user', validatedUser)
 *
 * @param botToken - Telegram bot token for HMAC validation
 * @param options - Middleware configuration options
 * @returns Hono middleware handler
 *
 * @example
 * ```typescript
 * import { Hono } from 'hono';
 * import { telegramAuthMiddleware } from '@app/telegram';
 *
 * const app = new Hono<{ Variables: TelegramAuthVariables }>();
 *
 * // Apply to all routes
 * app.use('/api/*', telegramAuthMiddleware(process.env.BOT_TOKEN!));
 *
 * app.get('/api/profile', (c) => {
 *   const user = c.get('user');
 *   return c.json({ userId: user.id, username: user.username });
 * });
 * ```
 */
export function telegramAuthMiddleware(
  botToken: string,
  options: TelegramAuthMiddlewareOptions = {}
): MiddlewareHandler {
  const {
    maxAgeSeconds = 300,
    headerName = 'x-telegram-init-data',
    onError,
  } = options;

  return async (c, next) => {
    // Get initData from header
    const initData = c.req.header(headerName);

    if (!initData) {
      const error: AuthError = {
        code: 'MISSING_DATA',
        message: `Missing ${headerName} header`,
      };

      if (onError) {
        return onError(c, error);
      }

      return c.json(
        {
          success: false,
          error: error.message,
          code: error.code,
        },
        401
      );
    }

    // Validate initData
    const result = validateInitData(initData, botToken, { maxAgeSeconds });

    if (!isOk(result)) {
      const error = result.error;

      if (onError) {
        return onError(c, error);
      }

      return c.json(
        {
          success: false,
          error: error.message,
          code: error.code,
        },
        401
      );
    }

    // Set validated user in context
    c.set('user', result.value);

    await next();
  };
}

/**
 * Helper to get the validated user from context
 * Throws if user is not set (middleware not applied)
 */
export function getUser(c: Context): ValidatedUser {
  const user = c.get('user') as ValidatedUser | undefined;
  if (!user) {
    throw new Error(
      'User not found in context. Ensure telegramAuthMiddleware is applied.'
    );
  }
  return user;
}

/**
 * Helper to safely get the validated user from context
 * Returns undefined if user is not set
 */
export function getUserOrNull(c: Context): ValidatedUser | undefined {
  return c.get('user') as ValidatedUser | undefined;
}

/**
 * Creates a middleware that only validates but doesn't require user
 * Useful for routes that should work with or without authentication
 */
export function telegramAuthOptionalMiddleware(
  botToken: string,
  options: Omit<TelegramAuthMiddlewareOptions, 'onError'> = {}
): MiddlewareHandler {
  const {
    maxAgeSeconds = 300,
    headerName = 'x-telegram-init-data',
  } = options;

  return async (c, next) => {
    // Get initData from header
    const initData = c.req.header(headerName);

    if (initData) {
      // Validate initData if present
      const result = validateInitData(initData, botToken, { maxAgeSeconds });

      if (isOk(result)) {
        // Set validated user in context
        c.set('user', result.value);
      }
      // If validation fails, just continue without user
    }

    await next();
  };
}
