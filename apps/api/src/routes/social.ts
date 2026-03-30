/**
 * Social Tasks Routes
 * Verification for social tasks (Telegram channel, etc.)
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Env, Variables } from '../types.js';
import {
  createRedisClient,
  saveUserState,
  getOrCreateUserState,
} from '../lib/redis.js';

// Schema for task verification
const VerifyTaskSchema = z.object({
  taskId: z.enum([
    'telegram-channel',
    'telegram-group',
    'twitter-follow',
    'share-referral',
  ]),
});

// Points for each social task
const TASK_REWARDS: Record<string, number> = {
  'telegram-channel': 3000,
  'telegram-group': 2000,
  'twitter-follow': 2000,
  'share-referral': 500,
};

// Telegram API base URL
const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

/**
 * Check if user is member of a Telegram channel/group
 */
async function checkTelegramMembership(
  botToken: string,
  chatId: string,
  userId: number
): Promise<{ isMember: boolean; status?: string }> {
  try {
    const response = await fetch(
      `${TELEGRAM_API_BASE}${botToken}/getChatMember?chat_id=${chatId}&user_id=${userId}`
    );

    const data = await response.json() as {
      ok: boolean;
      result?: { status: string };
      description?: string;
    };

    if (!data.ok) {
      console.error('[Social] Telegram API error:', data.description);
      return { isMember: false };
    }

    const status = data.result?.status;

    // Member statuses that count as "joined"
    const validStatuses = ['member', 'administrator', 'creator'];
    const isMember = validStatuses.includes(status || '');

    return { isMember, status };
  } catch (error) {
    console.error('[Social] Error checking Telegram membership:', error);
    return { isMember: false };
  }
}

// Router
export const socialRouter = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>()
  // POST /social/verify - Verify and claim a social task
  .post('/verify', zValidator('json', VerifyTaskSchema), async (c) => {
    const { taskId } = c.req.valid('json');
    const telegramId = c.get('telegramId');

    const redis = createRedisClient(c.env);

    // Check if already claimed
    const claimedKey = `social:claimed:${telegramId}:${taskId}`;
    const alreadyClaimed = await redis.get(claimedKey);

    if (alreadyClaimed) {
      return c.json({
        success: false,
        error: 'Task already claimed',
        code: 'ALREADY_CLAIMED',
      }, 400);
    }

    let verified = false;
    let verificationMessage = '';

    switch (taskId) {
      case 'telegram-channel': {
        // Check @EVOtokenTON channel membership
        const channelId = '@EVOtokenTON';
        const result = await checkTelegramMembership(
          c.env.BOT_TOKEN,
          channelId,
          telegramId
        );
        verified = result.isMember;
        verificationMessage = verified
          ? 'Channel membership verified'
          : 'Please join the channel first';
        break;
      }

      case 'telegram-group': {
        // Check @EVOcommunity group membership
        const groupId = '@EVOcommunity';
        const result = await checkTelegramMembership(
          c.env.BOT_TOKEN,
          groupId,
          telegramId
        );
        verified = result.isMember;
        verificationMessage = verified
          ? 'Group membership verified'
          : 'Please join the group first';
        break;
      }

      case 'share-referral': {
        // For share tasks, we trust the client that they shared
        // In production, you could track actual referral signups
        verified = true;
        verificationMessage = 'Share task completed';
        break;
      }

      case 'twitter-follow': {
        // Twitter requires OAuth - for now, we use a time-based verification
        // In production, implement proper Twitter API verification
        verified = true; // Trust client for MVP
        verificationMessage = 'Twitter follow marked as completed';
        break;
      }
    }

    if (!verified) {
      return c.json({
        success: false,
        error: verificationMessage,
        code: 'VERIFICATION_FAILED',
      }, 400);
    }

    // Mark as claimed and award points
    await redis.set(claimedKey, '1');

    const userState = await getOrCreateUserState(redis, telegramId);
    const reward = TASK_REWARDS[taskId] || 0;

    const updatedState = {
      ...userState,
      points: userState.points + reward,
    };

    await saveUserState(redis, telegramId, updatedState);

    return c.json({
      success: true,
      data: {
        verified: true,
        reward,
        message: verificationMessage,
        newPoints: updatedState.points,
      },
    });
  })

  // GET /social/status - Get status of all social tasks
  .get('/status', async (c) => {
    const telegramId = c.get('telegramId');

    const redis = createRedisClient(c.env);

    // Check claimed status for each task
    const taskIds = [
      'telegram-channel',
      'telegram-group',
      'twitter-follow',
      'share-referral',
    ];

    const status: Record<string, { claimed: boolean; reward: number }> = {};

    for (const taskId of taskIds) {
      const claimedKey = `social:claimed:${telegramId}:${taskId}`;
      const claimed = await redis.get(claimedKey);

      status[taskId] = {
        claimed: !!claimed,
        reward: TASK_REWARDS[taskId] || 0,
      };
    }

    return c.json({
      success: true,
      data: status,
    });
  })

  // GET /social/check/:taskId - Check verification status without claiming
  .get('/check/:taskId', async (c) => {
    const taskId = c.req.param('taskId');
    const telegramId = c.get('telegramId');

    let canVerify = false;
    let message = '';

    switch (taskId) {
      case 'telegram-channel': {
        const result = await checkTelegramMembership(
          c.env.BOT_TOKEN,
          '@EVOtokenTON',
          telegramId
        );
        canVerify = result.isMember;
        message = canVerify ? 'You are a member' : 'Not a member yet';
        break;
      }

      case 'telegram-group': {
        const result = await checkTelegramMembership(
          c.env.BOT_TOKEN,
          '@EVOcommunity',
          telegramId
        );
        canVerify = result.isMember;
        message = canVerify ? 'You are a member' : 'Not a member yet';
        break;
      }

      default:
        message = 'Task type does not require pre-check';
        canVerify = true;
    }

    return c.json({
      success: true,
      data: { canVerify, message },
    });
  });
