import { useState, useEffect, useRef } from 'react';
import { useHaptics } from '../hooks/useHaptics';

interface TeamBattleSelectorProps {
  onSelect: (team: 'colla' | 'camba') => void;
  collaScore: number;
  cambaScore: number;
}

/**
 * Initial team selection screen - Colla vs Camba battle style
 * Fully responsive for all screen sizes
 */
export function TeamBattleSelector({ onSelect, collaScore, cambaScore }: TeamBattleSelectorProps) {
  const [selectedTeam, setSelectedTeam] = useState<'colla' | 'camba' | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const haptics = useHaptics();
  const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current) {
        clearTimeout(confirmTimeoutRef.current);
      }
    };
  }, []);

  const totalScore = collaScore + cambaScore || 1;
  const collaPercent = Math.round((collaScore / totalScore) * 100);
  const cambaPercent = 100 - collaPercent;

  const handleTeamClick = (team: 'colla' | 'camba') => {
    haptics.tap();
    setSelectedTeam(team);
  };

  const handleConfirm = () => {
    if (!selectedTeam || isConfirming) return;

    console.log('[TeamBattleSelector] Confirming team:', selectedTeam);
    haptics.success();
    setIsConfirming(true);

    // Call onSelect immediately - no delay needed
    console.log('[TeamBattleSelector] Calling onSelect with:', selectedTeam);
    onSelect(selectedTeam);
    console.log('[TeamBattleSelector] onSelect called');
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#0a0a1a] to-[#1a1a2e] z-50 flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Header */}
      <div className="text-center mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">
          Elige tu Bando
        </h1>
        <p className="text-white/60 text-xs sm:text-sm">
          Esta decision define tu equipo en EVO Tap
        </p>
      </div>

      {/* Battle Score Bar */}
      <div className="w-full max-w-xs sm:max-w-sm mb-4 sm:mb-6">
        <div className="flex justify-between text-xs sm:text-sm mb-1 sm:mb-2">
          <span className="text-blue-400 font-bold">{collaScore.toLocaleString()}</span>
          <span className="text-green-400 font-bold">{cambaScore.toLocaleString()}</span>
        </div>
        <div className="h-3 sm:h-4 rounded-full overflow-hidden flex bg-white/10">
          <div
            className="bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-500"
            style={{ width: `${collaPercent}%` }}
          />
          <div
            className="bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
            style={{ width: `${cambaPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] sm:text-xs mt-1">
          <span className="text-blue-400">{collaPercent}%</span>
          <span className="text-green-400">{cambaPercent}%</span>
        </div>
      </div>

      {/* Team Options - Responsive flex that stacks or rows based on screen */}
      <div className="flex flex-row gap-3 sm:gap-6 w-full max-w-xs sm:max-w-sm mb-4 sm:mb-6 items-center justify-center">
        {/* Colla */}
        <button
          onClick={() => handleTeamClick('colla')}
          className={`
            flex-1 max-w-[140px] sm:max-w-none aspect-square rounded-xl sm:rounded-2xl p-3 sm:p-4
            flex flex-col items-center justify-center
            transition-all duration-300 transform
            ${selectedTeam === 'colla'
              ? 'bg-blue-600 scale-105 ring-2 sm:ring-4 ring-blue-400/50 shadow-lg shadow-blue-500/30'
              : 'bg-blue-900/50 hover:bg-blue-800/50 active:scale-95'
            }
            ${isConfirming && selectedTeam === 'colla' ? 'animate-pulse' : ''}
          `}
        >
          <span className="text-3xl sm:text-5xl mb-1 sm:mb-3">🏔️</span>
          <span className="text-base sm:text-xl font-bold text-white">COLLA</span>
          <span className="text-[10px] sm:text-xs text-white/60 mt-0.5 sm:mt-1">Occidente</span>
          <div className="flex gap-0.5 sm:gap-1 mt-1 sm:mt-2 text-sm sm:text-lg">
            <span>🇧🇴</span>
            <span>⛏️</span>
            <span>🪙</span>
          </div>
        </button>

        {/* VS */}
        <div className="flex items-center shrink-0">
          <span className="text-lg sm:text-2xl font-bold text-yellow-500 animate-pulse">VS</span>
        </div>

        {/* Camba */}
        <button
          onClick={() => handleTeamClick('camba')}
          className={`
            flex-1 max-w-[140px] sm:max-w-none aspect-square rounded-xl sm:rounded-2xl p-3 sm:p-4
            flex flex-col items-center justify-center
            transition-all duration-300 transform
            ${selectedTeam === 'camba'
              ? 'bg-green-600 scale-105 ring-2 sm:ring-4 ring-green-400/50 shadow-lg shadow-green-500/30'
              : 'bg-green-900/50 hover:bg-green-800/50 active:scale-95'
            }
            ${isConfirming && selectedTeam === 'camba' ? 'animate-pulse' : ''}
          `}
        >
          <span className="text-3xl sm:text-5xl mb-1 sm:mb-3">🌴</span>
          <span className="text-base sm:text-xl font-bold text-white">CAMBA</span>
          <span className="text-[10px] sm:text-xs text-white/60 mt-0.5 sm:mt-1">Oriente</span>
          <div className="flex gap-0.5 sm:gap-1 mt-1 sm:mt-2 text-sm sm:text-lg">
            <span>🐊</span>
            <span>🌳</span>
            <span>🍇</span>
          </div>
        </button>
      </div>

      {/* Confirm Button */}
      {selectedTeam && (
        <button
          onClick={handleConfirm}
          disabled={isConfirming}
          className={`
            w-full max-w-xs sm:max-w-sm py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg
            transition-all duration-300 transform
            ${selectedTeam === 'colla'
              ? 'bg-gradient-to-r from-blue-600 to-blue-500'
              : 'bg-gradient-to-r from-green-600 to-green-500'
            }
            ${isConfirming ? 'scale-95 opacity-70' : 'active:scale-95'}
            text-white shadow-lg
          `}
        >
          {isConfirming ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              Uniendo...
            </span>
          ) : (
            `Unirme a ${selectedTeam === 'colla' ? 'COLLA' : 'CAMBA'}`
          )}
        </button>
      )}

      {/* Info */}
      <p className="text-white/40 text-[10px] sm:text-xs text-center mt-4 sm:mt-6 max-w-xs px-2">
        Puedes cambiar de equipo despues
      </p>
    </div>
  );
}
