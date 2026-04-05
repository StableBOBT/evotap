import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  TapButton,
  EnergyBar,
  ScoreDisplay,
  StreakBonus,
  TeamBattleSelector,
  BattleBar
} from '../components';
import { HelpTooltip, HELP_CONTENT } from '../components/HelpTooltip';
import { useGameStore, getEvoPhrase } from '../stores/gameStore';
import { useUIStore } from '../stores/uiStore';
import { useHaptics } from '../hooks/useHaptics';
import { useTeamBattle, useRegionDetection } from '../hooks/useTeamBattle';
import { useGameSync } from '../hooks/useGameSync';

// Debug logging (temporarily enabled for diagnosis)
const DEBUG = true;
const log = (msg: string, data?: unknown) => {
  if (DEBUG) console.log(`[Game] ${msg}`, data ?? '');
};

export function GamePage() {
  // Granular selectors to prevent unnecessary re-renders
  const isSyncing = useGameStore((s) => s.isSyncing);
  const isCloudAvailable = useGameStore((s) => s.isCloudAvailable);
  const isInitialized = useGameStore((s) => s.isInitialized);
  const level = useGameStore((s) => s.level);
  const energy = useGameStore((s) => s.energy);
  const maxEnergy = useGameStore((s) => s.maxEnergy);
  const team = useGameStore((s) => s.team);
  const department = useGameStore((s) => s.department);
  const currentStreak = useGameStore((s) => s.currentStreak);
  const streakBonusCollected = useGameStore((s) => s.streakBonusCollected);
  const selectTeam = useGameStore((s) => s.selectTeam);
  const selectDepartment = useGameStore((s) => s.selectDepartment);
  const rechargeEnergy = useGameStore((s) => s.rechargeEnergy);

  // UI store with granular selector
  const setPage = useUIStore((s) => s.setPage);

  const haptics = useHaptics();
  const previousLevelRef = useRef(level);
  const [levelUpMessage, setLevelUpMessage] = useState<string | null>(null);
  const [showStreakBonus, setShowStreakBonus] = useState(false);

  // Sync game state with backend API
  const { isSyncing: isApiSyncing } = useGameSync();

  // Fetch team battle scores
  const { scores } = useTeamBattle();

  // Detect user region
  const { region: detectedRegion } = useRegionDetection();

  // Note: Initialize is called in App.tsx, not here to avoid race conditions

  // Auto-set department from detected region (only valid Bolivian departments)
  // NOTE: This is disabled because team selection is now manual via TeamBattleSelector
  // We keep the detection for future use
  useEffect(() => {
    if (detectedRegion && !department && !team) {
      const validDepartments = [
        'LA_PAZ', 'ORURO', 'POTOSI', 'COCHABAMBA', 'CHUQUISACA',
        'TARIJA', 'SANTA_CRUZ', 'BENI', 'PANDO'
      ];
      if (validDepartments.includes(detectedRegion)) {
        console.log('[Game] Auto-setting department from detection:', detectedRegion);
        selectDepartment(detectedRegion as Parameters<typeof selectDepartment>[0]);
      }
    }
  }, [detectedRegion, department, team, selectDepartment]);

  // Auto-recharge energy
  useEffect(() => {
    rechargeEnergy();
    const interval = setInterval(rechargeEnergy, 60000);
    return () => clearInterval(interval);
  }, [rechargeEnergy]);

  // Level up haptic feedback and message
  useEffect(() => {
    if (isInitialized && level > previousLevelRef.current) {
      haptics.levelUp();
      const phrase = getEvoPhrase('levelUp');
      setLevelUpMessage(phrase);
      setTimeout(() => setLevelUpMessage(null), 3000);
    }
    previousLevelRef.current = level;
  }, [level, isInitialized, haptics]);

  // Handle team selection (memoized)
  const handleTeamSelect = useCallback((selectedTeam: 'colla' | 'camba') => {
    log('Team selected:', selectedTeam);
    selectTeam(selectedTeam);
    haptics.success();
    // Sync is handled automatically by useGameSync watching team changes
  }, [selectTeam, haptics]);

  // Debug: Log render state
  useEffect(() => {
    log('Render state:', { isInitialized, team, isSyncing, isApiSyncing });
  }, [isInitialized, team, isSyncing, isApiSyncing]);

  // Loading state - only show briefly on initial mount
  if (!isInitialized) {
    log('Showing loading spinner - isInitialized:', isInitialized);
    return (
      <div className="flex flex-col items-center justify-center flex-1 px-4 gap-4">
        <div className="w-12 h-12 border-4 border-tg-button border-t-transparent rounded-full animate-spin" />
        <p className="text-tg-hint text-sm">Loading your progress...</p>
      </div>
    );
  }

  // Show team selection if user hasn't chosen
  // IMPORTANT: Don't block on sync state, let user proceed immediately
  if (!team) {
    log('Showing team selector - team:', team);
    return (
      <TeamBattleSelector
        onSelect={handleTeamSelect}
        collaScore={scores.colla}
        cambaScore={scores.camba}
      />
    );
  }

  // Main game - user has selected team
  log('Showing main game - team:', team);

  // Low energy warning phrase (memoized)
  const isLowEnergy = useMemo(() => energy < maxEnergy * 0.1, [energy, maxEnergy]);

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 gap-4">
      {/* Help button - floating top right */}
      <button
        onClick={() => setPage('howtoplay')}
        className="fixed top-16 right-4 z-40 w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg hover:scale-105 transition-transform"
        aria-label="Como jugar"
      >
        ?
      </button>

      {/* Battle Bar - Colla vs Camba */}
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-white/50">Batalla de Equipos</span>
          <HelpTooltip {...HELP_CONTENT.teamBattle} />
        </div>
        <BattleBar
          collaScore={scores.colla}
          cambaScore={scores.camba}
          userTeam={team as 'colla' | 'camba'}
          size="medium"
        />
      </div>

      {/* Top bar: Sync status + Streak */}
      <div className="w-full max-w-sm flex items-center justify-between">
        {/* Sync status */}
        <div className="flex items-center gap-2 text-xs text-tg-hint">
          {isCloudAvailable ? (
            <>
              <span className={`w-2 h-2 rounded-full ${(isSyncing || isApiSyncing) ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
              <span>{(isSyncing || isApiSyncing) ? 'Sync...' : 'Guardado'}</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-gray-500" />
              <span>Local</span>
            </>
          )}
        </div>

        {/* Team badge */}
        <div className={`
          flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold
          ${team === 'colla'
            ? 'bg-blue-600/30 text-blue-400 border border-blue-500/30'
            : 'bg-green-600/30 text-green-400 border border-green-500/30'
          }
        `}>
          <span>{team === 'colla' ? '🏔️' : '🌴'}</span>
          <span className="uppercase">{team}</span>
        </div>

        {/* Streak indicator */}
        <div className="flex items-center gap-1">
          {currentStreak > 0 && (
            <button
              onClick={() => setShowStreakBonus(true)}
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                !streakBonusCollected
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 animate-pulse'
                  : 'bg-white/10'
              }`}
            >
              <span>🔥</span>
              <span className="font-bold">{currentStreak}</span>
            </button>
          )}
          <HelpTooltip {...HELP_CONTENT.streak} />
        </div>
      </div>

      {/* Score at top */}
      <ScoreDisplay />

      {/* Tap button in center */}
      <div className="relative" data-testid="tap-button">
        <TapButton />
      </div>

      {/* Energy bar at bottom */}
      <EnergyBar />

      {/* Evo phrase - low energy or tap encouragement */}
      <p className="text-tg-hint text-sm text-center">
        {isLowEnergy
          ? getEvoPhrase('lowEnergy')
          : team === 'colla'
            ? '¡Vamos Colla, cada tap cuenta!'
            : '¡Arriba Camba, a ganar!'
        }
      </p>

      {/* Level up message overlay */}
      {levelUpMessage && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="level-up-message glass-card px-8 py-6 text-center animate-scale-in">
            <div className="text-4xl mb-2">🎉</div>
            <div className="text-2xl font-bold text-gradient mb-2">
              ¡Nivel {level}!
            </div>
            <p className="text-lg text-white/90 font-medium">
              {levelUpMessage}
            </p>
          </div>
        </div>
      )}

      {/* Streak bonus modal */}
      {showStreakBonus && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowStreakBonus(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <StreakBonus />
            <button
              onClick={() => setShowStreakBonus(false)}
              className="mt-4 w-full text-center text-white/60 text-sm"
            >
              Toca para cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
