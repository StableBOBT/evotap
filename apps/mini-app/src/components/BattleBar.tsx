import { useEffect, useState } from 'react';

interface BattleBarProps {
  collaScore: number;
  cambaScore: number;
  userTeam: 'colla' | 'camba' | null;
  animated?: boolean;
  size?: 'small' | 'medium' | 'large';
}

/**
 * Battle bar showing Colla vs Camba scores in real-time
 * Similar to TikTok live battle voting
 */
export function BattleBar({
  collaScore,
  cambaScore,
  userTeam,
  animated = true,
  size = 'medium'
}: BattleBarProps) {
  const [displayCollaScore, setDisplayCollaScore] = useState(collaScore);
  const [displayCambaScore, setDisplayCambaScore] = useState(cambaScore);
  const [isAnimating, setIsAnimating] = useState(false);

  // Animate score changes
  useEffect(() => {
    if (!animated) {
      setDisplayCollaScore(collaScore);
      setDisplayCambaScore(cambaScore);
      return;
    }

    // Detect which side changed
    if (collaScore !== displayCollaScore || cambaScore !== displayCambaScore) {
      setIsAnimating(true);

      // Smooth animation
      const steps = 20;
      const collaDiff = (collaScore - displayCollaScore) / steps;
      const cambaDiff = (cambaScore - displayCambaScore) / steps;
      let step = 0;

      const interval = setInterval(() => {
        step++;
        if (step >= steps) {
          setDisplayCollaScore(collaScore);
          setDisplayCambaScore(cambaScore);
          setIsAnimating(false);
          clearInterval(interval);
        } else {
          setDisplayCollaScore(prev => prev + collaDiff);
          setDisplayCambaScore(prev => prev + cambaDiff);
        }
      }, 30);

      return () => clearInterval(interval);
    }
  }, [collaScore, cambaScore, animated]);

  const totalScore = displayCollaScore + displayCambaScore || 1;
  const collaPercent = Math.round((displayCollaScore / totalScore) * 100);
  const cambaPercent = 100 - collaPercent;

  const sizeClasses = {
    small: { bar: 'h-2', text: 'text-xs', icon: 'text-sm' },
    medium: { bar: 'h-3', text: 'text-sm', icon: 'text-base' },
    large: { bar: 'h-4', text: 'text-base', icon: 'text-lg' },
  };

  const classes = sizeClasses[size];

  // Determine winner
  const winner = collaScore > cambaScore ? 'colla' : cambaScore > collaScore ? 'camba' : null;

  return (
    <div className="w-full">
      {/* Team Labels */}
      <div className="flex justify-between items-center mb-1">
        <div className={`flex items-center gap-1 ${classes.text}`}>
          <span className={classes.icon}>🏔️</span>
          <span className={`font-bold ${userTeam === 'colla' ? 'text-blue-400' : 'text-white/80'}`}>
            COLLA
          </span>
          {userTeam === 'colla' && (
            <span className="text-yellow-400 text-xs">(Tu)</span>
          )}
        </div>
        <div className={`flex items-center gap-1 ${classes.text}`}>
          {userTeam === 'camba' && (
            <span className="text-yellow-400 text-xs">(Tu)</span>
          )}
          <span className={`font-bold ${userTeam === 'camba' ? 'text-green-400' : 'text-white/80'}`}>
            CAMBA
          </span>
          <span className={classes.icon}>🌴</span>
        </div>
      </div>

      {/* Score Bar */}
      <div className={`relative ${classes.bar} rounded-full overflow-hidden flex bg-white/10`}>
        {/* Colla Side */}
        <div
          className={`
            transition-all duration-500 ease-out
            ${winner === 'colla' && isAnimating ? 'animate-pulse' : ''}
          `}
          style={{
            width: `${collaPercent}%`,
            background: `linear-gradient(90deg,
              ${winner === 'colla' ? '#3b82f6' : '#1d4ed8'} 0%,
              ${winner === 'colla' ? '#60a5fa' : '#3b82f6'} 100%
            )`,
            boxShadow: winner === 'colla' ? '0 0 10px rgba(59, 130, 246, 0.5)' : 'none',
          }}
        />

        {/* Camba Side */}
        <div
          className={`
            transition-all duration-500 ease-out
            ${winner === 'camba' && isAnimating ? 'animate-pulse' : ''}
          `}
          style={{
            width: `${cambaPercent}%`,
            background: `linear-gradient(90deg,
              ${winner === 'camba' ? '#22c55e' : '#16a34a'} 0%,
              ${winner === 'camba' ? '#4ade80' : '#22c55e'} 100%
            )`,
            boxShadow: winner === 'camba' ? '0 0 10px rgba(34, 197, 94, 0.5)' : 'none',
          }}
        />

        {/* Center Divider */}
        <div
          className="absolute top-0 h-full w-0.5 bg-yellow-500/80 z-10"
          style={{ left: '50%', transform: 'translateX(-50%)' }}
        />
      </div>

      {/* Scores */}
      <div className="flex justify-between items-center mt-1">
        <div className="flex items-center gap-1">
          <span className={`font-mono font-bold text-blue-400 ${classes.text}`}>
            {Math.round(displayCollaScore).toLocaleString()}
          </span>
          <span className={`text-blue-300/60 ${classes.text}`}>
            ({collaPercent}%)
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className={`text-green-300/60 ${classes.text}`}>
            ({cambaPercent}%)
          </span>
          <span className={`font-mono font-bold text-green-400 ${classes.text}`}>
            {Math.round(displayCambaScore).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Winner indicator when big difference */}
      {Math.abs(collaPercent - 50) > 10 && (
        <div className="flex justify-center mt-1">
          <span className={`text-xs ${winner === 'colla' ? 'text-blue-400' : 'text-green-400'}`}>
            {winner === 'colla' ? '🏔️ Colla va ganando!' : '🌴 Camba va ganando!'}
          </span>
        </div>
      )}
    </div>
  );
}
