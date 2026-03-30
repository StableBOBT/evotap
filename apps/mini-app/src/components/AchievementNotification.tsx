import { useEffect, useState, useCallback } from 'react';
import { ACHIEVEMENTS, useGameStore, type AchievementId } from '../stores/gameStore';
import { useHaptics } from '../hooks/useHaptics';

interface NotificationState {
  achievement: (typeof ACHIEVEMENTS)[AchievementId] | null;
  isVisible: boolean;
  isExiting: boolean;
}

const AUTO_DISMISS_MS = 3000;
const EXIT_ANIMATION_MS = 300;

export function AchievementNotification() {
  const pendingAchievements = useGameStore((s) => s.pendingAchievements);
  const clearPendingAchievements = useGameStore((s) => s.clearPendingAchievements);
  const haptics = useHaptics();

  const [notification, setNotification] = useState<NotificationState>({
    achievement: null,
    isVisible: false,
    isExiting: false,
  });

  const [queue, setQueue] = useState<AchievementId[]>([]);

  // Queue new achievements when they arrive
  useEffect(() => {
    if (pendingAchievements.length > 0) {
      setQueue((prev) => [...prev, ...pendingAchievements]);
      clearPendingAchievements();
    }
  }, [pendingAchievements, clearPendingAchievements]);

  // Process queue - show one achievement at a time
  useEffect(() => {
    if (queue.length > 0 && !notification.isVisible) {
      const nextAchievementId = queue[0];
      const achievement = ACHIEVEMENTS[nextAchievementId];

      setQueue((prev) => prev.slice(1));
      setNotification({
        achievement,
        isVisible: true,
        isExiting: false,
      });

      // Trigger haptic feedback
      haptics.achievement();
    }
  }, [queue, notification.isVisible, haptics]);

  // Auto-dismiss timer
  useEffect(() => {
    if (!notification.isVisible || notification.isExiting) return;

    const timer = setTimeout(() => {
      dismissNotification();
    }, AUTO_DISMISS_MS);

    return () => clearTimeout(timer);
  }, [notification.isVisible, notification.isExiting]);

  const dismissNotification = useCallback(() => {
    setNotification((prev) => ({ ...prev, isExiting: true }));

    setTimeout(() => {
      setNotification({
        achievement: null,
        isVisible: false,
        isExiting: false,
      });
    }, EXIT_ANIMATION_MS);
  }, []);

  const handleTap = useCallback(() => {
    if (notification.isVisible && !notification.isExiting) {
      haptics.tap();
      dismissNotification();
    }
  }, [notification.isVisible, notification.isExiting, haptics, dismissNotification]);

  if (!notification.isVisible || !notification.achievement) {
    return null;
  }

  const { achievement, isExiting } = notification;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      style={{ perspective: '1000px' }}
    >
      {/* Backdrop overlay */}
      <div
        className={`
          absolute inset-0 bg-black/60 backdrop-blur-sm
          transition-opacity duration-300 pointer-events-auto
          ${isExiting ? 'opacity-0' : 'opacity-100'}
        `}
        onClick={handleTap}
      />

      {/* Achievement card */}
      <div
        className={`
          relative pointer-events-auto cursor-pointer
          transition-all duration-300 ease-out
          ${isExiting
            ? 'opacity-0 scale-75 translate-y-8'
            : 'opacity-100 scale-100 translate-y-0 animate-achievement-enter'
          }
        `}
        onClick={handleTap}
      >
        {/* Glow effect behind card */}
        <div
          className="absolute -inset-8 rounded-3xl opacity-60 blur-2xl animate-achievement-glow"
          style={{
            background: 'radial-gradient(circle, rgba(255, 215, 0, 0.4) 0%, rgba(255, 165, 0, 0.2) 50%, transparent 70%)',
          }}
        />

        {/* Particle burst effect */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full animate-achievement-particle"
              style={{
                background: `hsl(${i * 45}, 70%, 60%)`,
                animationDelay: `${i * 0.1}s`,
                '--particle-angle': `${i * 45}deg`,
              } as React.CSSProperties}
            />
          ))}
        </div>

        {/* Main card */}
        <div
          className="
            relative glass-card overflow-hidden
            px-8 py-6 rounded-2xl
            border border-yellow-500/30
            min-w-[280px] max-w-[340px]
          "
          style={{
            background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 165, 0, 0.1) 50%, rgba(0, 0, 0, 0.4) 100%)',
            boxShadow: '0 0 40px rgba(255, 215, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          }}
        >
          {/* Achievement unlocked header */}
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/30">
              <span className="text-yellow-400 text-xs font-bold uppercase tracking-wider">
                Logro Desbloqueado
              </span>
            </div>
          </div>

          {/* Icon with animated glow */}
          <div className="flex justify-center mb-4">
            <div
              className="
                relative w-20 h-20 rounded-full
                flex items-center justify-center
                animate-achievement-icon-pulse
              "
              style={{
                background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.3) 0%, rgba(255, 165, 0, 0.2) 100%)',
                boxShadow: '0 0 30px rgba(255, 215, 0, 0.5), inset 0 0 20px rgba(255, 215, 0, 0.2)',
              }}
            >
              {/* Inner ring */}
              <div className="absolute inset-2 rounded-full border-2 border-yellow-500/40" />

              {/* Icon */}
              <span className="text-4xl animate-bounce-subtle">{achievement.icon}</span>
            </div>
          </div>

          {/* Achievement name */}
          <h3
            className="text-center text-xl font-bold mb-2"
            style={{
              background: 'linear-gradient(180deg, #FFFFFF 0%, #FFD700 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {achievement.name}
          </h3>

          {/* Description */}
          <p className="text-center text-white/70 text-sm mb-4">
            {achievement.description}
          </p>

          {/* Points earned */}
          <div className="flex justify-center">
            <div
              className="
                inline-flex items-center gap-2 px-4 py-2
                rounded-full bg-green-500/20 border border-green-500/30
              "
            >
              <span className="text-green-400 text-lg">+</span>
              <span className="text-green-400 font-bold text-lg font-mono-game">
                {achievement.points.toLocaleString()}
              </span>
              <span className="text-green-400/70 text-sm">puntos</span>
            </div>
          </div>

          {/* Tap to dismiss hint */}
          <p className="text-center text-white/30 text-xs mt-4 animate-pulse">
            Toca para cerrar
          </p>
        </div>
      </div>

      {/* CSS for custom animations */}
      <style>{`
        @keyframes achievement-enter {
          0% {
            opacity: 0;
            transform: scale(0.5) rotateX(20deg);
          }
          50% {
            transform: scale(1.05) rotateX(-5deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotateX(0deg);
          }
        }

        @keyframes achievement-glow {
          0%, 100% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.1);
          }
        }

        @keyframes achievement-icon-pulse {
          0%, 100% {
            box-shadow: 0 0 30px rgba(255, 215, 0, 0.5), inset 0 0 20px rgba(255, 215, 0, 0.2);
          }
          50% {
            box-shadow: 0 0 50px rgba(255, 215, 0, 0.7), inset 0 0 30px rgba(255, 215, 0, 0.3);
          }
        }

        @keyframes achievement-particle {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) rotate(var(--particle-angle)) translateX(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) rotate(var(--particle-angle)) translateX(100px) scale(0);
          }
        }

        @keyframes bounce-subtle {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }

        .animate-achievement-enter {
          animation: achievement-enter 0.5s ease-out forwards;
        }

        .animate-achievement-glow {
          animation: achievement-glow 2s ease-in-out infinite;
        }

        .animate-achievement-icon-pulse {
          animation: achievement-icon-pulse 1.5s ease-in-out infinite;
        }

        .animate-achievement-particle {
          animation: achievement-particle 0.8s ease-out forwards;
        }

        .animate-bounce-subtle {
          animation: bounce-subtle 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
