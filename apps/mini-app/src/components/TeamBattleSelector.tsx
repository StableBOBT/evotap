import { useState } from 'react';
import { useHaptics } from '../hooks/useHaptics';

interface TeamBattleSelectorProps {
  onSelect: (team: 'colla' | 'camba') => void;
  collaScore: number;
  cambaScore: number;
}

/**
 * Initial team selection screen - Colla vs Camba battle style like TikTok voting
 */
export function TeamBattleSelector({ onSelect, collaScore, cambaScore }: TeamBattleSelectorProps) {
  const [selectedTeam, setSelectedTeam] = useState<'colla' | 'camba' | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const haptics = useHaptics();

  const totalScore = collaScore + cambaScore || 1; // Avoid division by zero
  const collaPercent = Math.round((collaScore / totalScore) * 100);
  const cambaPercent = 100 - collaPercent;

  const handleTeamClick = (team: 'colla' | 'camba') => {
    haptics.tap();
    setSelectedTeam(team);
  };

  const handleConfirm = () => {
    if (!selectedTeam) return;

    haptics.success();
    setIsConfirming(true);

    // Animate then select
    setTimeout(() => {
      onSelect(selectedTeam);
    }, 500);
  };

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Elige tu Bando
        </h1>
        <p className="text-white/60 text-sm">
          Esta decision define tu equipo en EVO Tap
        </p>
      </div>

      {/* Battle Score Bar */}
      <div className="w-full max-w-sm mb-8">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-blue-400 font-bold">{collaScore.toLocaleString()}</span>
          <span className="text-green-400 font-bold">{cambaScore.toLocaleString()}</span>
        </div>
        <div className="h-4 rounded-full overflow-hidden flex bg-white/10">
          <div
            className="bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-500"
            style={{ width: `${collaPercent}%` }}
          />
          <div
            className="bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
            style={{ width: `${cambaPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="text-blue-400">{collaPercent}%</span>
          <span className="text-green-400">{cambaPercent}%</span>
        </div>
      </div>

      {/* Team Options */}
      <div className="flex gap-6 w-full max-w-sm mb-8">
        {/* Colla */}
        <button
          onClick={() => handleTeamClick('colla')}
          className={`
            flex-1 aspect-square rounded-2xl p-4
            flex flex-col items-center justify-center
            transition-all duration-300 transform
            ${selectedTeam === 'colla'
              ? 'bg-blue-600 scale-105 ring-4 ring-blue-400/50 shadow-lg shadow-blue-500/30'
              : 'bg-blue-900/50 hover:bg-blue-800/50'
            }
            ${isConfirming && selectedTeam === 'colla' ? 'animate-pulse' : ''}
          `}
        >
          <span className="text-5xl mb-3">
            <span role="img" aria-label="mountain">🏔️</span>
          </span>
          <span className="text-xl font-bold text-white">COLLA</span>
          <span className="text-xs text-white/60 mt-1">Occidente</span>
          <div className="flex gap-1 mt-2 text-lg">
            <span>🇧🇴</span>
            <span>⛏️</span>
            <span>🪙</span>
          </div>
        </button>

        {/* VS */}
        <div className="flex items-center">
          <span className="text-2xl font-bold text-yellow-500 animate-pulse">VS</span>
        </div>

        {/* Camba */}
        <button
          onClick={() => handleTeamClick('camba')}
          className={`
            flex-1 aspect-square rounded-2xl p-4
            flex flex-col items-center justify-center
            transition-all duration-300 transform
            ${selectedTeam === 'camba'
              ? 'bg-green-600 scale-105 ring-4 ring-green-400/50 shadow-lg shadow-green-500/30'
              : 'bg-green-900/50 hover:bg-green-800/50'
            }
            ${isConfirming && selectedTeam === 'camba' ? 'animate-pulse' : ''}
          `}
        >
          <span className="text-5xl mb-3">
            <span role="img" aria-label="palm">🌴</span>
          </span>
          <span className="text-xl font-bold text-white">CAMBA</span>
          <span className="text-xs text-white/60 mt-1">Oriente</span>
          <div className="flex gap-1 mt-2 text-lg">
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
            w-full max-w-sm py-4 rounded-xl font-bold text-lg
            transition-all duration-300 transform
            ${selectedTeam === 'colla'
              ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400'
              : 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400'
            }
            ${isConfirming ? 'scale-95 opacity-70' : 'hover:scale-[1.02]'}
            text-white shadow-lg
          `}
        >
          {isConfirming ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              Uniendo a {selectedTeam === 'colla' ? 'COLLA' : 'CAMBA'}...
            </span>
          ) : (
            `Unirme a ${selectedTeam === 'colla' ? 'COLLA' : 'CAMBA'}`
          )}
        </button>
      )}

      {/* Info */}
      <p className="text-white/40 text-xs text-center mt-6 max-w-xs">
        Puedes cambiar de equipo despues, pero tus puntos se transferiran
      </p>
    </div>
  );
}
