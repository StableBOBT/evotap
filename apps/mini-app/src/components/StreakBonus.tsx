import { useState, useCallback, useMemo, memo } from 'react';
import { useGameStore, getEvoPhrase } from '../stores/gameStore';
import { useHaptics } from '../hooks/useHaptics';

interface FlameParticle {
  id: number;
  x: number;
  delay: number;
  duration: number;
  size: number;
}

// Static tier colors to avoid recreation
const TIER_COLORS = {
  basic: 'from-orange-500/20 to-red-500/20',
  common: 'from-orange-500/30 to-red-500/30',
  rare: 'from-orange-500/40 to-red-600/40',
  epic: 'from-orange-400/50 to-red-500/50',
  legendary: 'from-yellow-400/60 to-red-600/60',
} as const;

const TIER_BORDER_COLORS = {
  basic: 'border-orange-500/30',
  common: 'border-orange-500/40',
  rare: 'border-orange-400/50',
  epic: 'border-orange-400/60',
  legendary: 'border-yellow-400/70',
} as const;

// Pre-generated flame particles (stable reference)
const FLAME_PARTICLES: FlameParticle[] = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  x: 20 + (i * 5) % 60,
  delay: (i * 0.17) % 2,
  duration: 1 + (i * 0.125) % 1.5,
  size: 4 + (i * 0.67) % 8,
}));

// Confetti emojis
const CONFETTI_EMOJIS = ['🔥', '✨', '⭐', '💫'];

export const StreakBonus = memo(function StreakBonus() {
  // Granular selectors
  const currentStreak = useGameStore((s) => s.currentStreak);
  const streakBonusCollected = useGameStore((s) => s.streakBonusCollected);
  const collectStreakBonus = useGameStore((s) => s.collectStreakBonus);

  const haptics = useHaptics();
  const [isCollecting, setIsCollecting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [collectedAmount, setCollectedAmount] = useState(0);

  const bonusAvailable = currentStreak * 100;
  const canClaim = !streakBonusCollected && currentStreak > 0;

  // Memoized Evo phrase (only changes when streak changes)
  const evoPhrase = useMemo(() => getEvoPhrase('streak'), [currentStreak]);

  const handleClaim = useCallback(async () => {
    if (!canClaim || isCollecting) return;

    setIsCollecting(true);
    haptics.tap();

    // Simulate brief delay for effect
    await new Promise(resolve => setTimeout(resolve, 300));

    const bonus = collectStreakBonus();
    setCollectedAmount(bonus);

    if (bonus > 0) {
      haptics.success();
      setShowSuccess(true);

      // Reset success state after animation
      setTimeout(() => {
        setShowSuccess(false);
        setIsCollecting(false);
      }, 2000);
    } else {
      setIsCollecting(false);
    }
  }, [canClaim, isCollecting, collectStreakBonus, haptics]);

  // Memoized streak tier
  const streakTier = useMemo(() => {
    if (currentStreak >= 30) return 'legendary';
    if (currentStreak >= 14) return 'epic';
    if (currentStreak >= 7) return 'rare';
    if (currentStreak >= 3) return 'common';
    return 'basic';
  }, [currentStreak]);

  // Memoized confetti particles (only when showing success)
  const confettiParticles = useMemo(() => {
    if (!showSuccess) return [];
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: `${(i * 5) % 100}%`,
      delay: `${(i * 0.025)}s`,
      duration: `${1 + (i * 0.05) % 1}s`,
      emoji: CONFETTI_EMOJIS[i % 4],
    }));
  }, [showSuccess]);

  return (
    <div className="w-full max-w-sm px-4">
      {/* Glass card container */}
      <div
        className={`
          glass relative overflow-hidden
          border ${TIER_BORDER_COLORS[streakTier]}
          bg-gradient-to-br ${TIER_COLORS[streakTier]}
        `}
      >
        {/* Animated flame background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {FLAME_PARTICLES.map((particle) => (
            <div
              key={particle.id}
              className="absolute rounded-full blur-sm animate-flame"
              style={{
                left: `${particle.x}%`,
                bottom: '-10%',
                width: `${particle.size}px`,
                height: `${particle.size * 2}px`,
                background: `linear-gradient(to top, #ff4500, #ff6b35, #ffa500, transparent)`,
                animationDelay: `${particle.delay}s`,
                animationDuration: `${particle.duration}s`,
                opacity: currentStreak > 0 ? 0.6 : 0.2,
              }}
            />
          ))}
        </div>

        {/* Glow effect for high streaks */}
        {currentStreak >= 7 && (
          <div
            className="absolute inset-0 pointer-events-none animate-pulse"
            style={{
              background: `radial-gradient(circle at 50% 80%, rgba(255, 100, 0, 0.3), transparent 70%)`,
            }}
          />
        )}

        {/* Content */}
        <div className="relative z-10 px-5 py-4">
          {/* Header with fire icon */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {/* Fire icon with glow */}
              <div
                className={`
                  w-12 h-12 rounded-xl flex items-center justify-center
                  bg-gradient-to-br from-orange-500/30 to-red-600/30
                  ${currentStreak > 0 ? 'animate-fire-glow' : ''}
                `}
              >
                <span className="text-2xl">
                  {currentStreak >= 30 ? '🔥' : currentStreak >= 7 ? '🔥' : currentStreak >= 3 ? '🔥' : '🔥'}
                </span>
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Racha Diaria</h3>
                <p className="text-white/50 text-xs">Bonus por constancia</p>
              </div>
            </div>

            {/* Streak counter */}
            <div className="text-right">
              <div
                className={`
                  font-mono-game font-black text-3xl
                  ${currentStreak >= 7
                    ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500'
                    : 'text-orange-400'
                  }
                `}
              >
                {currentStreak}
              </div>
              <span className="text-white/40 text-xs uppercase tracking-wider">
                {currentStreak === 1 ? 'dia' : 'dias'}
              </span>
            </div>
          </div>

          {/* Bonus display */}
          <div className="glass bg-black/20 rounded-xl px-4 py-3 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-white/60 text-sm">Bonus disponible</span>
              <div className="flex items-center gap-2">
                <span
                  className={`
                    font-mono-game font-bold text-xl
                    ${showSuccess ? 'text-green-400' : 'text-yellow-400'}
                    transition-colors duration-300
                  `}
                >
                  {showSuccess ? `+${collectedAmount}` : `+${bonusAvailable}`}
                </span>
                <span className="text-white/40 text-sm">pts</span>
              </div>
            </div>

            {/* Progress visualization */}
            <div className="mt-2 flex gap-1">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className={`
                    h-1.5 flex-1 rounded-full transition-all duration-300
                    ${i < currentStreak % 7 || (currentStreak >= 7 && i < 7)
                      ? 'bg-gradient-to-r from-orange-500 to-red-500'
                      : 'bg-white/10'
                    }
                  `}
                />
              ))}
            </div>
            <p className="text-white/30 text-[10px] mt-1 text-center">
              {currentStreak < 7
                ? `${7 - currentStreak} dias para bonus semanal`
                : currentStreak < 30
                  ? `${30 - currentStreak} dias para bonus mensual`
                  : 'Racha legendaria activa'
              }
            </p>
          </div>

          {/* Claim button or status */}
          {canClaim ? (
            <button
              onClick={handleClaim}
              disabled={isCollecting}
              className={`
                w-full py-3 px-6 rounded-xl font-bold text-white
                transition-all duration-300 transform
                ${isCollecting
                  ? 'bg-gray-600 cursor-wait scale-95'
                  : 'bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 hover:scale-[1.02] active:scale-95 shadow-lg shadow-orange-500/30'
                }
              `}
            >
              {isCollecting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">🔥</span>
                  Reclamando...
                </span>
              ) : showSuccess ? (
                <span className="flex items-center justify-center gap-2">
                  <span>✓</span>
                  Reclamado
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span>🔥</span>
                  Reclamar +{bonusAvailable} pts
                </span>
              )}
            </button>
          ) : currentStreak === 0 ? (
            <div className="text-center py-3">
              <p className="text-white/40 text-sm">
                Juega hoy para iniciar tu racha
              </p>
            </div>
          ) : (
            <div className="text-center py-3 glass bg-green-500/10 rounded-xl border border-green-500/20">
              <p className="text-green-400 text-sm font-medium flex items-center justify-center gap-2">
                <span>✓</span>
                Bonus de hoy reclamado
              </p>
            </div>
          )}

          {/* Evo phrase */}
          {currentStreak > 0 && (
            <div className="mt-4 pt-3 border-t border-white/10">
              <p className="text-center text-white/60 text-sm italic">
                "{evoPhrase}"
              </p>
              <p className="text-center text-white/30 text-xs mt-1">- Evo</p>
            </div>
          )}
        </div>

        {/* Success animation overlay */}
        {showSuccess && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Celebration particles */}
            {confettiParticles.map((particle) => (
              <div
                key={particle.id}
                className="absolute animate-confetti"
                style={{
                  left: particle.left,
                  top: '-10%',
                  animationDelay: particle.delay,
                  animationDuration: particle.duration,
                }}
              >
                {particle.emoji}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Inline styles for animations */}
      <style>{`
        @keyframes flame {
          0%, 100% {
            transform: translateY(0) scale(1);
            opacity: 0;
          }
          10% {
            opacity: 0.6;
          }
          50% {
            opacity: 0.8;
            transform: translateY(-100px) scale(0.8);
          }
          100% {
            opacity: 0;
            transform: translateY(-150px) scale(0.3);
          }
        }

        @keyframes fire-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(255, 100, 0, 0.4);
          }
          50% {
            box-shadow: 0 0 30px rgba(255, 100, 0, 0.7);
          }
        }

        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(300px) rotate(720deg);
            opacity: 0;
          }
        }

        .animate-flame {
          animation: flame linear infinite;
        }

        .animate-fire-glow {
          animation: fire-glow 1.5s ease-in-out infinite;
        }

        .animate-confetti {
          animation: confetti ease-out forwards;
        }
      `}</style>
    </div>
  );
});
