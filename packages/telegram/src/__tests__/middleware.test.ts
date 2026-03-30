import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import {
  telegramAuthMiddleware,
  telegramAuthOptionalMiddleware,
  getUser,
  getUserOrNull,
  type TelegramAuthVariables,
} from '../middleware.js';
import { createInitDataHash } from '../initData.js';

describe('Telegram Auth Middleware', () => {
  const BOT_TOKEN = '123456789:ABCdefGHIjklMNOpqrsTUVwxyz';

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function createValidInitData(userId: number = 123, firstName: string = 'Test'): string {
    const now = Math.floor(Date.now() / 1000);
    const params = new URLSearchParams();
    params.set('auth_date', String(now - 60));
    params.set('query_id', 'test_query');
    params.set('user', JSON.stringify({ id: userId, first_name: firstName, is_premium: true }));

    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    const hash = createInitDataHash(dataCheckString, BOT_TOKEN);
    params.set('hash', hash);

    return params.toString();
  }

  describe('telegramAuthMiddleware', () => {
    it('should authenticate valid initData and set user in context', async () => {
      vi.setSystemTime(new Date(1700000000 * 1000));

      const app = new Hono<{ Variables: TelegramAuthVariables }>();
      app.use('/api/*', telegramAuthMiddleware(BOT_TOKEN));
      app.get('/api/profile', (c) => {
        const user = c.get('user');
        return c.json({ id: user.id, firstName: user.firstName });
      });

      const initData = createValidInitData(456, 'Juan');
      const res = await app.request('/api/profile', {
        headers: { 'x-telegram-init-data': initData },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBe(456);
      expect(body.firstName).toBe('Juan');
    });

    it('should return 401 when initData header is missing', async () => {
      const app = new Hono();
      app.use('/api/*', telegramAuthMiddleware(BOT_TOKEN));
      app.get('/api/profile', (c) => c.json({ ok: true }));

      const res = await app.request('/api/profile');

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.code).toBe('MISSING_DATA');
    });

    it('should return 401 for invalid signature', async () => {
      vi.setSystemTime(new Date(1700000000 * 1000));

      const app = new Hono();
      app.use('/api/*', telegramAuthMiddleware(BOT_TOKEN));
      app.get('/api/profile', (c) => c.json({ ok: true }));

      // Create initData with valid structure but invalid hash
      const params = new URLSearchParams();
      params.set('auth_date', String(1700000000 - 60));
      params.set('user', JSON.stringify({ id: 123, first_name: 'Test' }));
      params.set('hash', 'invalid_hash_value');

      const res = await app.request('/api/profile', {
        headers: { 'x-telegram-init-data': params.toString() },
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.code).toBe('INVALID_HASH');
    });

    it('should return 401 for expired initData', async () => {
      vi.setSystemTime(new Date(1700000000 * 1000));

      const app = new Hono();
      app.use('/api/*', telegramAuthMiddleware(BOT_TOKEN));
      app.get('/api/profile', (c) => c.json({ ok: true }));

      // Create initData with old timestamp
      const params = new URLSearchParams();
      params.set('auth_date', String(1700000000 - 600)); // 10 minutes ago
      params.set('user', JSON.stringify({ id: 123, first_name: 'Test' }));

      const dataCheckString = [...params.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join('\n');

      const hash = createInitDataHash(dataCheckString, BOT_TOKEN);
      params.set('hash', hash);

      const res = await app.request('/api/profile', {
        headers: { 'x-telegram-init-data': params.toString() },
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.code).toBe('EXPIRED');
    });

    it('should use custom header name', async () => {
      vi.setSystemTime(new Date(1700000000 * 1000));

      const app = new Hono<{ Variables: TelegramAuthVariables }>();
      app.use('/api/*', telegramAuthMiddleware(BOT_TOKEN, { headerName: 'authorization' }));
      app.get('/api/profile', (c) => c.json({ id: c.get('user').id }));

      const initData = createValidInitData();
      const res = await app.request('/api/profile', {
        headers: { authorization: initData },
      });

      expect(res.status).toBe(200);
    });

    it('should support custom error handler', async () => {
      const app = new Hono();
      app.use(
        '/api/*',
        telegramAuthMiddleware(BOT_TOKEN, {
          onError: (c, error) => {
            return c.json({ customError: true, reason: error.code }, 403);
          },
        })
      );
      app.get('/api/profile', (c) => c.json({ ok: true }));

      const res = await app.request('/api/profile');

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.customError).toBe(true);
      expect(body.reason).toBe('MISSING_DATA');
    });

    it('should support custom maxAgeSeconds', async () => {
      vi.setSystemTime(new Date(1700000000 * 1000));

      const app = new Hono<{ Variables: TelegramAuthVariables }>();
      // Allow 10 minute old data
      app.use('/api/*', telegramAuthMiddleware(BOT_TOKEN, { maxAgeSeconds: 600 }));
      app.get('/api/profile', (c) => c.json({ id: c.get('user').id }));

      // Create initData 8 minutes ago (would fail with default 5min)
      const params = new URLSearchParams();
      params.set('auth_date', String(1700000000 - 480));
      params.set('user', JSON.stringify({ id: 123, first_name: 'Test' }));

      const dataCheckString = [...params.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join('\n');

      const hash = createInitDataHash(dataCheckString, BOT_TOKEN);
      params.set('hash', hash);

      const res = await app.request('/api/profile', {
        headers: { 'x-telegram-init-data': params.toString() },
      });

      expect(res.status).toBe(200);
    });
  });

  describe('telegramAuthOptionalMiddleware', () => {
    it('should set user when valid initData is provided', async () => {
      vi.setSystemTime(new Date(1700000000 * 1000));

      const app = new Hono<{ Variables: TelegramAuthVariables }>();
      app.use('/api/*', telegramAuthOptionalMiddleware(BOT_TOKEN));
      app.get('/api/profile', (c) => {
        const user = getUserOrNull(c);
        return c.json({ hasUser: !!user, id: user?.id });
      });

      const initData = createValidInitData(789);
      const res = await app.request('/api/profile', {
        headers: { 'x-telegram-init-data': initData },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.hasUser).toBe(true);
      expect(body.id).toBe(789);
    });

    it('should continue without user when no initData provided', async () => {
      const app = new Hono<{ Variables: TelegramAuthVariables }>();
      app.use('/api/*', telegramAuthOptionalMiddleware(BOT_TOKEN));
      app.get('/api/profile', (c) => {
        const user = getUserOrNull(c);
        return c.json({ hasUser: !!user });
      });

      const res = await app.request('/api/profile');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.hasUser).toBe(false);
    });

    it('should continue without user when invalid initData provided', async () => {
      const app = new Hono<{ Variables: TelegramAuthVariables }>();
      app.use('/api/*', telegramAuthOptionalMiddleware(BOT_TOKEN));
      app.get('/api/profile', (c) => {
        const user = getUserOrNull(c);
        return c.json({ hasUser: !!user });
      });

      const res = await app.request('/api/profile', {
        headers: { 'x-telegram-init-data': 'invalid' },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.hasUser).toBe(false);
    });
  });

  describe('getUser helper', () => {
    it('should return user from context', async () => {
      vi.setSystemTime(new Date(1700000000 * 1000));

      const app = new Hono<{ Variables: TelegramAuthVariables }>();
      app.use('/api/*', telegramAuthMiddleware(BOT_TOKEN));
      app.get('/api/profile', (c) => {
        const user = getUser(c);
        return c.json({ id: user.id });
      });

      const initData = createValidInitData();
      const res = await app.request('/api/profile', {
        headers: { 'x-telegram-init-data': initData },
      });

      expect(res.status).toBe(200);
    });

    it('should throw when user not in context', async () => {
      const app = new Hono();
      app.get('/api/profile', (c) => {
        try {
          getUser(c);
          return c.json({ ok: true });
        } catch (e) {
          return c.json({ error: (e as Error).message }, 500);
        }
      });

      const res = await app.request('/api/profile');

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toContain('User not found');
    });
  });
});
