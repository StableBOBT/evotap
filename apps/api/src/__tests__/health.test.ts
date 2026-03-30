import { describe, it, expect } from 'vitest';
import app from '../index.js';

interface HealthResponse {
  status: string;
  environment: string;
  timestamp: string;
}

interface OpenAPIResponse {
  openapi: string;
  info: {
    title: string;
  };
}

interface ErrorResponse {
  success: boolean;
  code: string;
  error?: string;
}

const mockEnv = {
  ENVIRONMENT: 'local' as const,
  TON_NETWORK: 'testnet' as const,
  BOT_TOKEN: 'test-bot-token',
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  UPSTASH_REDIS_REST_URL: 'https://test.upstash.io',
  UPSTASH_REDIS_REST_TOKEN: 'test-redis-token',
};

describe('Health Check', () => {
  it('should return health status', async () => {
    const res = await app.request('/health', {}, mockEnv);

    expect(res.status).toBe(200);

    const data = (await res.json()) as HealthResponse;
    expect(data.status).toBe('ok');
    expect(data.environment).toBe('local');
    expect(data.timestamp).toBeDefined();
  });
});

describe('OpenAPI Docs', () => {
  it('should return OpenAPI spec', async () => {
    const res = await app.request('/openapi.json', {}, mockEnv);

    expect(res.status).toBe(200);

    const data = (await res.json()) as OpenAPIResponse;
    expect(data.openapi).toBe('3.1.0');
    expect(data.info.title).toBe('EVO Tap Game API');
  });
});

describe('404 Handler', () => {
  it('should return 404 for unknown routes', async () => {
    const res = await app.request('/unknown-route', {}, mockEnv);

    expect(res.status).toBe(404);

    const data = (await res.json()) as ErrorResponse;
    expect(data.success).toBe(false);
    expect(data.code).toBe('NOT_FOUND');
  });
});

describe('Auth Middleware', () => {
  it('should reject requests without auth header', async () => {
    const res = await app.request('/api/v1/user/me', {}, mockEnv);

    expect(res.status).toBe(401);

    const data = (await res.json()) as ErrorResponse;
    expect(data.code).toBe('AUTH_MISSING');
  });

  it('should reject requests with invalid auth format', async () => {
    const res = await app.request(
      '/api/v1/user/me',
      {
        headers: { Authorization: 'Bearer invalid' },
      },
      mockEnv
    );

    expect(res.status).toBe(401);

    const data = (await res.json()) as ErrorResponse;
    expect(data.code).toBe('AUTH_INVALID_FORMAT');
  });
});
