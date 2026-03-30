/**
 * Merkle Tree implementation for gas-efficient airdrops
 * Uses keccak256 for hashing (standard in blockchain airdrops)
 */

import { createHash } from 'crypto';

// =============================================================================
// TYPES
// =============================================================================

export interface AirdropEntry {
  address: string;      // TON wallet address
  telegramId: number;   // For identification
  amount: string;       // Token amount as string (supports big numbers)
  trustScore: number;   // Trust score at snapshot time
}

export interface MerkleProof {
  proof: string[];      // Array of sibling hashes
  leaf: string;         // The leaf hash
  index: number;        // Leaf index in the tree
  amount: string;       // Claimable amount
}

export interface MerkleSnapshot {
  root: string;         // Merkle root
  totalRecipients: number;
  totalAmount: string;  // Total tokens to distribute
  createdAt: string;    // ISO timestamp
  leaves: AirdropEntry[];
}

// =============================================================================
// HASHING FUNCTIONS
// =============================================================================

/**
 * Keccak256 hash (sha3-256 in Node crypto)
 * Standard for Ethereum/TON compatible merkle trees
 */
function keccak256(data: string | Buffer): string {
  const hash = createHash('sha3-256');
  hash.update(typeof data === 'string' ? Buffer.from(data) : data);
  return hash.digest('hex');
}

/**
 * Hash a leaf node (address + amount)
 * Uses abi.encodePacked style for compatibility
 */
export function hashLeaf(address: string, amount: string): string {
  // Normalize address to lowercase
  const normalizedAddress = address.toLowerCase();
  // Encode: address (42 chars) + amount
  const packed = `${normalizedAddress}:${amount}`;
  return keccak256(packed);
}

/**
 * Hash two child nodes together (sorted to ensure consistency)
 */
function hashPair(a: string, b: string): string {
  // Sort to ensure consistent ordering regardless of which side
  const [left, right] = [a, b].sort();
  const combined = Buffer.from(left + right, 'hex');
  return keccak256(combined);
}

// =============================================================================
// MERKLE TREE CLASS
// =============================================================================

export class MerkleTree {
  private leaves: string[];
  private layers: string[][];
  private leafToIndex: Map<string, number>;
  private entries: AirdropEntry[];

  constructor(entries: AirdropEntry[]) {
    this.entries = entries;
    this.leafToIndex = new Map();

    // Generate leaves
    this.leaves = entries.map((entry, index) => {
      const leaf = hashLeaf(entry.address, entry.amount);
      this.leafToIndex.set(leaf, index);
      return leaf;
    });

    // Build the tree
    this.layers = this.buildTree();
  }

  private buildTree(): string[][] {
    if (this.leaves.length === 0) {
      return [['0'.repeat(64)]]; // Empty tree
    }

    const layers: string[][] = [this.leaves];

    // Build each layer until we reach the root
    while (layers[layers.length - 1].length > 1) {
      const currentLayer = layers[layers.length - 1];
      const nextLayer: string[] = [];

      for (let i = 0; i < currentLayer.length; i += 2) {
        if (i + 1 < currentLayer.length) {
          nextLayer.push(hashPair(currentLayer[i], currentLayer[i + 1]));
        } else {
          // Odd number of nodes - promote the last one
          nextLayer.push(currentLayer[i]);
        }
      }

      layers.push(nextLayer);
    }

    return layers;
  }

  /**
   * Get the Merkle root
   */
  getRoot(): string {
    return this.layers[this.layers.length - 1][0];
  }

  /**
   * Get proof for a specific address
   */
  getProof(address: string, amount: string): MerkleProof | null {
    const leaf = hashLeaf(address, amount);
    const index = this.leafToIndex.get(leaf);

    if (index === undefined) {
      return null;
    }

    const proof: string[] = [];
    let currentIndex = index;

    for (let i = 0; i < this.layers.length - 1; i++) {
      const layer = this.layers[i];
      const isLeft = currentIndex % 2 === 0;
      const siblingIndex = isLeft ? currentIndex + 1 : currentIndex - 1;

      if (siblingIndex < layer.length) {
        proof.push(layer[siblingIndex]);
      }

      currentIndex = Math.floor(currentIndex / 2);
    }

    return {
      proof,
      leaf,
      index,
      amount,
    };
  }

  /**
   * Verify a proof
   */
  static verify(proof: string[], leaf: string, root: string): boolean {
    let computedHash = leaf;

    for (const sibling of proof) {
      computedHash = hashPair(computedHash, sibling);
    }

    return computedHash === root;
  }

  /**
   * Get all entries
   */
  getEntries(): AirdropEntry[] {
    return this.entries;
  }

  /**
   * Get total recipients
   */
  getTotalRecipients(): number {
    return this.entries.length;
  }

  /**
   * Get total amount
   */
  getTotalAmount(): bigint {
    return this.entries.reduce((sum, entry) => sum + BigInt(entry.amount), 0n);
  }

  /**
   * Export snapshot for storage
   */
  toSnapshot(): MerkleSnapshot {
    return {
      root: this.getRoot(),
      totalRecipients: this.getTotalRecipients(),
      totalAmount: this.getTotalAmount().toString(),
      createdAt: new Date().toISOString(),
      leaves: this.entries,
    };
  }
}

// =============================================================================
// AIRDROP CALCULATION
// =============================================================================

export interface AirdropConfig {
  totalTokens: bigint;           // Total tokens to distribute
  minTrustScore: number;         // Minimum trust score to be eligible
  premiumMultiplier: number;     // Multiplier for premium users (e.g., 1.25)
  streakBonus: number;           // Bonus per streak day (e.g., 0.01 = 1%)
  maxStreakBonus: number;        // Maximum streak bonus (e.g., 0.3 = 30%)
}

export interface EligibleUser {
  telegramId: number;
  walletAddress: string;
  points: number;
  trustScore: number;
  isPremium: boolean;
  streakDays: number;
}

/**
 * Calculate token allocation for all eligible users
 */
export function calculateAirdropAllocations(
  users: EligibleUser[],
  config: AirdropConfig
): AirdropEntry[] {
  // Filter eligible users
  const eligible = users.filter(u =>
    u.trustScore >= config.minTrustScore &&
    u.walletAddress &&
    u.points > 0
  );

  if (eligible.length === 0) {
    return [];
  }

  // Calculate weighted points for each user
  const weighted = eligible.map(user => {
    let weight = user.points;

    // Premium bonus
    if (user.isPremium) {
      weight *= config.premiumMultiplier;
    }

    // Trust score multiplier (0.5x to 1.25x based on score)
    const trustMultiplier = 0.5 + (user.trustScore / 100) * 0.75;
    weight *= trustMultiplier;

    // Streak bonus (capped)
    const streakBonus = Math.min(
      user.streakDays * config.streakBonus,
      config.maxStreakBonus
    );
    weight *= (1 + streakBonus);

    return {
      user,
      weight,
    };
  });

  // Calculate total weight
  const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);

  // Allocate tokens proportionally
  const entries: AirdropEntry[] = weighted.map(({ user, weight }) => {
    const share = weight / totalWeight;
    const amount = (config.totalTokens * BigInt(Math.floor(share * 1e18))) / BigInt(1e18);

    return {
      address: user.walletAddress,
      telegramId: user.telegramId,
      amount: amount.toString(),
      trustScore: user.trustScore,
    };
  });

  return entries;
}

// =============================================================================
// PROOF VERIFICATION FOR CLAIMS
// =============================================================================

/**
 * Verify a user's claim proof
 */
export function verifyClaimProof(
  address: string,
  amount: string,
  proof: string[],
  root: string
): boolean {
  const leaf = hashLeaf(address, amount);
  return MerkleTree.verify(proof, leaf, root);
}
