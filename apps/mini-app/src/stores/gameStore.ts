import { create } from 'zustand';

// Safe cloudStorage access
import { cloudStorage as tgCloudStorage } from '@telegram-apps/sdk-react';

// =============================================================================
// CONSTANTS & TYPES
// =============================================================================

// Bolivian Departments
export const DEPARTMENTS = {
  LA_PAZ: { id: 'la_paz', name: 'La Paz', team: 'colla', emoji: '🏔️' },
  ORURO: { id: 'oruro', name: 'Oruro', team: 'colla', emoji: '⛏️' },
  POTOSI: { id: 'potosi', name: 'Potosí', team: 'colla', emoji: '🪙' },
  COCHABAMBA: { id: 'cochabamba', name: 'Cochabamba', team: 'neutral', emoji: '🌽' },
  CHUQUISACA: { id: 'chuquisaca', name: 'Chuquisaca', team: 'neutral', emoji: '⚖️' },
  TARIJA: { id: 'tarija', name: 'Tarija', team: 'camba', emoji: '🍇' },
  SANTA_CRUZ: { id: 'santa_cruz', name: 'Santa Cruz', team: 'camba', emoji: '🌴' },
  BENI: { id: 'beni', name: 'Beni', team: 'camba', emoji: '🐊' },
  PANDO: { id: 'pando', name: 'Pando', team: 'camba', emoji: '🌳' },
} as const;

export type DepartmentId = keyof typeof DEPARTMENTS;
export type TeamType = 'colla' | 'camba' | 'neutral';
export type BattleTeam = 'colla' | 'camba'; // Only main teams for battle

// Achievement definitions
export const ACHIEVEMENTS = {
  // Tap milestones
  FIRST_TAP: { id: 'first_tap', name: 'Primer Toque', description: 'Haz tu primer tap', icon: '👆', points: 100, requirement: 1 },
  TAP_100: { id: 'tap_100', name: 'Principiante', description: 'Alcanza 100 taps', icon: '💯', points: 500, requirement: 100 },
  TAP_1000: { id: 'tap_1000', name: 'Dedicado', description: 'Alcanza 1,000 taps', icon: '🔥', points: 1000, requirement: 1000 },
  TAP_10000: { id: 'tap_10000', name: 'Veterano', description: 'Alcanza 10,000 taps', icon: '⭐', points: 5000, requirement: 10000 },
  TAP_100000: { id: 'tap_100000', name: 'Leyenda', description: 'Alcanza 100,000 taps', icon: '👑', points: 25000, requirement: 100000 },
  TAP_1000000: { id: 'tap_1000000', name: 'Millonario', description: 'Alcanza 1,000,000 taps', icon: '💎', points: 100000, requirement: 1000000 },

  // Level achievements
  LEVEL_5: { id: 'level_5', name: 'Nivel 5', description: 'Alcanza nivel 5', icon: '🎖️', points: 2000, requirement: 5 },
  LEVEL_9: { id: 'level_9', name: 'Nivel Máximo', description: 'Alcanza nivel 9', icon: '🏆', points: 10000, requirement: 9 },

  // Streak achievements
  STREAK_3: { id: 'streak_3', name: 'Constante', description: '3 días seguidos', icon: '📅', points: 500, requirement: 3 },
  STREAK_7: { id: 'streak_7', name: 'Semana Perfecta', description: '7 días seguidos', icon: '🗓️', points: 2000, requirement: 7 },
  STREAK_30: { id: 'streak_30', name: 'Mes Completo', description: '30 días seguidos', icon: '📆', points: 10000, requirement: 30 },

  // Team achievements
  TEAM_JOINED: { id: 'team_joined', name: 'Patriota', description: 'Únete a un equipo', icon: '🇧🇴', points: 500, requirement: 1 },

  // Referral achievements
  REFERRAL_1: { id: 'referral_1', name: 'Embajador', description: 'Invita a 1 amigo', icon: '🤝', points: 1000, requirement: 1 },
  REFERRAL_5: { id: 'referral_5', name: 'Influencer', description: 'Invita a 5 amigos', icon: '📢', points: 5000, requirement: 5 },
  REFERRAL_10: { id: 'referral_10', name: 'Líder', description: 'Invita a 10 amigos', icon: '🌟', points: 15000, requirement: 10 },

  // Wallet achievement
  WALLET_CONNECTED: { id: 'wallet_connected', name: 'Web3 Ready', description: 'Conecta tu wallet TON', icon: '💰', points: 2000, requirement: 1 },
} as const;

export type AchievementId = keyof typeof ACHIEVEMENTS;

// EVO Phrases
export const EVO_PHRASES = {
  levelUp: [
    "¡Bolivia cambia, EVO cumple!",
    "¡Proceso de cambio!",
    "¡Ama sua, ama llulla, ama quella!",
    "¡El poder al pueblo!",
    "¡Patria o muerte, venceremos!",
    "¡Jallalla Bolivia!",
    "¡La lucha sigue!",
    "¡Unidos somos más!",
  ],
  achievements: [
    "Esto es hoja de coca, no cocaína",
    "El agua es de los pueblos",
    "La tierra es de quien la trabaja",
    "¡Nacionalizamos!",
    "El litio es del pueblo boliviano",
    "¡La Wiphala representa a todos!",
  ],
  tap: [
    "¡Dale compañero!",
    "¡Sigue hermano!",
    "¡Fuerza!",
    "¡Adelante!",
    "¡Carajo!",
    "¡Vamos!",
  ],
  lowEnergy: [
    "Descansa compañero",
    "Hasta los revolucionarios descansan",
    "Recarga energías",
  ],
  streak: [
    "¡La constancia vence!",
    "¡Cada día más fuerte!",
    "¡El pueblo nunca se rinde!",
  ],
} as const;

export function getEvoPhrase(category: keyof typeof EVO_PHRASES): string {
  const phrases = EVO_PHRASES[category];
  return phrases[Math.floor(Math.random() * phrases.length)];
}

// =============================================================================
// GAME STATE INTERFACE
// =============================================================================

interface ServerState {
  points: number;
  energy: number;
  maxEnergy: number;
  level: number;
  totalTaps?: number;
}

interface GameState {
  // Core game state
  points: number;
  energy: number;
  maxEnergy: number;
  level: number;
  totalTaps: number;
  lastEnergyUpdate: number;

  // Team state
  department: DepartmentId | null;
  team: TeamType | null;
  teamJoinedAt: number | null;
  detectedRegion: string | null; // Auto-detected region

  // Streak state
  currentStreak: number;
  longestStreak: number;
  lastPlayDate: string | null; // YYYY-MM-DD format
  streakBonusCollected: boolean;

  // Referral state
  referralCode: string;
  referredBy: string | null;
  referralCount: number;
  referralEarnings: number;

  // Achievement state
  unlockedAchievements: AchievementId[];
  pendingAchievements: AchievementId[]; // To show notifications

  // Wallet state
  walletConnected: boolean;
  walletAddress: string | null;

  // Sync state
  isSyncing: boolean;
  lastSyncedAt: number | null;
  isCloudAvailable: boolean;
  isInitialized: boolean;
  pendingTaps: number; // Taps waiting to be synced to API
  isOnline: boolean;

  // Actions
  tap: () => boolean;
  rechargeEnergy: () => void;
  initialize: () => Promise<void>;
  syncToCloud: () => Promise<boolean>;
  reset: () => void;

  // Team actions
  selectDepartment: (departmentId: DepartmentId) => void;
  selectTeam: (team: BattleTeam) => void;
  setDetectedRegion: (region: string) => void;

  // Streak actions
  checkAndUpdateStreak: () => void;
  collectStreakBonus: () => number;

  // Referral actions
  setReferredBy: (code: string) => void;
  addReferral: () => void;

  // Achievement actions
  checkAchievements: () => void;
  clearPendingAchievements: () => void;

  // Wallet actions
  setWalletConnected: (address: string | null) => void;

  // Points management
  addPoints: (amount: number) => void;

  // API sync actions
  syncFromServer: (state: ServerState) => void;
  clearPendingTaps: () => void;
  setOnlineStatus: (online: boolean) => void;
  getStateForSync: () => {
    points: number;
    energy: number;
    totalTaps: number;
    level: number;
    department: string | null;
    team: string | null;
    currentStreak: number;
    lastPlayDate: string | null;
  };
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STORAGE_KEY = 'evo_game_v2';
const ENERGY_RECHARGE_RATE = 1000; // 1000 energy per minute (16.6/second) - high enough for real users, bots get caught by backend rate limit
const INITIAL_MAX_ENERGY = 1_000_000; // 1 million - virtually unlimited for humans, backend prevents bots with rate limiting
const SYNC_DEBOUNCE_MS = 3000;
const REFERRAL_BONUS = 5000; // Points for both referrer and referee
const STREAK_BONUS_PER_DAY = 100; // Bonus points multiplier per streak day
const ACHIEVEMENT_CHECK_INTERVAL = 10; // Check achievements every N taps

let syncTimeout: NodeJS.Timeout | null = null;
let tapsSinceAchievementCheck = 0; // Track taps for debounced achievement checks

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

// Calculate level from points (matches backend implementation)
function calculateLevel(points: number): number {
  // Thresholds match backend GAME_CONFIG.LEVEL_THRESHOLDS
  if (points < 5000) return 1;
  if (points < 25000) return 2;
  if (points < 100000) return 3;
  if (points < 500000) return 4;
  if (points < 1000000) return 5;
  if (points < 5000000) return 6;
  if (points < 10000000) return 7;
  if (points < 50000000) return 8;
  if (points < 100000000) return 9;
  return 10; // Max level
}

function calculateMaxEnergy(level: number): number {
  // Keep energy high - users should never run out
  // Level ups give modest increases but base is already very high
  return INITIAL_MAX_ENERGY + (level - 1) * 10_000;
}

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

/**
 * Safely parse stored game data with validation
 */
function parseStoredData(json: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(json);
    if (typeof parsed !== 'object' || parsed === null) {
      console.warn('[GameStore] Invalid stored data format');
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    console.error('[GameStore] Failed to parse stored data:', error);
    return null;
  }
}

// =============================================================================
// STORE
// =============================================================================

export const useGameStore = create<GameState>()((set, get) => ({
  // Initial state
  points: 0,
  energy: INITIAL_MAX_ENERGY,
  maxEnergy: INITIAL_MAX_ENERGY,
  level: 1,
  totalTaps: 0,
  lastEnergyUpdate: Date.now(),

  // Team state
  department: null,
  team: null,
  teamJoinedAt: null,
  detectedRegion: null,

  // Streak state
  currentStreak: 0,
  longestStreak: 0,
  lastPlayDate: null,
  streakBonusCollected: false,

  // Referral state
  referralCode: generateReferralCode(),
  referredBy: null,
  referralCount: 0,
  referralEarnings: 0,

  // Achievement state
  unlockedAchievements: [],
  pendingAchievements: [],

  // Wallet state
  walletConnected: false,
  walletAddress: null,

  // Sync state
  isSyncing: false,
  lastSyncedAt: null,
  isCloudAvailable: false,
  isInitialized: false,
  pendingTaps: 0,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,

  // Initialize - completely synchronous, no blocking
  initialize: async () => {
    console.log('[GameStore] Initialize called, current state:', { isInitialized: get().isInitialized });

    if (get().isInitialized) {
      console.log('[GameStore] Already initialized, skipping');
      return;
    }

    // Mark initialized IMMEDIATELY to unblock UI
    console.log('[GameStore] Setting isInitialized = true');
    set({ isInitialized: true });
    console.log('[GameStore] isInitialized set to true');

    // Check cloud availability (non-blocking)
    let isAvailable = false;
    try {
      isAvailable = tgCloudStorage?.getItem?.isAvailable?.() ?? false;
      console.log('[GameStore] Cloud storage available:', isAvailable);
    } catch (err) {
      console.log('[GameStore] Cloud storage check failed:', err);
    }
    set({ isCloudAvailable: isAvailable });

    if (!isAvailable) {
      console.log('[GameStore] No cloud storage, using defaults');
      get().checkAndUpdateStreak();
      return;
    }

    // Load from cloud in background (don't block UI)
    console.log('[GameStore] Loading from cloud storage...');
    try {
      const stored = await Promise.race([
        tgCloudStorage.getItem(STORAGE_KEY),
        new Promise<null>((r) => setTimeout(() => {
          console.log('[GameStore] Cloud storage timeout');
          r(null);
        }, 1000)),
      ]);

      if (stored) {
        console.log('[GameStore] Cloud data loaded, parsing...');
        const data = parseStoredData(stored);
        if (data) {
          const totalTaps = typeof data.totalTaps === 'number' ? data.totalTaps : 0;
          const level = calculateLevel(totalTaps);
          const maxEnergy = calculateMaxEnergy(level);

          console.log('[GameStore] Restoring state:', { totalTaps, level, team: data.team });
          set({
            points: typeof data.points === 'number' ? data.points : 0,
            energy: Math.min(typeof data.energy === 'number' ? data.energy : INITIAL_MAX_ENERGY, maxEnergy),
            maxEnergy,
            level,
            totalTaps,
            lastEnergyUpdate: typeof data.lastEnergyUpdate === 'number' ? data.lastEnergyUpdate : Date.now(),
            department: (data.department as DepartmentId) || null,
            team: (data.team as TeamType) || null,
            teamJoinedAt: typeof data.teamJoinedAt === 'number' ? data.teamJoinedAt : null,
            detectedRegion: typeof data.detectedRegion === 'string' ? data.detectedRegion : null,
            currentStreak: typeof data.currentStreak === 'number' ? data.currentStreak : 0,
            longestStreak: typeof data.longestStreak === 'number' ? data.longestStreak : 0,
            lastPlayDate: typeof data.lastPlayDate === 'string' ? data.lastPlayDate : null,
            streakBonusCollected: data.streakBonusCollected === true,
            referralCode: typeof data.referralCode === 'string' ? data.referralCode : generateReferralCode(),
            referredBy: typeof data.referredBy === 'string' ? data.referredBy : null,
            referralCount: typeof data.referralCount === 'number' ? data.referralCount : 0,
            referralEarnings: typeof data.referralEarnings === 'number' ? data.referralEarnings : 0,
            unlockedAchievements: Array.isArray(data.unlockedAchievements) ? data.unlockedAchievements as AchievementId[] : [],
            walletConnected: data.walletConnected === true,
            walletAddress: typeof data.walletAddress === 'string' ? data.walletAddress : null,
            lastSyncedAt: typeof data.lastSyncedAt === 'number' ? data.lastSyncedAt : null,
          });
          console.log('[GameStore] State restored successfully');
        }
      } else {
        console.log('[GameStore] No stored data found');
      }
      get().checkAndUpdateStreak();
      get().checkAchievements();
    } catch (err) {
      console.error('[GameStore] Error loading from cloud:', err);
    }
  },

  // Tap action
  tap: () => {
    const state = get();

    if (state.energy <= 0) {
      return false;
    }

    const newTotalTaps = state.totalTaps + 1;
    const newPoints = state.points + 1;
    const newLevel = calculateLevel(newPoints); // Fix: Use points instead of totalTaps to match backend
    const newMaxEnergy = calculateMaxEnergy(newLevel);
    const today = getTodayDate();

    // Update streak if first tap of the day
    let newStreak = state.currentStreak;
    let newLongestStreak = state.longestStreak;
    let streakBonusCollected = state.streakBonusCollected;

    if (state.lastPlayDate !== today) {
      if (state.lastPlayDate === getYesterdayDate()) {
        // Consecutive day - increase streak
        newStreak = state.currentStreak + 1;
      } else if (state.lastPlayDate === null) {
        // First time playing
        newStreak = 1;
      } else {
        // Streak broken - reset to 1
        newStreak = 1;
      }
      newLongestStreak = Math.max(newLongestStreak, newStreak);
      streakBonusCollected = false; // Reset bonus for new day
    }

    set({
      points: newPoints,
      energy: state.energy - 1,
      totalTaps: newTotalTaps,
      level: newLevel,
      maxEnergy: newMaxEnergy,
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
      lastPlayDate: today,
      streakBonusCollected,
      pendingTaps: state.pendingTaps + 1, // Track pending taps for API sync
    });

    // Debounced achievement check - only every N taps to improve performance
    tapsSinceAchievementCheck++;
    if (tapsSinceAchievementCheck >= ACHIEVEMENT_CHECK_INTERVAL) {
      tapsSinceAchievementCheck = 0;
      get().checkAchievements();
    }

    // Debounced sync to CloudStorage
    if (state.isCloudAvailable) {
      if (syncTimeout) {
        clearTimeout(syncTimeout);
      }
      syncTimeout = setTimeout(() => {
        get().syncToCloud().catch((err) => {
          console.error('[GameStore] Debounced sync failed:', err);
        });
      }, SYNC_DEBOUNCE_MS);
    }

    return true;
  },

  // Recharge energy based on time
  rechargeEnergy: () => {
    const state = get();
    const now = Date.now();
    const minutesElapsed = (now - state.lastEnergyUpdate) / 60000;
    const energyToAdd = Math.floor(minutesElapsed * ENERGY_RECHARGE_RATE);

    if (energyToAdd > 0) {
      const newEnergy = Math.min(state.maxEnergy, state.energy + energyToAdd);
      set({
        energy: newEnergy,
        lastEnergyUpdate: now,
      });

      if (state.isCloudAvailable && energyToAdd >= 10) {
        get().syncToCloud().catch((err) => {
          console.error('[GameStore] Energy recharge sync failed:', err);
        });
      }
    }
  },

  // Select department and team
  selectDepartment: (departmentId: DepartmentId) => {
    const dept = DEPARTMENTS[departmentId];
    const now = Date.now();

    set({
      department: departmentId,
      team: dept.team,
      teamJoinedAt: now,
    });

    // Check team achievement
    get().checkAchievements();
    get().syncToCloud().catch((err) => {
      console.error('[GameStore] Department selection sync failed:', err);
    });
  },

  // Select team directly (Colla vs Camba)
  selectTeam: (team: BattleTeam) => {
    const now = Date.now();

    console.log('[GameStore] Selecting team:', team);
    set({
      team,
      teamJoinedAt: now,
    });

    console.log('[GameStore] Team set successfully:', get().team);

    // Check team achievement
    get().checkAchievements();
    get().syncToCloud().catch((err) => {
      console.error('[GameStore] Team selection sync failed:', err);
    });
  },

  // Set detected region from IP/geolocation
  setDetectedRegion: (region: string) => {
    set({ detectedRegion: region });
  },

  // Check and update streak
  checkAndUpdateStreak: () => {
    const state = get();
    const today = getTodayDate();
    const yesterday = getYesterdayDate();

    if (state.lastPlayDate === null) {
      return; // No play history yet
    }

    if (state.lastPlayDate !== today && state.lastPlayDate !== yesterday) {
      // Streak is broken (more than 1 day since last play)
      set({ currentStreak: 0, streakBonusCollected: false });
    }
  },

  // Collect streak bonus
  collectStreakBonus: () => {
    const state = get();

    if (state.streakBonusCollected || state.currentStreak === 0) {
      return 0;
    }

    const bonus = state.currentStreak * STREAK_BONUS_PER_DAY;

    set({
      points: state.points + bonus,
      streakBonusCollected: true,
    });

    get().syncToCloud().catch((err) => {
      console.error('[GameStore] Streak bonus sync failed:', err);
    });
    return bonus;
  },

  // Set referrer
  setReferredBy: (code: string) => {
    const state = get();

    // Don't allow self-referral
    if (code === state.referralCode || state.referredBy) {
      return;
    }

    set({
      referredBy: code,
      points: state.points + REFERRAL_BONUS,
    });

    get().syncToCloud().catch((err) => {
      console.error('[GameStore] Referral sync failed:', err);
    });
  },

  // Add referral (when someone uses your code)
  addReferral: () => {
    const state = get();

    set({
      referralCount: state.referralCount + 1,
      referralEarnings: state.referralEarnings + REFERRAL_BONUS,
      points: state.points + REFERRAL_BONUS,
    });

    get().checkAchievements();
    get().syncToCloud().catch((err) => {
      console.error('[GameStore] Add referral sync failed:', err);
    });
  },

  // Check and unlock achievements
  checkAchievements: () => {
    const state = get();
    const newAchievements: AchievementId[] = [];

    // Tap achievements
    if (state.totalTaps >= 1 && !state.unlockedAchievements.includes('FIRST_TAP')) {
      newAchievements.push('FIRST_TAP');
    }
    if (state.totalTaps >= 100 && !state.unlockedAchievements.includes('TAP_100')) {
      newAchievements.push('TAP_100');
    }
    if (state.totalTaps >= 1000 && !state.unlockedAchievements.includes('TAP_1000')) {
      newAchievements.push('TAP_1000');
    }
    if (state.totalTaps >= 10000 && !state.unlockedAchievements.includes('TAP_10000')) {
      newAchievements.push('TAP_10000');
    }
    if (state.totalTaps >= 100000 && !state.unlockedAchievements.includes('TAP_100000')) {
      newAchievements.push('TAP_100000');
    }
    if (state.totalTaps >= 1000000 && !state.unlockedAchievements.includes('TAP_1000000')) {
      newAchievements.push('TAP_1000000');
    }

    // Level achievements
    if (state.level >= 5 && !state.unlockedAchievements.includes('LEVEL_5')) {
      newAchievements.push('LEVEL_5');
    }
    if (state.level >= 9 && !state.unlockedAchievements.includes('LEVEL_9')) {
      newAchievements.push('LEVEL_9');
    }

    // Streak achievements
    if (state.currentStreak >= 3 && !state.unlockedAchievements.includes('STREAK_3')) {
      newAchievements.push('STREAK_3');
    }
    if (state.currentStreak >= 7 && !state.unlockedAchievements.includes('STREAK_7')) {
      newAchievements.push('STREAK_7');
    }
    if (state.currentStreak >= 30 && !state.unlockedAchievements.includes('STREAK_30')) {
      newAchievements.push('STREAK_30');
    }

    // Team achievement
    if (state.team && !state.unlockedAchievements.includes('TEAM_JOINED')) {
      newAchievements.push('TEAM_JOINED');
    }

    // Referral achievements
    if (state.referralCount >= 1 && !state.unlockedAchievements.includes('REFERRAL_1')) {
      newAchievements.push('REFERRAL_1');
    }
    if (state.referralCount >= 5 && !state.unlockedAchievements.includes('REFERRAL_5')) {
      newAchievements.push('REFERRAL_5');
    }
    if (state.referralCount >= 10 && !state.unlockedAchievements.includes('REFERRAL_10')) {
      newAchievements.push('REFERRAL_10');
    }

    // Wallet achievement
    if (state.walletConnected && !state.unlockedAchievements.includes('WALLET_CONNECTED')) {
      newAchievements.push('WALLET_CONNECTED');
    }

    if (newAchievements.length > 0) {
      // Add achievement points
      let bonusPoints = 0;
      newAchievements.forEach(id => {
        bonusPoints += ACHIEVEMENTS[id].points;
      });

      set({
        unlockedAchievements: [...state.unlockedAchievements, ...newAchievements],
        pendingAchievements: [...state.pendingAchievements, ...newAchievements],
        points: state.points + bonusPoints,
      });
    }
  },

  // Clear pending achievements (after showing notification)
  clearPendingAchievements: () => {
    set({ pendingAchievements: [] });
  },

  // Set wallet connected
  setWalletConnected: (address: string | null) => {
    set({
      walletConnected: !!address,
      walletAddress: address,
    });

    if (address) {
      get().checkAchievements();
    }
    get().syncToCloud().catch((err) => {
      console.error('[GameStore] Wallet connection sync failed:', err);
    });
  },

  // Add points (for rewards, social tasks, etc.)
  addPoints: (amount: number) => {
    const state = get();
    set({ points: state.points + amount });
    get().syncToCloud().catch((err) => {
      console.error('[GameStore] Add points sync failed:', err);
    });
  },

  // Sync to CloudStorage with timeout
  syncToCloud: async () => {
    const state = get();

    if (!state.isCloudAvailable || !tgCloudStorage) {
      return false;
    }

    // Prevent concurrent syncs
    if (state.isSyncing) {
      return false;
    }

    try {
      set({ isSyncing: true });

      const data = {
        points: state.points,
        energy: state.energy,
        totalTaps: state.totalTaps,
        lastEnergyUpdate: state.lastEnergyUpdate,
        department: state.department,
        team: state.team,
        teamJoinedAt: state.teamJoinedAt,
        detectedRegion: state.detectedRegion,
        currentStreak: state.currentStreak,
        longestStreak: state.longestStreak,
        lastPlayDate: state.lastPlayDate,
        streakBonusCollected: state.streakBonusCollected,
        referralCode: state.referralCode,
        referredBy: state.referredBy,
        referralCount: state.referralCount,
        referralEarnings: state.referralEarnings,
        unlockedAchievements: state.unlockedAchievements,
        walletConnected: state.walletConnected,
        walletAddress: state.walletAddress,
        lastSyncedAt: Date.now(),
      };

      // 3 second timeout to prevent hanging
      await Promise.race([
        tgCloudStorage.setItem(STORAGE_KEY, JSON.stringify(data)),
        new Promise((_, reject) => setTimeout(() => reject(new Error('CloudStorage timeout')), 3000)),
      ]);

      set({ isSyncing: false, lastSyncedAt: Date.now() });
      return true;
    } catch (error) {
      console.warn('[GameStore] Sync error:', error);
      set({ isSyncing: false });
      return false;
    }
  },

  // Reset game
  reset: () => {
    set({
      points: 0,
      energy: INITIAL_MAX_ENERGY,
      maxEnergy: INITIAL_MAX_ENERGY,
      level: 1,
      totalTaps: 0,
      lastEnergyUpdate: Date.now(),
      department: null,
      team: null,
      teamJoinedAt: null,
      currentStreak: 0,
      longestStreak: 0,
      lastPlayDate: null,
      streakBonusCollected: false,
      referralCode: generateReferralCode(),
      referredBy: null,
      referralCount: 0,
      referralEarnings: 0,
      unlockedAchievements: [],
      pendingAchievements: [],
      walletConnected: false,
      walletAddress: null,
      lastSyncedAt: null,
      pendingTaps: 0,
    });

    const state = get();
    if (state.isCloudAvailable && tgCloudStorage) {
      tgCloudStorage.deleteItem(STORAGE_KEY).catch(console.error);
    }
  },

  // ==========================================================================
  // API SYNC ACTIONS
  // ==========================================================================

  // Sync state from server (after API call succeeds)
  syncFromServer: (serverState: ServerState) => {
    const state = get();

    // Smart sync: Only update points if:
    // 1. No pending taps (safe to sync)
    // 2. Server has MORE points (someone else made progress, or taps were processed)
    // Never overwrite local points with lower server value to prevent losing taps
    const hasPendingTaps = state.pendingTaps > 0;
    const serverHasMore = serverState.points > state.points;
    const shouldUpdatePoints = !hasPendingTaps && serverHasMore;

    // For points: use whichever is higher to prevent regressions
    const finalPoints = shouldUpdatePoints
      ? serverState.points
      : Math.max(state.points, serverState.points);

    set({
      points: finalPoints,
      energy: serverState.energy,
      maxEnergy: serverState.maxEnergy,
      level: serverState.level,
      totalTaps: serverState.totalTaps ?? state.totalTaps,
    });

    console.log('[GameStore] Synced from server:', {
      server: serverState.points,
      local: state.points,
      final: finalPoints,
      pendingTaps: state.pendingTaps,
      strategy: hasPendingTaps ? 'kept-local' : serverHasMore ? 'used-server' : 'used-max',
    });
  },

  // Clear pending taps after successful API sync
  clearPendingTaps: () => {
    set({ pendingTaps: 0 });
  },

  // Update online status
  setOnlineStatus: (online: boolean) => {
    set({ isOnline: online });
    console.log('[GameStore] Online status:', online);
  },

  // Get current state for API sync
  getStateForSync: () => {
    const state = get();
    return {
      points: state.points,
      energy: state.energy,
      totalTaps: state.totalTaps,
      level: state.level,
      department: state.department,
      team: state.team,
      currentStreak: state.currentStreak,
      lastPlayDate: state.lastPlayDate,
    };
  },
}));

// Auto-recharge hook with proper cleanup
export function useEnergyRecharge() {
  const rechargeEnergy = useGameStore((s) => s.rechargeEnergy);
  const { useEffect } = require('react');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initial recharge
    rechargeEnergy();

    // Set up interval with cleanup
    const intervalId = setInterval(rechargeEnergy, 60000);

    return () => {
      clearInterval(intervalId);
    };
  }, [rechargeEnergy]);
}
