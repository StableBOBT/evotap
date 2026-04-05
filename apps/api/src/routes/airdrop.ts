/**
 * Airdrop Routes
 * Merkle tree based airdrop system for token distribution
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Env, Variables } from '../types.js';
import { createRedisClient } from '../lib/redis.js';
import {
  MerkleTree,
  calculateAirdropAllocations,
  verifyClaimProof,
  type MerkleSnapshot,
  type AirdropConfig,
  type EligibleUser,
} from '../lib/merkleTree.js';

// =============================================================================
// CONSTANTS
// =============================================================================

const AIRDROP_CONFIG: AirdropConfig = {
  totalTokens: BigInt('800000000000000000000000000'), // 800M tokens (80% of 1B)
  minTrustScore: 30,      // Minimum 30 trust score
  premiumMultiplier: 1.25, // 25% bonus for premium users
  streakBonus: 0.01,      // 1% per streak day
  maxStreakBonus: 0.3,    // Max 30% streak bonus
};

const REDIS_KEYS = {
  SNAPSHOT: 'airdrop:snapshot:current',
  ROOT: 'airdrop:root:current',
  CLAIMS: 'airdrop:claims', // Hash of telegramId -> claim status
};

// =============================================================================
// SCHEMAS
// =============================================================================

const GenerateSnapshotSchema = z.object({
  adminKey: z.string(), // Simple admin key for MVP
});

const GetProofSchema = z.object({
  walletAddress: z.string().min(40),
});

const VerifyProofSchema = z.object({
  walletAddress: z.string().min(40),
  amount: z.string(),
  proof: z.array(z.string()),
});

// =============================================================================
// ROUTER
// =============================================================================

export const airdropRouter = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>()
  // GET /airdrop/status - Get current airdrop status
  .get('/status', async (c) => {
    const redis = createRedisClient(c.env);
    const telegramId = c.get('telegramId');

    try {
      // Get current snapshot metadata
      const root = await redis.get(REDIS_KEYS.ROOT);

      if (!root) {
        return c.json({
          success: true,
          data: {
            isActive: false,
            message: 'No active airdrop snapshot',
          },
        });
      }

      // Check if user has claimed
      const claimed = await redis.hget(REDIS_KEYS.CLAIMS, telegramId.toString());

      // Get user's allocation from snapshot
      const snapshotData = await redis.get(REDIS_KEYS.SNAPSHOT);
      let userAllocation = null;

      if (snapshotData) {
        try {
          const snapshot: MerkleSnapshot = JSON.parse(snapshotData);
          const userEntry = snapshot.leaves.find(e => e.telegramId === telegramId);
          if (userEntry) {
            userAllocation = {
              amount: userEntry.amount,
              trustScore: userEntry.trustScore,
            };
          }
        } catch (parseError) {
          console.error('[Airdrop] Failed to parse snapshot data:', parseError);
        }
      }

      return c.json({
        success: true,
        data: {
          isActive: true,
          root,
          hasClaimed: !!claimed,
          allocation: userAllocation,
        },
      });
    } catch (error) {
      console.error('[Airdrop] Error getting status:', error);
      return c.json({
        success: false,
        error: 'Failed to get airdrop status',
        code: 'AIRDROP_STATUS_ERROR',
      }, 500);
    }
  })

  // GET /airdrop/proof - Get user's merkle proof
  .get('/proof', zValidator('query', GetProofSchema), async (c) => {
    const { walletAddress } = c.req.valid('query');
    const redis = createRedisClient(c.env);
    const telegramId = c.get('telegramId');

    try {
      const snapshotData = await redis.get(REDIS_KEYS.SNAPSHOT);

      if (!snapshotData) {
        return c.json({
          success: false,
          error: 'No active airdrop',
          code: 'NO_AIRDROP',
        }, 404);
      }

      const snapshot: MerkleSnapshot = JSON.parse(snapshotData);

      // Find user's entry by telegram ID AND wallet address
      const userEntry = snapshot.leaves.find(
        e => e.telegramId === telegramId && e.address.toLowerCase() === walletAddress.toLowerCase()
      );

      if (!userEntry) {
        return c.json({
          success: false,
          error: 'Not eligible for airdrop or wallet address mismatch',
          code: 'NOT_ELIGIBLE',
        }, 404);
      }

      // Rebuild tree to generate proof
      const tree = new MerkleTree(snapshot.leaves);
      const proof = tree.getProof(userEntry.address, userEntry.amount);

      if (!proof) {
        return c.json({
          success: false,
          error: 'Failed to generate proof',
          code: 'PROOF_ERROR',
        }, 500);
      }

      return c.json({
        success: true,
        data: {
          proof: proof.proof,
          leaf: proof.leaf,
          amount: proof.amount,
          root: snapshot.root,
          index: proof.index,
        },
      });
    } catch (error) {
      console.error('[Airdrop] Error getting proof:', error);
      return c.json({
        success: false,
        error: 'Failed to get proof',
        code: 'PROOF_ERROR',
      }, 500);
    }
  })

  // POST /airdrop/verify - Verify a proof (for client-side validation)
  .post('/verify', zValidator('json', VerifyProofSchema), async (c) => {
    const { walletAddress, amount, proof } = c.req.valid('json');
    const redis = createRedisClient(c.env);

    try {
      const root = await redis.get(REDIS_KEYS.ROOT);

      if (!root) {
        return c.json({
          success: false,
          error: 'No active airdrop',
          code: 'NO_AIRDROP',
        }, 404);
      }

      const isValid = verifyClaimProof(walletAddress, amount, proof, root);

      return c.json({
        success: true,
        data: {
          isValid,
          root,
        },
      });
    } catch (error) {
      console.error('[Airdrop] Error verifying proof:', error);
      return c.json({
        success: false,
        error: 'Failed to verify proof',
        code: 'VERIFY_ERROR',
      }, 500);
    }
  })

  // POST /airdrop/mark-claimed - Mark user as having claimed (called after on-chain claim)
  .post('/mark-claimed', async (c) => {
    const redis = createRedisClient(c.env);
    const telegramId = c.get('telegramId');

    try {
      await redis.hset(REDIS_KEYS.CLAIMS, {
        [telegramId.toString()]: new Date().toISOString(),
      });

      return c.json({
        success: true,
        data: { claimed: true },
      });
    } catch (error) {
      console.error('[Airdrop] Error marking claimed:', error);
      return c.json({
        success: false,
        error: 'Failed to mark as claimed',
        code: 'CLAIM_ERROR',
      }, 500);
    }
  })

  // POST /airdrop/generate-snapshot - Generate new snapshot (admin only)
  .post('/generate-snapshot', zValidator('json', GenerateSnapshotSchema), async (c) => {
    const { adminKey } = c.req.valid('json');
    const redis = createRedisClient(c.env);

    // Simple admin key check (use proper auth in production)
    const expectedKey = await crypto.subtle
      .digest('SHA-256', new TextEncoder().encode(c.env.BOT_TOKEN + 'airdrop-admin'))
      .then(buf =>
        Array.from(new Uint8Array(buf))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
      );

    if (adminKey !== expectedKey) {
      return c.json({
        success: false,
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
      }, 403);
    }

    try {
      // Get all users from leaderboard (they have points)
      const leaderboardKey = 'leaderboard:global';
      const allUsers = await redis.zrange(leaderboardKey, 0, -1, { withScores: true });

      if (allUsers.length === 0) {
        return c.json({
          success: false,
          error: 'No users to include in snapshot',
          code: 'NO_USERS',
        }, 400);
      }

      // Fetch detailed user data
      const eligibleUsers: EligibleUser[] = [];

      for (let i = 0; i < allUsers.length; i += 2) {
        const telegramIdStr = allUsers[i] as string;
        const points = allUsers[i + 1] as number;
        const telegramId = parseInt(telegramIdStr);

        // Get user state
        const userKey = `user:${telegramId}`;
        const userData = await redis.hgetall(userKey);

        if (!userData || !userData.walletAddress) {
          continue; // Skip users without wallet
        }

        // Get trust score
        const trustKey = `anticheat:trust:${telegramId}`;
        const trustData = await redis.hgetall(trustKey);
        const trustScore = trustData?.score ? parseInt(trustData.score as string) : 50;

        eligibleUsers.push({
          telegramId,
          walletAddress: userData.walletAddress as string,
          points: points,
          trustScore,
          isPremium: userData.isPremium === 'true',
          streakDays: parseInt(userData.currentStreak as string) || 0,
        });
      }

      if (eligibleUsers.length === 0) {
        return c.json({
          success: false,
          error: 'No eligible users with wallets',
          code: 'NO_ELIGIBLE_USERS',
        }, 400);
      }

      // Calculate allocations
      const allocations = calculateAirdropAllocations(eligibleUsers, AIRDROP_CONFIG);

      if (allocations.length === 0) {
        return c.json({
          success: false,
          error: 'No users passed eligibility criteria',
          code: 'NO_ELIGIBLE_USERS',
        }, 400);
      }

      // Build Merkle tree
      const tree = new MerkleTree(allocations);
      const snapshot = tree.toSnapshot();

      // Store snapshot
      await redis.set(REDIS_KEYS.SNAPSHOT, JSON.stringify(snapshot));
      await redis.set(REDIS_KEYS.ROOT, snapshot.root);

      return c.json({
        success: true,
        data: {
          root: snapshot.root,
          totalRecipients: snapshot.totalRecipients,
          totalAmount: snapshot.totalAmount,
          createdAt: snapshot.createdAt,
        },
      });
    } catch (error) {
      console.error('[Airdrop] Error generating snapshot:', error);
      return c.json({
        success: false,
        error: 'Failed to generate snapshot',
        code: 'SNAPSHOT_ERROR',
      }, 500);
    }
  })

  // GET /airdrop/eligibility - Check user's eligibility without generating proof
  .get('/eligibility', async (c) => {
    const redis = createRedisClient(c.env);
    const telegramId = c.get('telegramId');

    try {
      // Get user's points
      const points = await redis.zscore('leaderboard:global', telegramId.toString());

      // Get user state
      const userKey = `user:${telegramId}`;
      const userData = await redis.hgetall(userKey);

      // Get trust score
      const trustKey = `anticheat:trust:${telegramId}`;
      const trustData = await redis.hgetall(trustKey);
      const trustScore = trustData?.score ? parseInt(trustData.score as string) : 50;

      // Check eligibility criteria
      const hasWallet = !!userData?.walletAddress;
      const hasMinTrust = trustScore >= AIRDROP_CONFIG.minTrustScore;
      const hasPoints = (points || 0) > 0;

      const isEligible = hasWallet && hasMinTrust && hasPoints;

      const reasons: string[] = [];
      if (!hasWallet) reasons.push('Connect wallet');
      if (!hasMinTrust) reasons.push(`Trust score too low (${trustScore}/${AIRDROP_CONFIG.minTrustScore})`);
      if (!hasPoints) reasons.push('Earn points by playing');

      return c.json({
        success: true,
        data: {
          isEligible,
          reasons,
          stats: {
            points: points || 0,
            trustScore,
            hasWallet,
            walletAddress: userData?.walletAddress || null,
            isPremium: userData?.isPremium === 'true',
            streakDays: parseInt(userData?.currentStreak as string) || 0,
          },
        },
      });
    } catch (error) {
      console.error('[Airdrop] Error checking eligibility:', error);
      return c.json({
        success: false,
        error: 'Failed to check eligibility',
        code: 'ELIGIBILITY_ERROR',
      }, 500);
    }
  });
