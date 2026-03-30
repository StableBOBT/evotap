import type { BotContext, Env } from '../types.js';
import { parseDeepLink } from '../types.js';
import { createWelcomeKeyboard } from '../keyboards/index.js';
import { createApiClient } from '../lib/api.js';

/** Bonus points for referral */
const REFERRAL_BONUS_POINTS = 5000;

/**
 * Formatted player count for social proof
 */
function formatPlayerCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toLocaleString();
}

/**
 * Handles /start command
 * - Creates new user if not exists
 * - Processes referral codes
 * - Shows world-class welcome message
 */
export async function handleStart(ctx: BotContext, env: Env): Promise<void> {
  const user = ctx.from;
  if (!user) return;

  const startParam = ctx.match as string | undefined;
  const deepLink = parseDeepLink(startParam);
  const api = createApiClient(env.API_URL, env.BOT_TOKEN);

  // Track referral result
  let referrerName: string | undefined;
  let referralBonus = 0;
  let referralError: string | undefined;

  // Process referral if present
  if (deepLink?.type === 'referral') {
    ctx.session.referralCode = deepLink.code;

    try {
      const result = await api.claimReferral(
        {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          username: user.username,
          languageCode: user.language_code,
          isPremium: user.is_premium,
        },
        deepLink.code
      );

      if (result.success && result.data) {
        if (result.data.claimed) {
          referrerName = result.data.referrerName || 'a friend';
          referralBonus = result.data.bonusPoints;
        } else {
          // Referral not claimed (maybe already has referrer or invalid code)
          referralError = result.data.message;
        }
      } else {
        referralError = result.error;
      }
    } catch (error) {
      console.error('Failed to claim referral:', error);
      referralError = 'Could not process referral';
    }
  } else {
    // No referral - just ensure user exists
    try {
      await api.ensureUser({
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        username: user.username,
        languageCode: user.language_code,
        isPremium: user.is_premium,
      });
    } catch (error) {
      console.error('Failed to ensure user:', error);
    }
  }

  // Fetch real player count from API
  let playerCount = 0; // No fake numbers - show real count only
  try {
    const playersResult = await api.getTotalPlayers();
    if (playersResult.success && playersResult.data) {
      playerCount = playersResult.data.totalPlayers;
    }
  } catch (error) {
    console.error('Failed to fetch player count:', error);
  }

  const welcomeMessage = getWelcomeMessage(
    user.first_name,
    playerCount,
    referrerName,
    referralBonus
  );
  const keyboard = createWelcomeKeyboard(env.MINI_APP_URL);

  await ctx.reply(welcomeMessage, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });
}

/**
 * Generates world-class welcome message with social proof and urgency
 * Inspired by Notcoin and Hamster Kombat onboarding
 */
function getWelcomeMessage(
  firstName: string,
  playerCount: number,
  referrerName?: string,
  bonusPoints: number = REFERRAL_BONUS_POINTS
): string {
  const formattedBonus = bonusPoints.toLocaleString();

  // Build player count line - only show if we have real players
  const playerLine = playerCount > 0
    ? `<b>${formatPlayerCount(playerCount)}+ players</b> already joined\n`
    : '';

  // Referral welcome (higher conversion)
  if (referrerName) {
    return `
<b>EVO TAP</b>

Hey <b>${firstName}</b>! ${referrerName === 'a friend' ? 'A friend' : `<b>${referrerName}</b>`} invited you to the game!

<b>+${formattedBonus} bonus points</b> credited to your account!
Your friend also got <b>+${formattedBonus} points</b>.

${playerLine}<b>$EVO Airdrop</b> confirmed for top players

Tap the button below to start earning:
`.trim();
  }

  // Standard welcome (new users)
  return `
<b>EVO TAP</b>

Welcome, <b>${firstName}</b>!

Tap to earn. Invite friends. Get $EVO.

${playerLine}<b>$EVO Airdrop</b> confirmed for early players

Start now. Claim your daily bonus:
`.trim();
}
