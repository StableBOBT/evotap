import { InlineKeyboard } from 'grammy';

/**
 * Creates the welcome keyboard - optimized for conversion
 * Large prominent Play button + referral hook
 */
export function createWelcomeKeyboard(miniAppUrl: string): InlineKeyboard {
  return new InlineKeyboard()
    .webApp('Play Now', miniAppUrl)
    .row()
    .text('Invite Friends +5K', 'invite')
    .row()
    .text('Leaderboard', 'leaderboard')
    .text('How to Play', 'help');
}

/**
 * Creates the main menu keyboard with Mini App button
 */
export function createMainKeyboard(miniAppUrl: string): InlineKeyboard {
  return new InlineKeyboard()
    .webApp('Play', miniAppUrl)
    .row()
    .text('Invite +5K', 'invite')
    .text('Leaderboard', 'leaderboard')
    .row()
    .text('My Stats', 'stats')
    .text('Help', 'help');
}

/**
 * Creates keyboard for stats display
 */
export function createStatsKeyboard(miniAppUrl: string): InlineKeyboard {
  return new InlineKeyboard()
    .webApp('Play', miniAppUrl)
    .row()
    .text('Refresh', 'stats')
    .text('Back', 'back_main');
}

/**
 * Creates keyboard for referral/invite display
 * Optimized share text for maximum conversion
 */
export function createInviteKeyboard(
  _miniAppUrl: string,
  referralCode: string
): InlineKeyboard {
  const shareText = encodeURIComponent(
    `Join EVO Tap! Tap to earn $EVO tokens. We both get +5,000 bonus points.`
  );
  const shareUrl = `https://t.me/share/url?url=https://t.me/EVOtapBot?start=${referralCode}&text=${shareText}`;

  return new InlineKeyboard()
    .url('Share with Friends', shareUrl)
    .row()
    .text('Copy Link', `copy_${referralCode}`)
    .row()
    .text('Back', 'back_main');
}

/**
 * Creates keyboard for leaderboard display
 */
export function createLeaderboardKeyboard(miniAppUrl: string): InlineKeyboard {
  return new InlineKeyboard()
    .webApp('Play', miniAppUrl)
    .row()
    .text('Today', 'lb_daily')
    .text('Week', 'lb_weekly')
    .text('All Time', 'lb_global')
    .row()
    .text('Back', 'back_main');
}

/**
 * Creates keyboard for help display
 */
export function createHelpKeyboard(miniAppUrl: string): InlineKeyboard {
  return new InlineKeyboard()
    .webApp('Start Playing', miniAppUrl)
    .row()
    .url('Community', 'https://t.me/EVOcommunity')
    .text('Back', 'back_main');
}
