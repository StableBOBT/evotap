/**
 * Structured logger for API
 * In production, only logs errors and important info
 */

interface Env {
  ENVIRONMENT?: string;
}

let currentEnv: Env = {};

export function initLogger(env: Env) {
  currentEnv = env;
}

const isProd = () => currentEnv.ENVIRONMENT === 'production' || currentEnv.ENVIRONMENT === 'mainnet';

export const logger = {
  log: (prefix: string, message: string, data?: unknown) => {
    if (!isProd()) {
      console.log(`[${prefix}] ${message}`, data !== undefined ? data : '');
    }
  },
  warn: (prefix: string, message: string, data?: unknown) => {
    if (!isProd()) {
      console.warn(`[${prefix}] ${message}`, data !== undefined ? data : '');
    }
  },
  error: (prefix: string, message: string, error?: unknown) => {
    // Always log errors
    console.error(`[${prefix}] ${message}`, error !== undefined ? error : '');
  },
  info: (prefix: string, message: string, data?: unknown) => {
    // Info logs are always shown (important events)
    console.log(`[${prefix}] ${message}`, data !== undefined ? data : '');
  },
};

export default logger;
