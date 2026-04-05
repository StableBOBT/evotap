import { memo } from 'react';
import { useGameStore } from '../stores/gameStore';

export const EnergyBar = memo(function EnergyBar() {
  // Use individual selectors to prevent unnecessary re-renders
  const energy = useGameStore((s) => s.energy);
  const maxEnergy = useGameStore((s) => s.maxEnergy);

  // Fix: Guard against NaN and invalid values
  const safeEnergy = Number.isFinite(energy) && energy >= 0 ? energy : 0;
  const safeMaxEnergy = Number.isFinite(maxEnergy) && maxEnergy > 0 ? maxEnergy : 1000;
  const percentage = (safeEnergy / safeMaxEnergy) * 100;
  const isLow = percentage < 20;
  const isCritical = percentage < 10;

  return (
    <div className="w-full max-w-sm px-4">
      {/* Glass container */}
      <div className="glass px-4 py-3">
        {/* Energy header */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <div
              className={`
                w-8 h-8 rounded-lg flex items-center justify-center
                ${isCritical
                  ? 'bg-red-500/20'
                  : isLow
                    ? 'bg-orange-500/20'
                    : 'bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-accent)] opacity-80'
                }
              `}
            >
              <svg
                className={`w-5 h-5 ${isCritical ? 'text-red-400' : isLow ? 'text-orange-400' : 'text-white'} animate-energy-pulse`}
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-white/50">
                Energía
              </span>
              {safeEnergy < safeMaxEnergy && (
                <span className="text-[10px] text-white/30 ml-2">
                  +1/min
                </span>
              )}
            </div>
          </div>

          <div className="text-right">
            <span
              className={`
                font-mono-game font-bold text-lg
                ${isCritical
                  ? 'text-red-400'
                  : isLow
                    ? 'text-orange-400'
                    : 'text-white'
                }
              `}
            >
              {safeEnergy.toLocaleString()}
            </span>
            <span className="text-white/30 text-sm font-mono-game">
              /{safeMaxEnergy.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="progress-bar h-3">
          <div
            className={`
              progress-fill h-full
              ${isCritical
                ? '!bg-gradient-to-r !from-red-600 !to-red-400'
                : isLow
                  ? '!bg-gradient-to-r !from-orange-600 !to-orange-400'
                  : ''
              }
            `}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Segment markers */}
        <div className="flex justify-between mt-1 px-[2px]">
          {[0, 25, 50, 75, 100].map((mark) => (
            <div
              key={mark}
              className={`
                w-[2px] h-1 rounded-full
                ${percentage >= mark ? 'bg-white/30' : 'bg-white/10'}
              `}
            />
          ))}
        </div>
      </div>

      {/* Low energy warning */}
      {isCritical && (
        <div className="mt-2 text-center animate-pulse">
          <span className="text-xs text-red-400 font-medium">
            ¡Sin energía! Espera para recargar
          </span>
        </div>
      )}
    </div>
  );
});
