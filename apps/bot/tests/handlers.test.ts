import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import {
  handleStart,
  handleStats,
  handleInvite,
  handleLeaderboard,
  handleHelp,
  handleBackToMain,
} from '../src/handlers/index.js';
import type { BotContext, Env } from '../src/types.js';

// Mock context factory
function createMockContext(overrides: Partial<BotContext> = {}): BotContext {
  return {
    from: {
      id: 123456789,
      first_name: 'TestUser',
      is_bot: false,
    },
    match: undefined,
    session: {
      referralCode: undefined,
    },
    reply: vi.fn().mockResolvedValue(undefined),
    editMessageText: vi.fn().mockResolvedValue(undefined),
    answerCallbackQuery: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as BotContext;
}

function createMockEnv(): Env {
  return {
    ENVIRONMENT: 'development',
    BOT_TOKEN: 'test-bot-token',
    MINI_APP_URL: 'https://evotap.app',
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
  };
}

describe('Bot Handlers', () => {
  let ctx: BotContext;
  let env: Env;

  beforeEach(() => {
    ctx = createMockContext();
    env = createMockEnv();
  });

  describe('handleStart', () => {
    it('should send welcome message', async () => {
      await handleStart(ctx, env);

      expect(ctx.reply).toHaveBeenCalledTimes(1);
      const [message, options] = (ctx.reply as Mock).mock.calls[0];

      expect(message).toContain('Welcome to EVO Tap');
      expect(message).toContain('TestUser');
      expect(options.parse_mode).toBe('HTML');
      expect(options.reply_markup).toBeDefined();
    });

    it('should not reply if no user', async () => {
      ctx = createMockContext({ from: undefined });

      await handleStart(ctx, env);

      expect(ctx.reply).not.toHaveBeenCalled();
    });

    it('should process referral code with ref_ prefix', async () => {
      ctx = createMockContext({ match: 'ref_ABC12345' });

      await handleStart(ctx, env);

      expect(ctx.session.referralCode).toBe('ABC12345');
      const [message] = (ctx.reply as Mock).mock.calls[0];
      expect(message).toContain('Referral code applied');
    });

    it('should process plain 8-char referral code', async () => {
      ctx = createMockContext({ match: 'XYZ98765' });

      await handleStart(ctx, env);

      expect(ctx.session.referralCode).toBe('XYZ98765');
    });

    it('should not set referral for invalid codes', async () => {
      ctx = createMockContext({ match: 'invalid' });

      await handleStart(ctx, env);

      expect(ctx.session.referralCode).toBeUndefined();
      const [message] = (ctx.reply as Mock).mock.calls[0];
      expect(message).not.toContain('Referral code applied');
    });
  });

  describe('handleStats', () => {
    it('should answer callback query', async () => {
      await handleStats(ctx, env);

      expect(ctx.answerCallbackQuery).toHaveBeenCalledTimes(1);
    });

    it('should edit message with stats', async () => {
      await handleStats(ctx, env);

      expect(ctx.editMessageText).toHaveBeenCalledTimes(1);
      const [message, options] = (ctx.editMessageText as Mock).mock.calls[0];

      expect(message).toContain('Your Stats');
      expect(message).toContain('Points');
      expect(message).toContain('Level');
      expect(message).toContain('Rank');
      expect(options.parse_mode).toBe('HTML');
    });
  });

  describe('handleInvite', () => {
    it('should answer callback query', async () => {
      await handleInvite(ctx, env);

      expect(ctx.answerCallbackQuery).toHaveBeenCalledTimes(1);
    });

    it('should edit message with referral info', async () => {
      await handleInvite(ctx, env);

      expect(ctx.editMessageText).toHaveBeenCalledTimes(1);
      const [message] = (ctx.editMessageText as Mock).mock.calls[0];

      expect(message).toContain('Invite Friends');
      expect(message).toContain('referral link');
      expect(message).toContain('5,000 points');
    });

    it('should include referral code in message', async () => {
      await handleInvite(ctx, env);

      const [message] = (ctx.editMessageText as Mock).mock.calls[0];
      // Should contain the referral code (currently hardcoded as ABC12345)
      expect(message).toContain('ABC12345');
    });
  });

  describe('handleLeaderboard', () => {
    it('should answer callback query', async () => {
      await handleLeaderboard(ctx, env, 'global');

      expect(ctx.answerCallbackQuery).toHaveBeenCalledTimes(1);
    });

    it('should show global leaderboard by default', async () => {
      await handleLeaderboard(ctx, env);

      const [message] = (ctx.editMessageText as Mock).mock.calls[0];
      expect(message).toContain('Global Leaderboard');
    });

    it('should show daily leaderboard', async () => {
      await handleLeaderboard(ctx, env, 'daily');

      const [message] = (ctx.editMessageText as Mock).mock.calls[0];
      expect(message).toContain('Daily Leaderboard');
    });

    it('should show weekly leaderboard', async () => {
      await handleLeaderboard(ctx, env, 'weekly');

      const [message] = (ctx.editMessageText as Mock).mock.calls[0];
      expect(message).toContain('Weekly Leaderboard');
    });

    it('should show medals for top 3', async () => {
      await handleLeaderboard(ctx, env, 'global');

      const [message] = (ctx.editMessageText as Mock).mock.calls[0];
      expect(message).toContain('🥇');
      expect(message).toContain('🥈');
      expect(message).toContain('🥉');
    });

    it('should show user position', async () => {
      await handleLeaderboard(ctx, env, 'global');

      const [message] = (ctx.editMessageText as Mock).mock.calls[0];
      expect(message).toContain('You:');
    });
  });

  describe('handleHelp', () => {
    it('should answer callback query', async () => {
      await handleHelp(ctx, env);

      expect(ctx.answerCallbackQuery).toHaveBeenCalledTimes(1);
    });

    it('should edit message with help info', async () => {
      await handleHelp(ctx, env);

      expect(ctx.editMessageText).toHaveBeenCalledTimes(1);
      const [message, options] = (ctx.editMessageText as Mock).mock.calls[0];

      expect(message).toContain('How to Play');
      expect(message).toContain('Gameplay');
      expect(message).toContain('Energy System');
      expect(message).toContain('Levels');
      expect(message).toContain('Referrals');
      expect(options.parse_mode).toBe('HTML');
    });
  });

  describe('handleBackToMain', () => {
    it('should answer callback query', async () => {
      await handleBackToMain(ctx, env);

      expect(ctx.answerCallbackQuery).toHaveBeenCalledTimes(1);
    });

    it('should return to main menu', async () => {
      await handleBackToMain(ctx, env);

      expect(ctx.editMessageText).toHaveBeenCalledTimes(1);
      const [message] = (ctx.editMessageText as Mock).mock.calls[0];

      expect(message).toContain('EVO Tap');
      expect(message).toContain('Ready to play');
    });
  });
});
