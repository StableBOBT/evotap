import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, isOnline, SyncRequest, LeaderboardResponse, TeamLeaderboardResponse, ReferralClaimResponse } from '../services/api';
import { useTMA } from './useTMA';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const queryKeys = {
  leaderboard: (period: string) => ['leaderboard', period] as const,
  teamLeaderboard: (team: string) => ['leaderboard', 'team', team] as const,
  gameState: ['gameState'] as const,
  referralStats: ['referralStats'] as const,
  user: ['user'] as const,
};

// =============================================================================
// LEADERBOARD HOOKS
// =============================================================================

type Period = 'daily' | 'weekly' | 'global';

interface UseLeaderboardOptions {
  enabled?: boolean;
  limit?: number;
  refetchInterval?: number | false;
}

export function useLeaderboard(
  period: Period = 'global',
  options: UseLeaderboardOptions = {}
) {
  const { initDataRaw } = useTMA();
  const { enabled = true, limit = 100, refetchInterval = false } = options;

  return useQuery({
    queryKey: queryKeys.leaderboard(period),
    queryFn: async () => {
      if (!initDataRaw) {
        throw new Error('Not authenticated');
      }
      const response = await api.getLeaderboard(initDataRaw, period, limit);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch leaderboard');
      }
      return response.data as LeaderboardResponse;
    },
    enabled: enabled && !!initDataRaw && isOnline(),
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval,
    retry: (failureCount, error) => {
      // Don't retry auth errors
      if (error instanceof Error && error.message.includes('auth')) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

type TeamType = 'colla' | 'camba';

interface UseTeamLeaderboardOptions {
  enabled?: boolean;
  limit?: number;
}

export function useTeamLeaderboard(
  team: TeamType,
  options: UseTeamLeaderboardOptions = {}
) {
  const { initDataRaw } = useTMA();
  const { enabled = true, limit = 100 } = options;

  return useQuery({
    queryKey: queryKeys.teamLeaderboard(team),
    queryFn: async () => {
      if (!initDataRaw) {
        throw new Error('Not authenticated');
      }
      const response = await api.getTeamLeaderboard(initDataRaw, team, limit);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch team leaderboard');
      }
      return response.data as TeamLeaderboardResponse;
    },
    enabled: enabled && !!initDataRaw && isOnline(),
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
  });
}

// =============================================================================
// GAME SYNC HOOKS
// =============================================================================

interface UseSyncGameOptions {
  onSuccess?: (data: { synced: boolean }) => void;
  onError?: (error: Error) => void;
}

export function useSyncGame(options: UseSyncGameOptions = {}) {
  const { initDataRaw } = useTMA();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (state: SyncRequest) => {
      if (!initDataRaw) {
        throw new Error('Not authenticated');
      }
      if (!isOnline()) {
        throw new Error('Offline - will sync when online');
      }
      const response = await api.sync(initDataRaw, state);
      if (!response.success) {
        throw new Error(response.error || 'Failed to sync game state');
      }
      return response.data!;
    },
    onSuccess: (data) => {
      // Invalidate game state to reflect server values
      queryClient.invalidateQueries({ queryKey: queryKeys.gameState });
      options.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useSyncGame] Sync failed:', error);
      options.onError?.(error as Error);
    },
    // Don't retry mutations automatically
    retry: false,
  });
}

// =============================================================================
// REFERRAL HOOKS
// =============================================================================

interface UseClaimReferralOptions {
  onSuccess?: (data: ReferralClaimResponse) => void;
  onError?: (error: Error) => void;
}

export function useClaimReferral(options: UseClaimReferralOptions = {}) {
  const { initDataRaw } = useTMA();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (referrerCode: string) => {
      if (!initDataRaw) {
        throw new Error('Not authenticated');
      }
      if (!isOnline()) {
        throw new Error('Offline - cannot claim referral');
      }
      const response = await api.claimReferral(initDataRaw, referrerCode);
      if (!response.success) {
        throw new Error(response.error || 'Failed to claim referral');
      }
      return response.data as ReferralClaimResponse;
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.gameState });
      queryClient.invalidateQueries({ queryKey: queryKeys.referralStats });
      options.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useClaimReferral] Failed:', error);
      options.onError?.(error as Error);
    },
    retry: false,
  });
}

export function useReferralStats() {
  const { initDataRaw } = useTMA();

  return useQuery({
    queryKey: queryKeys.referralStats,
    queryFn: async () => {
      if (!initDataRaw) {
        throw new Error('Not authenticated');
      }
      const response = await api.getReferralStats(initDataRaw);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch referral stats');
      }
      return response.data!;
    },
    enabled: !!initDataRaw && isOnline(),
    staleTime: 60000, // 1 minute
    gcTime: 5 * 60 * 1000,
  });
}

// =============================================================================
// USER HOOKS
// =============================================================================

export function useUser() {
  const { initDataRaw } = useTMA();

  return useQuery({
    queryKey: queryKeys.user,
    queryFn: async () => {
      if (!initDataRaw) {
        throw new Error('Not authenticated');
      }
      const response = await api.getUser(initDataRaw);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch user');
      }
      return response.data!;
    },
    enabled: !!initDataRaw && isOnline(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });
}

// =============================================================================
// TAP MUTATION
// =============================================================================

interface UseTapOptions {
  onSuccess?: (data: { score: number; leveledUp: boolean }) => void;
  onError?: (error: Error) => void;
}

export function useTap(options: UseTapOptions = {}) {
  const { initDataRaw } = useTMA();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taps: number) => {
      if (!initDataRaw) {
        throw new Error('Not authenticated');
      }
      const response = await api.tap(initDataRaw, taps);
      if (!response.success) {
        throw new Error(response.error || 'Tap failed');
      }
      return response.data!;
    },
    onSuccess: (data) => {
      // Optionally invalidate game state
      queryClient.setQueryData(queryKeys.gameState, (old: unknown) => {
        if (!old) return old;
        return {
          ...(old as object),
          points: data.score,
          energy: data.energy,
          level: data.level,
        };
      });
      options.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('[useTap] Failed:', error);
      options.onError?.(error as Error);
    },
    retry: false,
  });
}

// =============================================================================
// PREFETCH HELPERS
// =============================================================================

export function usePrefetchLeaderboard() {
  const { initDataRaw } = useTMA();
  const queryClient = useQueryClient();

  return async (period: Period = 'global') => {
    if (!initDataRaw || !isOnline()) return;

    await queryClient.prefetchQuery({
      queryKey: queryKeys.leaderboard(period),
      queryFn: async () => {
        const response = await api.getLeaderboard(initDataRaw, period);
        if (!response.success) throw new Error(response.error);
        return response.data;
      },
      staleTime: 30000,
    });
  };
}
