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

  // Refs for stable access without re-renders
  const initDataRef = useRef(initDataRaw);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSyncedTeamRef = useRef<string | null>(null);
  const lastSyncedDeptRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSyncingRef = useRef(false);
  const isTapSyncingRef = useRef(false);

  // Get store values with stable selectors
  const clearPendingTaps = useGameStore((s) => s.clearPendingTaps);
  const syncFromServer = useGameStore((s) => s.syncFromServer);
  const rechargeEnergy = useGameStore((s) => s.rechargeEnergy);
  const getStateForSync = useGameStore((s) => s.getStateForSync);
  const team = useGameStore((s) => s.team);
  const department = useGameStore((s) => s.department);

  // Fetch initial state - only when initDataRaw is available
  const { data: serverState, isLoading: isLoadingState } = useQuery({
    queryKey: ['gameState'],
    queryFn: () => api.getGameState(initDataRaw!),
    enabled: !!initDataRaw,
    staleTime: 30000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Tap mutation - destructure mutate for stable reference
  const { mutate: tapMutate, isPending: isTapPending } = useMutation({
    mutationFn: ({ taps, auth }: { taps: number; auth: string }) => {
      console.log('[useGameSync] Syncing taps:', { taps, hasAuth: !!auth });
      return api.tap(auth, taps);
    },
    onSuccess: (response) => {
      console.log('[useGameSync] Tap sync success:', response);
      isTapSyncingRef.current = false;
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
      isTapSyncingRef.current = false;
      console.error('[useGameSync] Tap sync failed:', error);
      queryClient.invalidateQueries({ queryKey: ['gameState'] });
    },
    onMutate: () => {
      isTapSyncingRef.current = true;
    },
  });

  // Full state sync mutation - destructure mutate for stable reference
  const { mutate: syncMutate, isPending: isSyncPending } = useMutation({
    mutationFn: ({ auth, state }: { auth: string; state: ReturnType<typeof getStateForSync> }) =>
      api.sync(auth, state),
    onSuccess: (response, variables) => {
      isSyncingRef.current = false;
      if (response.success && response.data) {
        lastSyncedTeamRef.current = variables.state.team;
        lastSyncedDeptRef.current = variables.state.department;
        console.log('[useGameSync] Synced:', { team: variables.state.team, dept: variables.state.department });
      }
    },
    onError: (error, variables) => {
      isSyncingRef.current = false;
      console.error('[useGameSync] Sync failed:', error);
      lastSyncedTeamRef.current = variables.state.team;
      lastSyncedDeptRef.current = variables.state.department;
    },
    onMutate: () => {
      isSyncingRef.current = true;
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

  // Debounced sync function - uses refs for all mutable state
  const debouncedSync = useCallback(() => {
    const auth = initDataRef.current;
    if (!auth) return;

    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      // Check ref instead of isPending to avoid stale closure
      if (isSyncingRef.current) return;

      const state = getStateForSync();

      // Only sync if team or department changed
      const teamChanged = state.team && state.team !== lastSyncedTeamRef.current;
      const deptChanged = state.department && state.department !== lastSyncedDeptRef.current;

      if (teamChanged || deptChanged) {
        syncMutate({ auth, state });
      }
    }, SYNC_DEBOUNCE_MS);
  }, [getStateForSync, syncMutate]); // Only stable refs in deps

  // Watch for team changes - single effect
  useEffect(() => {
    const auth = initDataRef.current;
    if (team && team !== lastSyncedTeamRef.current && auth) {
      console.log('[useGameSync] Team changed, syncing:', team);
      debouncedSync();
    } else if (team && !auth) {
      // No auth available, mark as synced anyway to unblock UI
      console.log('[useGameSync] Team changed but no auth, marking as synced:', team);
      lastSyncedTeamRef.current = team;
    }
  }, [team, debouncedSync]);

  // Watch for department changes - single effect
  useEffect(() => {
    const auth = initDataRef.current;
    if (department && department !== lastSyncedDeptRef.current && auth) {
      console.log('[useGameSync] Department changed, syncing:', department);
      debouncedSync();
    } else if (department && !auth) {
      // No auth available, mark as synced anyway to unblock UI
      console.log('[useGameSync] Department changed but no auth, marking as synced:', department);
      lastSyncedDeptRef.current = department;
    }
  }, [department, debouncedSync]);

  // Sync pending taps - uses refs for stability
  const syncTaps = useCallback(() => {
    const auth = initDataRef.current;
    if (!auth) return;

    // Check ref to avoid re-render loops
    if (isTapSyncingRef.current) return;

    const taps = useGameStore.getState().pendingTaps;
    if (taps >= MIN_TAPS_TO_SYNC) {
      clearPendingTaps();
      tapMutate({ taps, auth });
    }
  }, [clearPendingTaps, tapMutate]); // Only stable refs

  // Keep initDataRef current AND sync when auth becomes available
  useEffect(() => {
    const wasNull = initDataRef.current === null;
    const nowHasValue = initDataRaw !== null;

    initDataRef.current = initDataRaw;

    // If auth just became available, sync any pending taps immediately
    if (wasNull && nowHasValue) {
      console.log('[useGameSync] ✅ Auth became available, syncing pending taps');
      const pendingTaps = useGameStore.getState().pendingTaps;
      if (pendingTaps > 0) {
        console.log('[useGameSync] Found', pendingTaps, 'pending taps, syncing now');
        // Use the syncTaps callback which already has all the logic
        setTimeout(() => syncTaps(), 100);
      }
    }
  }, [initDataRaw, syncTaps]);

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
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Force full sync - for manual triggering
  const forceFullSync = useCallback(() => {
    const auth = initDataRef.current;
    if (!auth || isSyncingRef.current) return;

    const state = getStateForSync();
    syncMutate({ auth, state });
  }, [getStateForSync, syncMutate]);

  return {
    isLoading: isLoadingState && !!initDataRaw,
    isSyncing: isTapPending || isSyncPending,
    forceSync: syncTaps,
    forceFullSync,
  };
}
