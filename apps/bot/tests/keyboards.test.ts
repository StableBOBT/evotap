import { describe, it, expect } from 'vitest';
import {
  createMainKeyboard,
  createStatsKeyboard,
  createInviteKeyboard,
  createLeaderboardKeyboard,
  createHelpKeyboard,
} from '../src/keyboards/index.js';

describe('Keyboards', () => {
  const miniAppUrl = 'https://evotap.app';

  describe('createMainKeyboard', () => {
    it('should create keyboard with Play Now button', () => {
      const keyboard = createMainKeyboard(miniAppUrl);
      const inlineKeyboard = keyboard.inline_keyboard;

      expect(inlineKeyboard).toBeDefined();
      expect(inlineKeyboard.length).toBeGreaterThan(0);

      // First row should have webApp button
      const firstRow = inlineKeyboard[0];
      expect(firstRow[0]).toHaveProperty('web_app');
      expect(firstRow[0].text).toBe('🎮 Play Now');
    });

    it('should have invite and leaderboard buttons', () => {
      const keyboard = createMainKeyboard(miniAppUrl);
      const buttons = keyboard.inline_keyboard.flat();
      const buttonTexts = buttons.map((b) => b.text);

      expect(buttonTexts).toContain('👥 Invite Friends');
      expect(buttonTexts).toContain('🏆 Leaderboard');
    });

    it('should have stats and help buttons', () => {
      const keyboard = createMainKeyboard(miniAppUrl);
      const buttons = keyboard.inline_keyboard.flat();
      const buttonTexts = buttons.map((b) => b.text);

      expect(buttonTexts).toContain('💰 My Stats');
      expect(buttonTexts).toContain('❓ Help');
    });
  });

  describe('createStatsKeyboard', () => {
    it('should create keyboard with Play Now button', () => {
      const keyboard = createStatsKeyboard(miniAppUrl);
      const firstRow = keyboard.inline_keyboard[0];

      expect(firstRow[0]).toHaveProperty('web_app');
      expect(firstRow[0].text).toBe('🎮 Play Now');
    });

    it('should have refresh and back buttons', () => {
      const keyboard = createStatsKeyboard(miniAppUrl);
      const buttons = keyboard.inline_keyboard.flat();
      const buttonTexts = buttons.map((b) => b.text);

      expect(buttonTexts).toContain('🔄 Refresh');
      expect(buttonTexts).toContain('◀️ Back');
    });

    it('should have correct callback data', () => {
      const keyboard = createStatsKeyboard(miniAppUrl);
      const buttons = keyboard.inline_keyboard.flat();
      const callbackButtons = buttons.filter((b) => 'callback_data' in b);

      const callbackData = callbackButtons.map(
        (b) => (b as { callback_data: string }).callback_data
      );
      expect(callbackData).toContain('stats');
      expect(callbackData).toContain('back_main');
    });
  });

  describe('createInviteKeyboard', () => {
    const referralCode = 'ABC12345';

    it('should create share URL button', () => {
      const keyboard = createInviteKeyboard(miniAppUrl, referralCode);
      const firstRow = keyboard.inline_keyboard[0];

      expect(firstRow[0]).toHaveProperty('url');
      expect(firstRow[0].text).toBe('📤 Share Link');
    });

    it('should include referral code in share URL', () => {
      const keyboard = createInviteKeyboard(miniAppUrl, referralCode);
      const shareButton = keyboard.inline_keyboard[0][0] as { url: string };

      expect(shareButton.url).toContain(referralCode);
      expect(shareButton.url).toContain('t.me/share');
    });

    it('should have copy code button with code', () => {
      const keyboard = createInviteKeyboard(miniAppUrl, referralCode);
      const buttons = keyboard.inline_keyboard.flat();
      const copyButton = buttons.find((b) => b.text.includes('Copy Code'));

      expect(copyButton).toBeDefined();
      expect(copyButton?.text).toContain(referralCode);
    });

    it('should have back button', () => {
      const keyboard = createInviteKeyboard(miniAppUrl, referralCode);
      const buttons = keyboard.inline_keyboard.flat();
      const buttonTexts = buttons.map((b) => b.text);

      expect(buttonTexts).toContain('◀️ Back');
    });
  });

  describe('createLeaderboardKeyboard', () => {
    it('should create keyboard with Play Now button', () => {
      const keyboard = createLeaderboardKeyboard(miniAppUrl);
      const firstRow = keyboard.inline_keyboard[0];

      expect(firstRow[0]).toHaveProperty('web_app');
      expect(firstRow[0].text).toBe('🎮 Play Now');
    });

    it('should have period filter buttons', () => {
      const keyboard = createLeaderboardKeyboard(miniAppUrl);
      const buttons = keyboard.inline_keyboard.flat();
      const buttonTexts = buttons.map((b) => b.text);

      expect(buttonTexts).toContain('📅 Daily');
      expect(buttonTexts).toContain('📆 Weekly');
      expect(buttonTexts).toContain('🌍 Global');
    });

    it('should have correct callback data for periods', () => {
      const keyboard = createLeaderboardKeyboard(miniAppUrl);
      const buttons = keyboard.inline_keyboard.flat();
      const callbackButtons = buttons.filter((b) => 'callback_data' in b);

      const callbackData = callbackButtons.map(
        (b) => (b as { callback_data: string }).callback_data
      );
      expect(callbackData).toContain('lb_daily');
      expect(callbackData).toContain('lb_weekly');
      expect(callbackData).toContain('lb_global');
    });
  });

  describe('createHelpKeyboard', () => {
    it('should create keyboard with Start Playing button', () => {
      const keyboard = createHelpKeyboard(miniAppUrl);
      const firstRow = keyboard.inline_keyboard[0];

      expect(firstRow[0]).toHaveProperty('web_app');
      expect(firstRow[0].text).toBe('🎮 Start Playing');
    });

    it('should have full guide URL button', () => {
      const keyboard = createHelpKeyboard(miniAppUrl);
      const buttons = keyboard.inline_keyboard.flat();
      const guideButton = buttons.find((b) => b.text.includes('Full Guide'));

      expect(guideButton).toBeDefined();
      expect(guideButton).toHaveProperty('url');
    });

    it('should have back button', () => {
      const keyboard = createHelpKeyboard(miniAppUrl);
      const buttons = keyboard.inline_keyboard.flat();
      const buttonTexts = buttons.map((b) => b.text);

      expect(buttonTexts).toContain('◀️ Back');
    });
  });
});
