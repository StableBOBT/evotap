import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from root .env.local
config({ path: resolve(process.cwd(), '../../.env.local') });

import { startPolling } from '../src/index.js';
import type { Env } from '../src/types.js';

const env: Env = {
  ENVIRONMENT: 'development',
  BOT_TOKEN: process.env.BOT_TOKEN || '',
  MINI_APP_URL: process.env.MINI_APP_URL || 'http://localhost:5173',
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
};

if (!env.BOT_TOKEN) {
  console.error('❌ BOT_TOKEN is required. Add it to .env.local');
  process.exit(1);
}

console.log('📦 Environment loaded');
console.log(`   MINI_APP_URL: ${env.MINI_APP_URL}`);
console.log(`   BOT_TOKEN: ${env.BOT_TOKEN.slice(0, 10)}...`);

startPolling(env).catch((err) => {
  console.error('Failed to start bot:', err);
  process.exit(1);
});
