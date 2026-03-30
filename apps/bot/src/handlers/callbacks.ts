import type { BotContext, Env } from '../types.js';
import {
  createMainKeyboard,
  createStatsKeyboard,
  createInviteKeyboard,
  createLeaderboardKeyboard,
  createHelpKeyboard,
} from '../keyboards/index.js';
import { createApiClient, type UserStats, type ReferralStats, type LeaderboardEntry } from '../lib/api.js';

/** Default stats when API fails */
const DEFAULT_STATS: UserStats = {
  points: 0,
  level: 1,
  rank: 0,
  totalTaps: 0,
  referralCount: 0,
  referralPoints: 0,
  streak: 0,
  nextLevelPoints: 1000,
};

/** Default referral stats when API fails */
const DEFAULT_REFERRAL: ReferralStats = {
  referralCode: 'LOADING',
  referralLink: 'https://t.me/EVOtapBot',
  totalReferrals: 0,
  totalPointsEarned: 0,
};

/**
 * Format large numbers with K/M suffix
 */
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

/**
 * Handle "stats" callback - show user stats
 */
export async function handleStats(ctx: BotContext, env: Env): Promise<void> {
  await ctx.answerCallbackQuery();

  const user = ctx.from;
  if (!user) return;

  const api = createApiClient(env.API_URL, env.BOT_TOKEN);

  // Fetch real stats from API
  let stats = DEFAULT_STATS;
  try {
    const result = await api.getUserStats(user.id);
    if (result.success && result.data) {
      stats = {
        ...DEFAULT_STATS,
        ...result.data,
      };
    }
  } catch (error) {
    console.error('Failed to fetch user stats:', error);
  }

  const nextLevelPoints = stats.nextLevelPoints || (stats.level + 1) * 2000;
  const progress = Math.floor((stats.points / nextLevelPoints) * 100);
  const progressBar = createProgressBar(progress);

  const message = `
<b>YOUR STATS</b>

<b>${formatNumber(stats.points)}</b> points
Rank <b>#${stats.rank || '---'}</b>

Level ${stats.level} ${progressBar} Level ${stats.level + 1}
<i>${formatNumber(nextLevelPoints - stats.points)} points to next level</i>

${stats.streak || 0} day streak
${stats.referralCount} friends invited
${formatNumber(stats.totalTaps)} total taps

Keep playing to climb the leaderboard!
`.trim();

  const keyboard = createStatsKeyboard(env.MINI_APP_URL);

  await ctx.editMessageText(message, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });
}

/**
 * Creates a visual progress bar
 */
function createProgressBar(percent: number): string {
  const filled = Math.floor(percent / 10);
  const empty = 10 - filled;
  return '[' + '|'.repeat(filled) + '-'.repeat(empty) + ']';
}

/**
 * Handle "invite" callback - show referral info with strong CTA
 */
export async function handleInvite(ctx: BotContext, env: Env): Promise<void> {
  await ctx.answerCallbackQuery();

  const user = ctx.from;
  if (!user) return;

  const api = createApiClient(env.API_URL, env.BOT_TOKEN);

  // Fetch real referral data from API
  let referralData = DEFAULT_REFERRAL;
  try {
    const result = await api.getUserReferral(user.id);
    if (result.success && result.data) {
      referralData = result.data;
    }
  } catch (error) {
    console.error('Failed to fetch referral data:', error);
  }

  const referralLink = `https://t.me/EVOtapBot?start=REF_${referralData.referralCode}`;

  const message = `
<b>INVITE FRIENDS</b>

<b>+5,000 points</b> for each friend
<b>+5,000 points</b> for your friend too

You invited: <b>${referralData.totalReferrals}</b> friends
You earned: <b>${formatNumber(referralData.totalPointsEarned)}</b> points

Your link:
<code>${referralLink}</code>

Top inviters get bonus $EVO in the airdrop.
Share now to maximize your rewards!
`.trim();

  const keyboard = createInviteKeyboard(env.MINI_APP_URL, `REF_${referralData.referralCode}`);

  await ctx.editMessageText(message, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });
}

/**
 * Handle "leaderboard" callback - show top players with motivation
 */
export async function handleLeaderboard(
  ctx: BotContext,
  env: Env,
  period: string = 'global'
): Promise<void> {
  await ctx.answerCallbackQuery();

  const user = ctx.from;
  const api = createApiClient(env.API_URL, env.BOT_TOKEN);

  // Fetch real leaderboard from API
  let leaders: LeaderboardEntry[] = [];
  let userRank: number | null = null;
  let userPoints = 0;

  try {
    const result = await api.getLeaderboard(
      5,
      period as 'global' | 'daily' | 'weekly',
      user?.id
    );
    if (result.success && result.data) {
      leaders = result.data.entries;
      userRank = result.data.userRank;
    }
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
  }

  // Get user stats for points
  if (user) {
    try {
      const statsResult = await api.getUserStats(user.id);
      if (statsResult.success && statsResult.data) {
        userPoints = statsResult.data.points;
      }
    } catch (error) {
      console.error('Failed to fetch user stats for leaderboard:', error);
    }
  }

  const periodLabels: Record<string, string> = {
    global: 'ALL TIME',
    daily: 'TODAY',
    weekly: 'THIS WEEK',
  };
  const periodName = periodLabels[period] || 'ALL TIME';

  const medals = ['', '', ''];
  let leaderboardText = 'No players yet. Be the first!';

  if (leaders.length > 0) {
    leaderboardText = leaders
      .map((l) => {
        const prefix = l.rank <= 3 ? medals[l.rank - 1] : `${l.rank}.`;
        const displayName = l.username || l.firstName || `Player ${l.telegramId}`;
        return `${prefix} <b>${displayName}</b> - ${formatNumber(l.points)}`;
      })
      .join('\n');
  }

  const pointsToTop100 = userRank && userRank > 100 ? 50000 - userPoints : 0;
  const userRankDisplay = userRank || '---';

  const message = `
<b>LEADERBOARD - ${periodName}</b>

${leaderboardText}

---
You: <b>#${userRankDisplay}</b> with <b>${formatNumber(userPoints)}</b> points
${pointsToTop100 > 0 ? `<i>${formatNumber(pointsToTop100)} points to Top 100</i>` : userRank && userRank <= 100 ? '<b>You are in Top 100!</b>' : ''}

Top 100 players share 10% of $EVO airdrop.
Keep tapping!
`.trim();

  const keyboard = createLeaderboardKeyboard(env.MINI_APP_URL);

  await ctx.editMessageText(message, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });
}

/**
 * Handle "help" callback - concise help with focus on value
 */
export async function handleHelp(ctx: BotContext, env: Env): Promise<void> {
  await ctx.answerCallbackQuery();

  const message = `
<b>HOW TO PLAY</b>

<b>1. TAP</b>
Open the game and tap to earn points.
More taps = more points = bigger airdrop.

<b>2. INVITE</b>
Share your link with friends.
+5,000 points for you.
+5,000 points for them.

<b>3. EARN $EVO</b>
Top players share the $EVO airdrop.
Connect your TON wallet to claim.

<b>TIPS</b>
- Play daily to keep your streak
- Join a squad for bonus points
- Check leaderboard to track progress

Questions? Join @EVOcommunity
`.trim();

  const keyboard = createHelpKeyboard(env.MINI_APP_URL);

  await ctx.editMessageText(message, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });
}

/**
 * Handle "back_main" callback - return to main menu with stats summary
 */
export async function handleBackToMain(ctx: BotContext, env: Env): Promise<void> {
  await ctx.answerCallbackQuery();

  const user = ctx.from;
  if (!user) return;

  const api = createApiClient(env.API_URL, env.BOT_TOKEN);

  // Fetch real stats from API
  let stats = DEFAULT_STATS;
  try {
    const result = await api.getUserStats(user.id);
    if (result.success && result.data) {
      stats = {
        ...DEFAULT_STATS,
        ...result.data,
      };
    }
  } catch (error) {
    console.error('Failed to fetch user stats:', error);
  }

  const message = `
<b>EVO TAP</b>

<b>${formatNumber(stats.points)}</b> points
Rank <b>#${stats.rank || '---'}</b>
${stats.streak || 0} day streak

Ready to play?
`.trim();

  const keyboard = createMainKeyboard(env.MINI_APP_URL);

  await ctx.editMessageText(message, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });
}
