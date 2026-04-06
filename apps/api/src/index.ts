import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { swaggerUI } from '@hono/swagger-ui';
import type { Env, Variables } from './types.js';
import {
  authMiddleware,
  errorHandler,
  requestIdMiddleware,
  apiRateLimit,
  botAuthMiddleware,
} from './middleware/index.js';
import {
  gameRouter,
  userRouter,
  leaderboardRouter,
  referralRouter,
  botRouter,
  anticheatRouter,
  socialRouter,
  airdropRouter,
  adminRouter,
  seasonsRouter,
} from './routes/index.js';
import { syncAllActiveUsers } from './lib/supabaseSync.js';

// Create main app
const app = new OpenAPIHono<{ Bindings: Env; Variables: Variables }>();

// Global middleware
app.use('*', requestIdMiddleware);
app.use('*', logger());

// Allowed origins whitelist
const ALLOWED_ORIGINS = [
  'https://ton-miniapp-bolivia-one.vercel.app',
  'https://ton-miniapp-bolivia.vercel.app',
  'https://evotap.app',
  'https://www.evotap.app',
];

// CORS configuration - tightened for security
app.use(
  '*',
  cors({
    origin: (origin) => {
      // Allow Telegram domains
      if (
        origin?.includes('telegram.org') ||
        origin?.includes('web.telegram.org') ||
        origin?.includes('t.me')
      ) {
        return origin;
      }
      // Allow localhost for development only
      if (origin?.includes('localhost') || origin?.includes('127.0.0.1')) {
        return origin;
      }
      // Check against whitelist
      if (origin && ALLOWED_ORIGINS.includes(origin)) {
        return origin;
      }
      // Allow Vercel preview URLs for this specific project only
      if (origin?.match(/^https:\/\/ton-miniapp-bolivia(-[a-z0-9]+)?\.vercel\.app$/)) {
        return origin;
      }
      return null;
    },
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-ID',
      'X-Telegram-Init-Data',
      'X-Bot-Signature',
    ],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    exposeHeaders: [
      'X-Request-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ],
    maxAge: 86400,
    credentials: true,
  })
);

// Error handler
app.onError(errorHandler);

// Health check (public)
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT,
    version: '1.0.0',
  });
});

// OpenAPI documentation
app.doc('/openapi.json', {
  openapi: '3.1.0',
  info: {
    title: 'EVO Tap Game API',
    version: '1.0.0',
    description: 'API for the EVO Tap-to-Earn game on Telegram Mini App',
    contact: {
      name: 'EVO Team',
      url: 'https://t.me/EVOcommunity',
    },
  },
  servers: [
    { url: 'https://api.evotap.app', description: 'Production' },
    { url: 'https://api-testnet.evotap.app', description: 'Testnet' },
    { url: 'http://localhost:8787', description: 'Local development' },
  ],
  tags: [
    {
      name: 'Game',
      description: 'Game mechanics - tapping, energy, levels, sync',
    },
    {
      name: 'User',
      description: 'User profile, stats, and wallet management',
    },
    {
      name: 'Leaderboard',
      description: 'Global, team, and department rankings',
    },
    {
      name: 'Referral',
      description: 'Referral system and bonus claims',
    },
    {
      name: 'Bot',
      description: 'Bot-specific endpoints for Telegram bot integration',
    },
    {
      name: 'Anti-Cheat',
      description: 'Device fingerprinting, trust score, and ban management',
    },
  ],
});

// Swagger UI (public)
app.get('/docs', swaggerUI({ url: '/openapi.json' }));

// API v1 routes
const v1 = new OpenAPIHono<{ Bindings: Env; Variables: Variables }>();

// Protected routes (require authentication)
const protectedRoutes = new OpenAPIHono<{ Bindings: Env; Variables: Variables }>();
protectedRoutes.use('*', authMiddleware);
protectedRoutes.use('*', apiRateLimit);

// Mount protected routers
protectedRoutes.route('/game', gameRouter);
protectedRoutes.route('/user', userRouter);
protectedRoutes.route('/referral', referralRouter);
protectedRoutes.route('/anticheat', anticheatRouter);
protectedRoutes.route('/social', socialRouter);
protectedRoutes.route('/airdrop', airdropRouter);

// Mount protected routes to v1
v1.route('/', protectedRoutes);

// Public/semi-public routes
// Leaderboard can be viewed without auth, but shows more info with auth
app.route('/api/v1/leaderboard', leaderboardRouter);

// Bot routes (authenticated with bot HMAC-SHA256 signature)
const botRoutes = new OpenAPIHono<{ Bindings: Env; Variables: Variables }>();
botRoutes.use('*', botAuthMiddleware);
botRoutes.route('/', botRouter);
app.route('/api/v1/bot', botRoutes);

// Admin routes (authenticated with admin key)
app.route('/api/v1/admin', adminRouter);

// Seasons routes (public)
app.route('/api/v1/seasons', seasonsRouter);

// Mount v1 API
app.route('/api/v1', v1);

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'EVO Tap Game API',
    version: '1.0.0',
    docs: '/docs',
    health: '/health',
    api: '/api/v1',
  });
});

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: 'Not found',
      code: 'NOT_FOUND',
      path: c.req.path,
    },
    404
  );
});

// Admin endpoint for manual sync (protected by bot signature)
app.post('/admin/sync-supabase', async (c) => {
  // Verify bot signature for admin access
  const signature = c.req.header('X-Bot-Signature');
  if (!signature) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  // Simple HMAC check with bot token
  const expectedSig = await crypto.subtle
    .digest('SHA-256', new TextEncoder().encode(c.env.BOT_TOKEN + 'admin'))
    .then((buf) =>
      Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
    );

  if (signature !== expectedSig) {
    return c.json({ success: false, error: 'Invalid signature' }, 403);
  }

  const result = await syncAllActiveUsers(c.env);

  return c.json({
    success: result.success,
    data: {
      synced: result.synced,
      failed: result.failed,
      errors: result.errors.slice(0, 10),
    },
  });
});

// Export for Cloudflare Workers
export default {
  fetch: app.fetch,

  // Scheduled handler for periodic sync (every 5 minutes)
  async scheduled(
    _event: ScheduledEvent,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<void> {
    console.log('[Scheduled] Starting Supabase sync...');

    try {
      const result = await syncAllActiveUsers(env);
      console.log(
        `[Scheduled] Sync complete: ${result.synced} synced, ${result.failed} failed`
      );
    } catch (error) {
      console.error('[Scheduled] Sync failed:', error);
    }
  },
};

// Also export type for testing
export type AppType = typeof app;
