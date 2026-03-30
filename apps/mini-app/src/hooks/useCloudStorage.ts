import { useCallback, useEffect, useState } from 'react';
import { cloudStorage } from '@telegram-apps/sdk-react';

interface GameData {
  points: number;
  energy: number;
  maxEnergy: number;
  level: number;
  lastEnergyUpdate: number;
  totalTaps: number;
  lastSyncedAt: number;
}

interface UseCloudStorageReturn {
  // Data
  gameData: GameData | null;
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  isAvailable: boolean;

  // Actions
  saveGameData: (data: Partial<GameData>) => Promise<boolean>;
  loadGameData: () => Promise<GameData | null>;
  clearGameData: () => Promise<boolean>;
}

const STORAGE_KEY = 'evo_game_v1';

const DEFAULT_GAME_DATA: GameData = {
  points: 0,
  energy: 1000,
  maxEnergy: 1000,
  level: 1,
  lastEnergyUpdate: Date.now(),
  totalTaps: 0,
  lastSyncedAt: Date.now(),
};

export function useCloudStorage(): UseCloudStorageReturn {
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  // Check if CloudStorage is available
  const isAvailable = cloudStorage.setItem.isAvailable();

  // Load game data on mount
  useEffect(() => {
    loadGameData();
  }, []);

  const loadGameData = useCallback(async (): Promise<GameData | null> => {
    if (!isAvailable) {
      console.log('[CloudStorage] Not available, using defaults');
      setGameData(DEFAULT_GAME_DATA);
      setIsLoading(false);
      return DEFAULT_GAME_DATA;
    }

    try {
      setIsLoading(true);
      const stored = await cloudStorage.getItem(STORAGE_KEY);

      if (stored) {
        const parsed = JSON.parse(stored) as GameData;
        setGameData(parsed);
        setLastSyncedAt(new Date(parsed.lastSyncedAt));
        console.log('[CloudStorage] Loaded:', parsed);
        return parsed;
      } else {
        // First time user - save defaults
        await cloudStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_GAME_DATA));
        setGameData(DEFAULT_GAME_DATA);
        setLastSyncedAt(new Date());
        console.log('[CloudStorage] Initialized with defaults');
        return DEFAULT_GAME_DATA;
      }
    } catch (error) {
      console.error('[CloudStorage] Load error:', error);
      setGameData(DEFAULT_GAME_DATA);
      return DEFAULT_GAME_DATA;
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable]);

  const saveGameData = useCallback(
    async (data: Partial<GameData>): Promise<boolean> => {
      if (!isAvailable) {
        console.log('[CloudStorage] Not available, save skipped');
        return false;
      }

      try {
        setIsSyncing(true);
        const now = Date.now();
        const newData: GameData = {
          ...DEFAULT_GAME_DATA,
          ...gameData,
          ...data,
          lastSyncedAt: now,
        };

        await cloudStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
        setGameData(newData);
        setLastSyncedAt(new Date(now));
        console.log('[CloudStorage] Saved:', newData);
        return true;
      } catch (error) {
        console.error('[CloudStorage] Save error:', error);
        return false;
      } finally {
        setIsSyncing(false);
      }
    },
    [isAvailable, gameData]
  );

  const clearGameData = useCallback(async (): Promise<boolean> => {
    if (!isAvailable) {
      return false;
    }

    try {
      await cloudStorage.deleteItem(STORAGE_KEY);
      setGameData(DEFAULT_GAME_DATA);
      setLastSyncedAt(null);
      console.log('[CloudStorage] Cleared');
      return true;
    } catch (error) {
      console.error('[CloudStorage] Clear error:', error);
      return false;
    }
  }, [isAvailable]);

  return {
    gameData,
    isLoading,
    isSyncing,
    lastSyncedAt,
    isAvailable,
    saveGameData,
    loadGameData,
    clearGameData,
  };
}

// Debounced save hook for high-frequency updates (tapping)
export function useDebouncedCloudSave(delayMs: number = 2000) {
  const [pendingData, setPendingData] = useState<Partial<GameData> | null>(null);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const { saveGameData, isSyncing } = useCloudStorage();

  const queueSave = useCallback(
    (data: Partial<GameData>) => {
      // Merge with pending data
      setPendingData((prev) => ({ ...prev, ...data }));

      // Clear existing timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Set new timeout
      const newTimeoutId = setTimeout(async () => {
        if (pendingData) {
          await saveGameData({ ...pendingData, ...data });
          setPendingData(null);
        }
      }, delayMs);

      setTimeoutId(newTimeoutId);
    },
    [timeoutId, pendingData, saveGameData, delayMs]
  );

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (pendingData) {
        saveGameData(pendingData);
      }
    };
  }, []);

  return {
    queueSave,
    hasPendingChanges: pendingData !== null,
    isSyncing,
  };
}
