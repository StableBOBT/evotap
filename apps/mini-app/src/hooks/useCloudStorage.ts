import { useCallback, useEffect, useState, useRef } from 'react';
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

/**
 * Safely parse JSON with validation
 */
function parseGameData(json: string): GameData | null {
  try {
    const parsed = JSON.parse(json);
    // Validate required fields exist and have correct types
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof parsed.points !== 'number' ||
      typeof parsed.energy !== 'number' ||
      typeof parsed.maxEnergy !== 'number' ||
      typeof parsed.level !== 'number' ||
      typeof parsed.lastEnergyUpdate !== 'number' ||
      typeof parsed.totalTaps !== 'number' ||
      typeof parsed.lastSyncedAt !== 'number'
    ) {
      console.warn('[CloudStorage] Invalid game data structure');
      return null;
    }
    return parsed as GameData;
  } catch (error) {
    console.error('[CloudStorage] JSON parse error:', error);
    return null;
  }
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
        const parsed = parseGameData(stored);
        if (parsed) {
          setGameData(parsed);
          setLastSyncedAt(new Date(parsed.lastSyncedAt));
          console.log('[CloudStorage] Loaded:', parsed);
          return parsed;
        }
        // Invalid data, use defaults
        console.warn('[CloudStorage] Corrupted data, using defaults');
        await cloudStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_GAME_DATA));
        setGameData(DEFAULT_GAME_DATA);
        setLastSyncedAt(new Date());
        return DEFAULT_GAME_DATA;
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

  // Load game data on mount - only once
  useEffect(() => {
    loadGameData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Fix: Only run on mount, loadGameData is stable with useCallback

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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingDataRef = useRef<Partial<GameData> | null>(null);
  const { saveGameData, isSyncing } = useCloudStorage();
  const saveGameDataRef = useRef(saveGameData);

  // Keep refs up to date
  useEffect(() => {
    pendingDataRef.current = pendingData;
  }, [pendingData]);

  useEffect(() => {
    saveGameDataRef.current = saveGameData;
  }, [saveGameData]);

  const queueSave = useCallback(
    (data: Partial<GameData>) => {
      // Merge with pending data
      setPendingData((prev) => {
        const merged = { ...prev, ...data };
        pendingDataRef.current = merged;
        return merged;
      });

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(async () => {
        const currentPending = pendingDataRef.current;
        if (currentPending) {
          await saveGameDataRef.current(currentPending);
          setPendingData(null);
          pendingDataRef.current = null;
        }
      }, delayMs);
    },
    [delayMs]
  );

  // Flush on unmount and beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Use localStorage as synchronous fallback for pending saves
      const currentPending = pendingDataRef.current;
      if (currentPending) {
        try {
          localStorage.setItem('evo_pending_save', JSON.stringify(currentPending));
          console.log('[CloudStorage] Saved pending data to localStorage on beforeunload');
        } catch (error) {
          console.error('[CloudStorage] Failed to save to localStorage:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Best-effort synchronous save attempt
      const currentPending = pendingDataRef.current;
      if (currentPending) {
        // Try localStorage as fallback since async won't complete
        try {
          localStorage.setItem('evo_pending_save', JSON.stringify(currentPending));
          console.log('[CloudStorage] Saved pending data to localStorage on unmount');
        } catch (error) {
          console.error('[CloudStorage] Failed to save pending data:', error);
        }
      }
    };
  }, []);

  return {
    queueSave,
    hasPendingChanges: pendingData !== null,
    isSyncing,
  };
}
