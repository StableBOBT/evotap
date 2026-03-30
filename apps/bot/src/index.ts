import { Bot, session, webhookCallback } from 'grammy';
import type { BotContext, Env, SessionData } from './types.js';
import {
  handleStart,
  handleStats,
  handleInvite,
  handleLeaderboard,
  handleHelp,
  handleBackToMain,
} from './handlers/index.js';

/**
 * Creates and configures the bot instance
 */
function createBot(token: string): Bot<BotContext> {
  const bot = new Bot<BotContext>(token);

  // Session middleware
  bot.use(
    session({
      initial: (): SessionData => ({
        referralCode: undefined,
      }),
    })
  );

  return bot;
}

/**
 * Registers all bot handlers
 */
function registerHandlers(bot: Bot<BotContext>, env: Env): void {
  // Commands
  bot.command('start', (ctx) => handleStart(ctx, env));

  // Callback queries
  bot.callbackQuery('stats', (ctx) => handleStats(ctx, env));
  bot.callbackQuery('invite', (ctx) => handleInvite(ctx, env));
  bot.callbackQuery('help', (ctx) => handleHelp(ctx, env));
  bot.callbackQuery('back_main', (ctx) => handleBackToMain(ctx, env));

  // Leaderboard period callbacks
  bot.callbackQuery('leaderboard', (ctx) => handleLeaderboard(ctx, env, 'global'));
  bot.callbackQuery('lb_daily', (ctx) => handleLeaderboard(ctx, env, 'daily'));
  bot.callbackQuery('lb_weekly', (ctx) => handleLeaderboard(ctx, env, 'weekly'));
  bot.callbackQuery('lb_global', (ctx) => handleLeaderboard(ctx, env, 'global'));

  // Handle copy code callback (just answer the query - copying handled client-side)
  bot.callbackQuery(/^copy_/, async (ctx) => {
    await ctx.answerCallbackQuery({
      text: '📋 Code copied to clipboard!',
      show_alert: false,
    });
  });

  // Error handler
  bot.catch((err) => {
    console.error('Bot error:', err);
  });
}

/**
 * Cloudflare Workers entry point (webhook mode)
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Health check
    if (request.method === 'GET') {
      return new Response('EVO Tap Bot is running', { status: 200 });
    }

    // Only process POST requests (webhooks)
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const bot = createBot(env.BOT_TOKEN);
      registerHandlers(bot, env);

      const handleUpdate = webhookCallback(bot, 'cloudflare-mod');
      return await handleUpdate(request);
    } catch (error) {
      console.error('Webhook error:', error);
      return new Response('Internal server error', { status: 500 });
    }
  },
};

/**
 * Start bot in polling mode (for local development)
 */
export async function startPolling(env: Env): Promise<void> {
  const bot = createBot(env.BOT_TOKEN);
  registerHandlers(bot, env);

  console.log('🤖 Bot starting in polling mode...');

  // Delete any existing webhook
  await bot.api.deleteWebhook();

  // Start polling
  await bot.start({
    onStart: (botInfo) => {
      console.log(`✅ Bot @${botInfo.username} started!`);
    },
  });
}

// Export for testing and local dev
export { createBot, registerHandlers };
