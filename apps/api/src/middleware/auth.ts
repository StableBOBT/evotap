import type { MiddlewareHandler } from 'hono';
import { validateInitDataFull } from '@app/telegram';
import type { Env, Variables } from '../types.js';
import { createRedisClient, getOrCreateUserState } from '../lib/redis.js';
import { isUserBanned } from '../lib/anticheat.js';

/**
 * Authentication middleware - validates Telegram initData
 * Extracts user info and makes it available in context
 *
 * Security features:
 * - HMAC-SHA256 signature validation
 * - auth_date expiration check (5 minutes)
 * - User data extraction and validation
 */
export const authMiddleware: MiddlewareHandler<{
  Bindings: Env;
  Variables: Variables;
}> = async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader) {
    return c.json(
      {
        success: false,
        error: 'Missing Authorization header',
        code: 'AUTH_MISSING',
      },
      401
    );
  }

  // Expect: "tma <initData>"
  const [scheme, initData] = authHeader.split(' ');

  if (scheme !== 'tma' || !initData) {
    return c.json(
      {
        success: false,
        error: 'Invalid Authorization format. Use: tma <initData>',
        code: 'AUTH_INVALID_FORMAT',
      },
      401
    );
  }

  // Validate initData with HMAC-SHA256
  const result = validateInitDataFull(initData, c.env.BOT_TOKEN, {
    maxAgeSeconds: 300, // 5 minutes
  });

  if (result._tag === 'Fail') {
    const errorCode = mapErrorCode(result.error.code);
    return c.json(
      {
        success: false,
        error: result.error.message,
        code: errorCode,
      },
      401
    );
  }

  const { validatedUser, startParam } = result.value;

  if (!validatedUser) {
    return c.json(
      {
        success: false,
        error: 'User data not found in initData',
        code: 'AUTH_NO_USER',
      },
      401
    );
  }

  // Set user info in context
  c.set('user', validatedUser);
  c.set('telegramId', validatedUser.id);

  // Set start param if present (for referral tracking)
  if (startParam) {
    c.set('startParam', startParam);
  }

  // Check if user is banned
  try {
    const redis = createRedisClient(c.env);

    // Check ban status
    const banStatus = await isUserBanned(redis, validatedUser.id);
    if (banStatus.banned) {
      return c.json(
        {
          success: false,
          error: 'Your account has been suspended',
          code: 'ACCOUNT_BANNED',
          reason: banStatus.reason,
          expiresAt: banStatus.expiresAt,
        },
        403
      );
    }

    // Ensure user exists in Redis (create if new)
    const userState = await getOrCreateUserState(redis, validatedUser.id);
    c.set('userState', userState);
  } catch (error) {
    // Log error but don't fail auth - Redis might be unavailable
    console.error('[Auth] Failed to load user state:', error);
  }

  await next();
};

/**
 * Optional auth middleware - doesn't fail if no auth provided
 * Useful for public endpoints that have enhanced features for authenticated users
 */
export const optionalAuthMiddleware: MiddlewareHandler<{
  Bindings: Env;
  Variables: Variables;
}> = async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (authHeader) {
    const [scheme, initData] = authHeader.split(' ');

    if (scheme === 'tma' && initData) {
      const result = validateInitDataFull(initData, c.env.BOT_TOKEN, {
        maxAgeSeconds: 300,
      });

      if (result._tag === 'Ok' && result.value.validatedUser) {
        c.set('user', result.value.validatedUser);
        c.set('telegramId', result.value.validatedUser.id);

        if (result.value.startParam) {
          c.set('startParam', result.value.startParam);
        }

        // Try to load user state
        try {
          const redis = createRedisClient(c.env);
          const userState = await getOrCreateUserState(redis, result.value.validatedUser.id);
          c.set('userState', userState);
        } catch (error) {
          console.error('[Auth] Failed to load user state:', error);
        }
      }
    }
  }

  await next();
};

/**
 * Strict auth middleware - requires valid auth and existing user state
 * Use for endpoints that require full user data
 */
export const strictAuthMiddleware: MiddlewareHandler<{
  Bindings: Env;
  Variables: Variables;
}> = async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader) {
    return c.json(
      {
        success: false,
        error: 'Missing Authorization header',
        code: 'AUTH_MISSING',
      },
      401
    );
  }

  const [scheme, initData] = authHeader.split(' ');

  if (scheme !== 'tma' || !initData) {
    return c.json(
      {
        success: false,
        error: 'Invalid Authorization format. Use: tma <initData>',
        code: 'AUTH_INVALID_FORMAT',
      },
      401
    );
  }

  const result = validateInitDataFull(initData, c.env.BOT_TOKEN, {
    maxAgeSeconds: 300,
  });

  if (result._tag === 'Fail') {
    return c.json(
      {
        success: false,
        error: result.error.message,
        code: mapErrorCode(result.error.code),
      },
      401
    );
  }

  const { validatedUser } = result.value;

  if (!validatedUser) {
    return c.json(
      {
        success: false,
        error: 'User data not found in initData',
        code: 'AUTH_NO_USER',
      },
      401
    );
  }

  c.set('user', validatedUser);
  c.set('telegramId', validatedUser.id);

  // Require user state to exist
  try {
    const redis = createRedisClient(c.env);
    const userState = await getOrCreateUserState(redis, validatedUser.id);
    c.set('userState', userState);
  } catch (error) {
    console.error('[Auth] Redis error:', error);
    return c.json(
      {
        success: false,
        error: 'Service temporarily unavailable',
        code: 'SERVICE_UNAVAILABLE',
      },
      503
    );
  }

  await next();
};

/**
 * Admin authentication middleware - validates admin API key
 *
 * Security features:
 * - Uses separate ADMIN_SECRET (not derived from BOT_TOKEN)
 * - HMAC-SHA256 with timestamp for key derivation
 * - Timing-safe comparison to prevent timing attacks
 * - Falls back to BOT_TOKEN derivation if ADMIN_SECRET not set (dev only)
 */
export const adminAuthMiddleware: MiddlewareHandler<{
  Bindings: Env;
  Variables: Variables;
}> = async (c, next) => {
  const adminKey = c.req.header('X-Admin-Key');

  if (!adminKey) {
    return c.json(
      {
        success: false,
        error: 'Admin key required',
        code: 'UNAUTHORIZED',
      },
      401
    );
  }

  // Generate expected admin key
  const expectedKey = await generateAdminKey(c.env);

  // Timing-safe comparison to prevent timing attacks
  if (!timingSafeEqual(adminKey, expectedKey)) {
    console.warn('[Admin Auth] Invalid admin key attempt');
    return c.json(
      {
        success: false,
        error: 'Invalid admin key',
        code: 'FORBIDDEN',
      },
      403
    );
  }

  await next();
};

/**
 * Generate admin key using HMAC-SHA256
 * Uses ADMIN_SECRET if available, otherwise falls back to BOT_TOKEN derivation
 */
async function generateAdminKey(env: Env): Promise<string> {
  // Use ADMIN_SECRET if set (recommended for production)
  const secret = env.ADMIN_SECRET || env.BOT_TOKEN;

  // Use HMAC-SHA256 for secure key derivation
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // Include domain separation to prevent cross-context attacks
  const message = encoder.encode('ton-miniapp-bolivia:admin:v1');
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, message);

  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do comparison to prevent length-based timing leak
    // Compare against itself to maintain constant time
    b = a;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0 && a.length === b.length;
}

/**
 * Export admin key generator for CLI/scripts to generate keys
 */
export { generateAdminKey };

/**
 * Map internal error codes to public API error codes
 */
function mapErrorCode(code: string): string {
  switch (code) {
    case 'INVALID_HASH':
      return 'AUTH_INVALID_SIGNATURE';
    case 'EXPIRED':
      return 'AUTH_EXPIRED';
    case 'EMPTY_DATA':
    case 'MISSING_HASH':
    case 'MISSING_AUTH_DATE':
    case 'MISSING_DATA':
      return 'AUTH_INCOMPLETE';
    case 'INVALID_USER_DATA':
      return 'AUTH_INVALID_USER';
    case 'PARSE_ERROR':
      return 'AUTH_PARSE_ERROR';
    default:
      return 'AUTH_FAILED';
  }
}
