/**
 * Seasons API Routes
 */

import { Hono } from 'hono';
import type { Env, Variables } from '../types.js';
import { createRedisClient } from '../lib/redis.js';
import {
  getCurrentSeason,
  createSeason,
  getSeasonLeaderboard,
  getSeasonTeamTotals,
  endSeason,
  isSeasonEnded,
  getSeasonTimeRemaining,
  SEASON_CONFIG,
} from '../lib/seasons.js';

// =============================================================================
// ROUTER
// =============================================================================

export const seasonsRouter = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>()
  // GET /seasons/current - Get current season info
  .get('/current', async (c) => {
    const redis = createRedisClient(c.env);

    let season = await getCurrentSeason(redis);

    // If no season exists, create Season 1
    if (!season) {
      season = await createSeason(
        redis,
        1,
        'Season 1: Genesis',
        new Date(),
        SEASON_CONFIG.BASE_PRIZE_POOL
      );
    }

    // Check if season ended
    const ended = isSeasonEnded(season);
    const timeRemaining = getSeasonTimeRemaining(season);

    return c.json({
      success: true,
      data: {
        season: {
          id: season.id,
          name: season.name,
          startDate: season.startDate,
          endDate: season.endDate,
          status: ended ? 'ended' : season.status,
          prizePool: season.prizePool,
        },
        stats: {
          totalPlayers: season.totalPlayers,
          totalPoints: season.totalPoints,
        },
        timeRemaining: ended
          ? null
          : {
              days: timeRemaining.days,
              hours: timeRemaining.hours,
              minutes: timeRemaining.minutes,
              formatted: `${timeRemaining.days}d ${timeRemaining.hours}h ${timeRemaining.minutes}m`,
            },
      },
    });
  })

  // GET /seasons/battle - Get team battle stats (no names, just totals)
  .get('/battle', async (c) => {
    const redis = createRedisClient(c.env);

    let season = await getCurrentSeason(redis);
    if (!season) {
      return c.json({
        success: true,
        data: {
          colla: 0,
          camba: 0,
          winner: null,
          percentage: { colla: 50, camba: 50 },
        },
      });
    }

    const totals = await getSeasonTeamTotals(redis, season.id);
    const total = totals.colla + totals.camba;

    // Calculate percentages
    let collaPercent = 50;
    let cambaPercent = 50;
    if (total > 0) {
      collaPercent = Math.round((totals.colla / total) * 100);
      cambaPercent = 100 - collaPercent;
    }

    // Determine winner
    let winner: 'colla' | 'camba' | 'tie' | null = null;
    if (totals.colla > totals.camba) winner = 'colla';
    else if (totals.camba > totals.colla) winner = 'camba';
    else if (total > 0) winner = 'tie';

    return c.json({
      success: true,
      data: {
        colla: totals.colla,
        camba: totals.camba,
        winner,
        percentage: {
          colla: collaPercent,
          camba: cambaPercent,
        },
        seasonId: season.id,
        seasonName: season.name,
      },
    });
  })

  // GET /seasons/leaderboard - Get season leaderboard (top 100)
  .get('/leaderboard', async (c) => {
    const redis = createRedisClient(c.env);
    const limit = parseInt(c.req.query('limit') || '100');

    const season = await getCurrentSeason(redis);
    if (!season) {
      return c.json({
        success: true,
        data: {
          entries: [],
          seasonId: null,
        },
      });
    }

    const entries = await getSeasonLeaderboard(redis, season.id, limit);

    // Don't expose telegram IDs directly, use anonymous display
    const anonymizedEntries = entries.map((e) => ({
      rank: e.rank,
      points: e.points,
      // Show last 4 digits only for privacy
      displayId: `Player #${String(e.odtelegramId).slice(-4)}`,
    }));

    return c.json({
      success: true,
      data: {
        entries: anonymizedEntries,
        seasonId: season.id,
        seasonName: season.name,
        totalPlayers: season.totalPlayers,
      },
    });
  })

  // POST /seasons/admin/create - Create new season (admin only)
  .post('/admin/create', async (c) => {
    // Verify admin
    const adminKey = c.req.header('X-Admin-Key');
    const expectedKey = await crypto.subtle
      .digest('SHA-256', new TextEncoder().encode(c.env.BOT_TOKEN + 'admin-dashboard'))
      .then((buf) =>
        Array.from(new Uint8Array(buf))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')
      );

    if (adminKey !== expectedKey) {
      return c.json({ success: false, error: 'Unauthorized' }, 403);
    }

    const redis = createRedisClient(c.env);
    const body = await c.req.json<{ name?: string; prizePool?: string }>();

    // Get next season ID
    const currentSeason = await getCurrentSeason(redis);
    const nextId = currentSeason ? currentSeason.id + 1 : 1;

    const season = await createSeason(
      redis,
      nextId,
      body.name || `Season ${nextId}`,
      new Date(),
      body.prizePool || SEASON_CONFIG.BASE_PRIZE_POOL
    );

    return c.json({
      success: true,
      data: {
        season,
        message: `Season ${nextId} created successfully`,
      },
    });
  })

  // POST /seasons/admin/end - End current season (admin only)
  .post('/admin/end', async (c) => {
    // Verify admin
    const adminKey = c.req.header('X-Admin-Key');
    const expectedKey = await crypto.subtle
      .digest('SHA-256', new TextEncoder().encode(c.env.BOT_TOKEN + 'admin-dashboard'))
      .then((buf) =>
        Array.from(new Uint8Array(buf))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')
      );

    if (adminKey !== expectedKey) {
      return c.json({ success: false, error: 'Unauthorized' }, 403);
    }

    const redis = createRedisClient(c.env);
    const season = await getCurrentSeason(redis);

    if (!season) {
      return c.json({ success: false, error: 'No active season' }, 400);
    }

    const stats = await endSeason(redis, season.id);

    return c.json({
      success: true,
      data: {
        seasonId: season.id,
        seasonName: season.name,
        finalStats: stats,
        message: 'Season ended. Ready for airdrop generation.',
      },
    });
  });
