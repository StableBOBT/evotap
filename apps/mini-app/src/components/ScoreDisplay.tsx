import { memo } from 'react';
import { useGameStore } from '../stores/gameStore';
import { useUIStore } from '../stores/uiStore';

export const ScoreDisplay = memo(function ScoreDisplay() {
  // Use individual selectors to prevent unnecessary re-renders
  const points = useGameStore((s) => s.points);
  const level = useGameStore((s) => s.level);
  const floatingScores = useUIStore((s) => s.floatingScores);

  // Fix: Guard against NaN values
  const safePoints = Number.isFinite(points) ? points : 0;
  const safeLevel = Number.isFinite(level) && level > 0 ? level : 1;

  return (
    <div className="text-center relative animate-scale-in">
      {/* Glass card container */}
      <div className="glass-card px-8 py-6 inline-block">
        {/* Level badge - EVO themed */}
        <div className="inline-flex items-center gap-2 mb-4 px-4 py-1 rounded-full"
          style={{
            background: 'linear-gradient(135deg, var(--evo-red) 0%, var(--evo-blue) 100%)',
            boxShadow: '0 2px 10px rgba(200, 16, 46, 0.4)'
          }}
        >
          <span className="text-lg">🍃</span>
          <span className="text-xs uppercase tracking-wider font-semibold">Nivel</span>
          <span className="font-bold font-mono-game text-lg">{safeLevel}</span>
        </div>

        {/* Score */}
        <div className="relative">
          <h1
            className="text-6xl font-black font-mono-game text-gradient text-glow tracking-tight"
            data-testid="score-display"
          >
            {safePoints.toLocaleString()}
          </h1>
          <p className="text-sm text-white/50 mt-2 uppercase tracking-widest">
            Puntos EVO
          </p>

          {/* Floating scores */}
          {floatingScores.map((score) => (
            <span
              key={score.id}
              className="float-score text-3xl"
              style={{
                left: `${score.x}px`,
                top: `${score.y}px`,
              }}
            >
              +{score.value}
            </span>
          ))}
        </div>
      </div>

      {/* Decorative glow behind card */}
      <div
        className="absolute inset-0 -z-10 blur-3xl opacity-30"
        style={{
          background: 'radial-gradient(circle at center, var(--gradient-start) 0%, transparent 70%)',
        }}
      />
    </div>
  );
});
