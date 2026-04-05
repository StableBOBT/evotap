import { useEffect, useRef, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useGameStore } from '../stores/gameStore';
import { api } from '../services/api';
import { useTMA } from './useTMA';

const SYNC_INTERVAL = 5000;
const MIN_TAPS_TO_SYNC = 1;
const SYNC_DEBOUNCE_MS = 300;

export function useGameSync() {
  const queryClient = useQueryClient();
  const { initDataRaw } = useTMA();
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSyncedTeamRef = useRef<string | null>(null);
  const lastSyncedDeptRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get store values
  const pendingTaps = useGameStore((s) => s.pendingTaps);
  const clearPendingTaps = useGameStore((s) => s.clearPendingTaps);
  const syncFromServer = useGameStore((s) => s.syncFromServer);
  const rechargeEnergy = useGameStore((s) => s.rechargeEnergy);
  const getStateForSync = useGameStore((s) => s.getStateForSync);
  const team = useGameStore((s) => s.team);
  const department = useGameStore((s) => s.department);

  // Fetch initial state - only when initDataRaw is available
  const { data: serverState } = useQuery({
    queryKey: ['gameState'],
    queryFn: () => api.getGameState(initDataRaw!),
    enabled: !!initDataRaw,
    staleTime: 30000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Tap mutation - stable reference
  const tapMutation = useMutation({
    mutationFn: ({ taps, auth }: { taps: number; auth: string }) =>
      api.tap(auth, taps),
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
      console.error('[useGameSync] Tap sync failed:', error);
      queryClient.invalidateQueries({ queryKey: ['gameState'] });
    },
  });

  // Full state sync mutation - stable reference
  const syncMutation = useMutation({
    mutationFn: ({ auth, state }: { auth: string; state: ReturnType<typeof getStateForSync> }) =>
      api.sync(auth, state),
    onSuccess: (response, variables) => {
      if (response.success && response.data) {
        // Update refs with values from the mutation variables (not stale closure)
        lastSyncedTeamRef.current = variables.state.team;
        lastSyncedDeptRef.current = variables.state.department;
        console.log('[useGameSync] Synced:', { team: variables.state.team, dept: variables.state.department });
      }
    },
    onError: (error, variables) => {
      console.error('[useGameSync] Sync failed:', error);
      // Still update refs to prevent infinite retry
      lastSyncedTeamRef.current = variables.state.team;
      lastSyncedDeptRef.current = variables.state.department;
    },
  });

  // Sync initial server state
  useEffect(() => {
    if (serverState?.success && serverState.data) {
      syncFromServer({
        points: serverState.data.points,
        energy: serverState.data.energy,
        maxEnergy: serverState.data.maxEnergy,
        level: serverState.data.level,
      });
    }
  }, [serverState, syncFromServer]);

  // Debounced sync function - triggers on team/department changes
  const debouncedSync = useCallback(() => {
    if (!initDataRaw) return;

    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (syncMutation.isPending) return;

      const state = getStateForSync();

      // Only sync if team or department changed
      const teamChanged = state.team && state.team !== lastSyncedTeamRef.current;
      const deptChanged = state.department && state.department !== lastSyncedDeptRef.current;

      if (teamChanged || deptChanged) {
        syncMutation.mutate({ auth: initDataRaw, state });
      }
    }, SYNC_DEBOUNCE_MS);
  }, [initDataRaw, getStateForSync, syncMutation.isPending]);

  // Watch for team changes
  useEffect(() => {
    if (team && team !== lastSyncedTeamRef.current) {
      debouncedSync();
    }
  }, [team, debouncedSync]);

  // Watch for department changes
  useEffect(() => {
    if (department && department !== lastSyncedDeptRef.current) {
      debouncedSync();
    }
  }, [department, debouncedSync]);

  // Sync pending taps
  const syncTaps = useCallback(() => {
    if (!initDataRaw || tapMutation.isPending) return;

    const taps = pendingTaps;
    if (taps >= MIN_TAPS_TO_SYNC) {
      clearPendingTaps();
      tapMutation.mutate({ taps, auth: initDataRaw });
    }
  }, [initDataRaw, pendingTaps, clearPendingTaps, tapMutation.isPending]);

  // Periodic sync interval - setup once
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      syncTaps();
      rechargeEnergy();
    }, SYNC_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [syncTaps, rechargeEnergy]);

  // Sync on visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        rechargeEnergy();
        queryClient.invalidateQueries({ queryKey: ['gameState'] });
      } else {
        syncTaps();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [syncTaps, rechargeEnergy, queryClient]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Force full sync - for manual triggering
  const forceFullSync = useCallback(() => {
    if (!initDataRaw || syncMutation.isPending) return;

    const state = getStateForSync();
    syncMutation.mutate({ auth: initDataRaw, state });
  }, [initDataRaw, getStateForSync, syncMutation.isPending]);

  return {
    isLoading: false,
    isSyncing: tapMutation.isPending || syncMutation.isPending,
    forceSync: syncTaps,
    forceFullSync,
  };
}
