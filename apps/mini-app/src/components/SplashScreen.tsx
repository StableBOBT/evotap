import { useState, useEffect } from 'react';

interface SplashScreenProps {
  isLoading: boolean;
  progress: number;
  onComplete: () => void;
}

export function SplashScreen({ isLoading, progress, onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    if (!isLoading && progress >= 100) {
      // Start fade out animation
      setIsFadingOut(true);

      // Remove from DOM after animation
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete();
      }, 600);

      return () => clearTimeout(timer);
    }
  }, [isLoading, progress, onComplete]);

  if (!isVisible) return null;

  return (
    <div
      className={`
        fixed inset-0 z-50 flex flex-col items-center justify-center
        bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900
        transition-opacity duration-500 ease-out
        ${isFadingOut ? 'opacity-0' : 'opacity-100'}
      `}
    >
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="splash-particle splash-particle-1" />
        <div className="splash-particle splash-particle-2" />
        <div className="splash-particle splash-particle-3" />
        <div className="splash-particle splash-particle-4" />
        <div className="splash-particle splash-particle-5" />
      </div>

      {/* Logo container with glow */}
      <div className="relative mb-8">
        {/* Outer glow ring */}
        <div className="absolute inset-0 splash-logo-glow" />

        {/* Logo with pulse animation */}
        <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center splash-logo-pulse">
          {/* Inner glow */}
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 opacity-50" />

          {/* Game icon */}
          <span className="relative text-6xl splash-icon-float select-none">
            🎮
          </span>
        </div>
      </div>

      {/* App name with shimmer effect */}
      <h1 className="text-4xl font-bold text-white mb-2 splash-text-shimmer">
        EVO TAP
      </h1>

      {/* Tagline */}
      <p className="text-purple-200 text-sm mb-8 opacity-80">
        Tap. Earn. Evolve.
      </p>

      {/* Progress bar container */}
      <div className="w-64 mb-4">
        {/* Progress bar background */}
        <div className="relative h-2 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
          {/* Animated gradient progress */}
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-400 rounded-full transition-all duration-300 ease-out splash-progress-glow"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />

          {/* Shimmer overlay on progress */}
          <div
            className="absolute inset-y-0 left-0 splash-progress-shimmer rounded-full"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>

        {/* Progress percentage */}
        <div className="flex justify-between mt-2 text-xs">
          <span className="text-purple-200/60">Loading your progress...</span>
          <span className="text-purple-200/80 font-medium">{Math.round(progress)}%</span>
        </div>
      </div>

      {/* Loading steps indicator */}
      <div className="flex items-center gap-2 text-purple-200/60 text-xs mt-4">
        <LoadingDot delay={0} />
        <LoadingDot delay={150} />
        <LoadingDot delay={300} />
      </div>

      {/* Version info */}
      <div className="absolute bottom-8 text-purple-200/40 text-xs">
        v0.1.0
      </div>
    </div>
  );
}

function LoadingDot({ delay }: { delay: number }) {
  return (
    <span
      className="w-1.5 h-1.5 bg-purple-400 rounded-full splash-dot-pulse"
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}
