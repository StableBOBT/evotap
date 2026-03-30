import { useEffect, useRef, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useGameStore } from '../stores/gameStore';
import { api } from '../services/api';
import { useTMA } from './useTMA';

const SYNC_INTERVAL = 5000; // Sync every 5 seconds
const MIN_TAPS_TO_SYNC = 1;

export function useGameSync() {
  const queryClient = useQueryClient();
  const { initDataRaw } = useTMA();
  const syncTimeoutRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSyncedTeamRef = useRef<string | null>(null);

  const {
    pendingTaps,
    clearPendingTaps,
    syncFromServer,
    rechargeEnergy,
    points,
    energy,
    totalTaps,
    level,
    team,
    department,
    currentStreak,
    lastPlayDate,
  } = useGameStore();

  // Fetch initial state
  const { data: serverState, isLoading } = useQuery({
    queryKey: ['gameState'],
    queryFn: () => api.getGameState(initDataRaw!),
    enabled: !!initDataRaw,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  // Sync on mount - get server state and sync local team if exists
  useEffect(() => {
    if (serverState?.success && serverState.data) {
      syncFromServer({
        points: serverState.data.points,
        energy: serverState.data.energy,
        maxEnergy: serverState.data.maxEnergy,
        level: serverState.data.level,
      });

      // If we have a local team but server doesn't, sync it
      if (team && !serverState.data.team) {
        console.log('[useGameSync] Local team exists but not on server, syncing:', team);
        setTimeout(() => syncMutation.mutate(), 500);
      }
    }
  }, [serverState, syncFromServer]); // eslint-disable-line react-hooks/exhaustive-deps

  // Full state sync mutation (includes team/department/streaks)
  const syncMutation = useMutation({
    mutationFn: () => api.sync(initDataRaw!, {
      points,
      energy,
      totalTaps,
      level,
      team,
      department,
      currentStreak,
      lastPlayDate,
    }),
    onSuccess: (response) => {
      if (response.success && response.data) {
        console.log('[useGameSync] Full state synced to backend', {
          team,
          department,
          streakDays: response.data.streakDays,
        });
        lastSyncedTeamRef.current = team;
      }
    },
    onError: (error) => {
      console.error('[useGameSync] Full sync failed:', error);
    },
  });

  // Tap mutation with optimistic update
  const tapMutation = useMutation({
    mutationFn: (taps: number) => api.tap(initDataRaw!, taps),
    onSuccess: (response) => {
      if (response.success && response.data) {
        syncFromServer({
          points: response.data.score,
          energy: response.data.energy,
          maxEnergy: response.data.maxEnergy ?? 1000,
          level: response.data.level,
        });
      }
    },
    onError: (error) => {
      console.error('Tap sync failed:', error);
      // Revert optimistic update if needed
      queryClient.invalidateQueries({ queryKey: ['gameState'] });
    },
  });

  // Sync team to backend when it changes
  useEffect(() => {
    if (team && team !== lastSyncedTeamRef.current && initDataRaw) {
      console.log('[useGameSync] Team changed, syncing to backend:', team);
      // Small delay to ensure state is updated
      const timeout = setTimeout(() => {
        syncMutation.mutate();
      }, 200);
      return () => clearTimeout(timeout);
    }
  }, [team, initDataRaw]); // eslint-disable-line react-hooks/exhaustive-deps

  // Also sync when department changes
  useEffect(() => {
    if (department && initDataRaw && team) {
      console.log('[useGameSync] Department set, syncing to backend:', department);
      const timeout = setTimeout(() => {
        syncMutation.mutate();
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [department, initDataRaw]); // eslint-disable-line react-hooks/exhaustive-deps

  // Periodic sync
  const syncTaps = useCallback(() => {
    if (pendingTaps >= MIN_TAPS_TO_SYNC && initDataRaw && !tapMutation.isPending) {
      const tapsToSync = pendingTaps;
      clearPendingTaps();
      tapMutation.mutate(tapsToSync);
    }
  }, [pendingTaps, initDataRaw, tapMutation, clearPendingTaps]);

  // Set up periodic sync
  useEffect(() => {
    syncTimeoutRef.current = setInterval(() => {
      syncTaps();
      rechargeEnergy();
    }, SYNC_INTERVAL);

    return () => {
      if (syncTimeoutRef.current) {
        clearInterval(syncTimeoutRef.current);
      }
    };
  }, [syncTaps, rechargeEnergy]);

  // Sync on visibility change (when app becomes visible)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        rechargeEnergy();
        queryClient.invalidateQueries({ queryKey: ['gameState'] });
      } else {
        // Sync before hiding
        syncTaps();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [syncTaps, rechargeEnergy, queryClient]);

  // Sync on unmount
  useEffect(() => {
    return () => {
      syncTaps();
    };
  }, [syncTaps]);

  // Force full sync (useful when team changes)
  const forceFullSync = useCallback(() => {
    if (initDataRaw && !syncMutation.isPending) {
      syncMutation.mutate();
    }
  }, [initDataRaw, syncMutation]);

  return {
    isLoading,
    isSyncing: tapMutation.isPending || syncMutation.isPending,
    forceSync: syncTaps,
    forceFullSync,
  };
}
