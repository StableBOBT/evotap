import { useState } from 'react';
import { useLeaderboard, useTeamLeaderboard } from '../hooks/useApi';
import { useGameStore } from '../stores/gameStore';
import { isOnline } from '../services/api';

type Period = 'daily' | 'weekly' | 'global';
type ViewMode = 'global' | 'team';

const periods: { id: Period; label: string }[] = [
  { id: 'daily', label: 'Hoy' },
  { id: 'weekly', label: 'Semana' },
  { id: 'global', label: 'Total' },
];

export function LeaderboardPage() {
  const [period, setPeriod] = useState<Period>('global');
  const [viewMode, setViewMode] = useState<ViewMode>('global');
  const team = useGameStore((s) => s.team);

  // Fetch global leaderboard
  const {
    data: leaderboardData,
    isLoading: isLoadingGlobal,
    error: errorGlobal,
    refetch: refetchGlobal,
  } = useLeaderboard(period, {
    enabled: viewMode === 'global',
    refetchInterval: 30000, // Auto-refresh every 30s
  });

  // Fetch team leaderboard (only if user has a team)
  const {
    data: teamData,
    isLoading: isLoadingTeam,
    error: errorTeam,
    refetch: refetchTeam,
  } = useTeamLeaderboard(team === 'colla' ? 'colla' : 'camba', {
    enabled: viewMode === 'team' && team !== null && team !== 'neutral',
  });

  const isLoading = viewMode === 'global' ? isLoadingGlobal : isLoadingTeam;
  const error = viewMode === 'global' ? errorGlobal : errorTeam;
  const refetch = viewMode === 'global' ? refetchGlobal : refetchTeam;

  const leaderboard = viewMode === 'global'
    ? leaderboardData?.entries
    : teamData?.entries;

  const userRank = viewMode === 'global'
    ? leaderboardData?.userRank
    : teamData?.userRank;

  const getMedal = (rank: number) => {
    if (rank === 1) return '1';
    if (rank === 2) return '2';
    if (rank === 3) return '3';
    return `#${rank}`;
  };

  const getMedalStyle = (rank: number) => {
    if (rank === 1) return 'bg-yellow-500 text-yellow-900';
    if (rank === 2) return 'bg-gray-300 text-gray-700';
    if (rank === 3) return 'bg-amber-600 text-amber-100';
    return 'bg-tg-secondary-bg text-tg-hint';
  };

  const handleRefresh = () => {
    if (isOnline()) {
      refetch();
    }
  };

  return (
    <div className="flex flex-col flex-1 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-tg-text">Ranking</h1>
        <button
          onClick={handleRefresh}
          disabled={isLoading || !isOnline()}
          className="p-2 rounded-full bg-tg-secondary-bg hover:bg-tg-button/20 disabled:opacity-50 transition-colors"
          aria-label="Actualizar"
        >
          <RefreshIcon className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* View mode toggle (global vs team) */}
      {team && team !== 'neutral' && (
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setViewMode('global')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'global'
                ? 'bg-tg-button text-tg-button-text'
                : 'bg-tg-secondary-bg text-tg-hint hover:text-tg-text'
            }`}
          >
            Global
          </button>
          <button
            onClick={() => setViewMode('team')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'team'
                ? 'bg-tg-button text-tg-button-text'
                : 'bg-tg-secondary-bg text-tg-hint hover:text-tg-text'
            }`}
          >
            Mi Equipo ({team === 'colla' ? 'Colla' : 'Camba'})
          </button>
        </div>
      )}

      {/* Period tabs (only for global view) */}
      {viewMode === 'global' && (
        <div className="flex gap-2 mb-4">
          {periods.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`
                px-4 py-2 rounded-full text-sm font-medium
                transition-colors duration-200
                ${
                  period === p.id
                    ? 'bg-tg-button text-tg-button-text'
                    : 'bg-tg-secondary-bg text-tg-hint hover:text-tg-text'
                }
              `}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Team stats (for team view) */}
      {viewMode === 'team' && teamData?.teamStats && (
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-4">
          <div className="bg-tg-secondary-bg rounded-lg p-2 sm:p-3 text-center">
            <p className="text-[10px] sm:text-xs text-tg-hint">Jugadores</p>
            <p className="text-sm sm:text-lg font-bold text-tg-text">
              {teamData.teamStats.totalPlayers.toLocaleString()}
            </p>
          </div>
          <div className="bg-tg-secondary-bg rounded-lg p-2 sm:p-3 text-center">
            <p className="text-[10px] sm:text-xs text-tg-hint">Puntos</p>
            <p className="text-sm sm:text-lg font-bold text-tg-text">
              {teamData.teamStats.totalPoints.toLocaleString()}
            </p>
          </div>
          <div className="bg-tg-secondary-bg rounded-lg p-2 sm:p-3 text-center">
            <p className="text-[10px] sm:text-xs text-tg-hint">Nivel</p>
            <p className="text-sm sm:text-lg font-bold text-tg-text">
              {teamData.teamStats.averageLevel.toFixed(1)}
            </p>
          </div>
        </div>
      )}

      {/* User rank */}
      {userRank && (
        <div className="bg-tg-button/20 border border-tg-button/50 rounded-lg p-4 mb-4">
          <p className="text-sm text-tg-hint">Tu Posicion</p>
          <p className="text-2xl font-bold text-tg-text">
            #{userRank}
          </p>
        </div>
      )}

      {/* Offline banner */}
      {!isOnline() && (
        <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 mb-4">
          <p className="text-sm text-yellow-200 text-center">
            Sin conexion - mostrando datos en cache
          </p>
        </div>
      )}

      {/* Leaderboard list */}
      <div className="flex-1 overflow-y-auto">
        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <div className="w-8 h-8 border-2 border-tg-button border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-tg-hint">Cargando ranking...</p>
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
              <span className="text-2xl">!</span>
            </div>
            <p className="text-tg-text font-medium">Error al cargar</p>
            <p className="text-sm text-tg-hint max-w-xs">
              {error instanceof Error ? error.message : 'Error desconocido'}
            </p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-tg-button text-tg-button-text rounded-lg text-sm font-medium"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && (!leaderboard || leaderboard.length === 0) && (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
            <div className="w-16 h-16 rounded-full bg-tg-secondary-bg flex items-center justify-center">
              <span className="text-2xl">-</span>
            </div>
            <p className="text-tg-text font-medium">Sin rankings todavia</p>
            <p className="text-sm text-tg-hint">
              Empieza a jugar para aparecer aqui
            </p>
          </div>
        )}

        {/* Leaderboard entries - Anonymous, only rank and points */}
        {!isLoading && !error && leaderboard && leaderboard.length > 0 && (
          <div className="space-y-2">
            {leaderboard.map((entry) => (
              <div
                key={entry.rank}
                className="flex items-center gap-3 p-3 bg-tg-secondary-bg rounded-lg"
              >
                {/* Rank */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${getMedalStyle(entry.rank)}`}
                >
                  {getMedal(entry.rank)}
                </div>

                {/* Points - center aligned */}
                <div className="flex-1">
                  <p className="font-bold text-lg text-tg-text">
                    {entry.points.toLocaleString()}
                  </p>
                  <p className="text-xs text-tg-hint">puntos</p>
                </div>

                {/* Team badge (optional) */}
                {entry.team && viewMode === 'global' && (
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    entry.team === 'colla'
                      ? 'bg-blue-500/20 text-blue-300'
                      : 'bg-green-500/20 text-green-300'
                  }`}>
                    {entry.team === 'colla' ? 'Colla' : 'Camba'}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Simple refresh icon component
function RefreshIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`w-5 h-5 text-tg-text ${className}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}
