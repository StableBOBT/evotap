import type { MiddlewareHandler } from 'hono';
import type { Env, Variables } from '../types.js';

/**
 * Generates a simple request ID
 */
function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

/**
 * Request ID middleware - adds a unique ID to each request for tracing
 */
export const requestIdMiddleware: MiddlewareHandler<{
  Bindings: Env;
  Variables: Variables;
}> = async (c, next) => {
  const requestId = c.req.header('X-Request-ID') || generateRequestId();

  c.set('requestId', requestId);
  c.header('X-Request-ID', requestId);

  await next();
};
