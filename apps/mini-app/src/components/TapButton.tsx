import { useCallback, useRef, useState, type MouseEvent, type TouchEvent } from 'react';
import { useGameStore } from '../stores/gameStore';
import { useUIStore } from '../stores/uiStore';
import { useHaptics } from '../hooks/useHaptics';

interface Particle {
  id: number;
  x: number;
  y: number;
  angle: number;
  color: string;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

interface FloatingNumber {
  id: number;
  x: number;
  y: number;
  value: number;
}

// Wiphala colors - traditional Bolivian flag rainbow
const PARTICLE_COLORS = [
  '#E31C23', // Red (Wiphala)
  '#F47920', // Orange (Wiphala)
  '#FFDD00', // Yellow (Wiphala)
  '#FFFFFF', // White (Wiphala)
  '#009A44', // Green (Wiphala)
  '#00AEEF', // Blue (Wiphala)
  '#662D91', // Violet (Wiphala)
];

const PARTICLE_COUNT = 8;

export function TapButton() {
  const { tap, energy, maxEnergy } = useGameStore();
  const { addFloatingScore } = useUIStore();
  const haptics = useHaptics();

  const buttonRef = useRef<HTMLButtonElement>(null);
  const particleIdRef = useRef(0);
  const rippleIdRef = useRef(0);
  const floatingIdRef = useRef(0);

  const [particles, setParticles] = useState<Particle[]>([]);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [floatingNumbers, setFloatingNumbers] = useState<FloatingNumber[]>([]);
  const [isPressed, setIsPressed] = useState(false);

  const isDisabled = energy <= 0;
  const isFullEnergy = energy >= maxEnergy;
  const energyPercent = (energy / maxEnergy) * 100;

  const createParticles = useCallback((x: number, y: number) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = (360 / PARTICLE_COUNT) * i + Math.random() * 30 - 15;
      newParticles.push({
        id: particleIdRef.current++,
        x,
        y,
        angle,
        color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
      });
    }
    setParticles(prev => [...prev, ...newParticles]);

    // Clean up particles after animation
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.some(np => np.id === p.id)));
    }, 600);
  }, []);

  const createRipple = useCallback((x: number, y: number) => {
    const id = rippleIdRef.current++;
    setRipples(prev => [...prev, { id, x, y }]);

    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id));
    }, 600);
  }, []);

  const createFloatingNumber = useCallback((x: number, y: number, value: number) => {
    const id = floatingIdRef.current++;
    // Add some randomness to position
    const offsetX = Math.random() * 40 - 20;
    const offsetY = Math.random() * 20 - 10;

    setFloatingNumbers(prev => [...prev, {
      id,
      x: x + offsetX,
      y: y + offsetY,
      value
    }]);

    setTimeout(() => {
      setFloatingNumbers(prev => prev.filter(f => f.id !== id));
    }, 1000);
  }, []);

  const handleTap = useCallback(
    (clientX: number, clientY: number) => {
      if (isDisabled) return;

      const success = tap();

      if (success && buttonRef.current) {
        // Haptic feedback
        haptics.tap();

        const rect = buttonRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        // Trigger all effects
        createParticles(x, y);
        createRipple(x, y);
        createFloatingNumber(x, y, 1);

        // Also add to global floating score
        addFloatingScore(1, x, y);
      } else {
        haptics.error();
      }
    },
    [tap, isDisabled, haptics, addFloatingScore, createParticles, createRipple, createFloatingNumber]
  );

  const handleMouseDown = (e: MouseEvent<HTMLButtonElement>) => {
    setIsPressed(true);
    handleTap(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    setIsPressed(false);
  };

  const handleMouseLeave = () => {
    setIsPressed(false);
  };

  const handleTouchStart = (e: TouchEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsPressed(true);
    Array.from(e.touches).forEach((touch) => {
      handleTap(touch.clientX, touch.clientY);
    });
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
  };

  return (
    <button
      ref={buttonRef}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      disabled={isDisabled}
      className={`
        tap-button
        relative w-52 h-52 rounded-full
        flex items-center justify-center
        select-none cursor-pointer
        transition-transform duration-100 ease-out
        ${isPressed ? 'scale-90' : 'scale-100'}
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${isFullEnergy ? 'tap-button-full-energy' : ''}
      `}
      style={{ touchAction: 'none' }}
    >
      {/* Outer glow layer */}
      <div className="tap-button-glow absolute -inset-4 rounded-full opacity-50" />

      {/* Main button background with gradient */}
      <div className="tap-button-bg absolute inset-0 rounded-full" />

      {/* Animated gradient overlay */}
      <div className="tap-button-shine absolute inset-0 rounded-full overflow-hidden" />

      {/* Inner highlight - premium shine */}
      <div className="absolute inset-3 rounded-full bg-gradient-to-br from-white/25 via-transparent to-transparent" />

      {/* Secondary inner ring */}
      <div className="absolute inset-6 rounded-full border border-white/10" />

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        {isDisabled ? (
          <span className="text-6xl">😴</span>
        ) : (
          <>
            {/* EVO Logo - Clean typography */}
            <span
              className="text-5xl font-black tracking-tight select-none"
              style={{
                background: 'linear-gradient(180deg, #FFFFFF 0%, #FFD700 50%, #FFA500 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 0 30px rgba(255, 215, 0, 0.5)',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
              }}
            >
              EVO
            </span>
            {/* Tap indicator */}
            <span className="text-xs text-white/60 mt-1 uppercase tracking-widest font-medium">
              Tap
            </span>
          </>
        )}
      </div>

      {/* Energy indicator ring */}
      <svg
        className="absolute inset-0 w-full h-full -rotate-90"
        viewBox="0 0 100 100"
      >
        {/* Background ring */}
        <circle
          cx="50"
          cy="50"
          r="48"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="3"
        />
        {/* Energy ring with EVO gradient */}
        <defs>
          <linearGradient id="energyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFD700" />
            <stop offset="50%" stopColor="#00AEEF" />
            <stop offset="100%" stopColor="#009A44" />
          </linearGradient>
        </defs>
        <circle
          cx="50"
          cy="50"
          r="48"
          fill="none"
          stroke="url(#energyGradient)"
          strokeWidth="3"
          strokeDasharray={`${(energyPercent / 100) * 301.59} 301.59`}
          strokeLinecap="round"
          className="transition-all duration-300 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
        />
      </svg>

      {/* Ripple effects container */}
      <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
        {ripples.map((ripple) => (
          <div
            key={ripple.id}
            className="tap-ripple absolute rounded-full"
            style={{
              left: ripple.x,
              top: ripple.y,
            }}
          />
        ))}
      </div>

      {/* Particles container */}
      <div className="absolute inset-0 overflow-visible pointer-events-none">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="tap-particle absolute w-3 h-3 rounded-full"
            style={{
              left: particle.x,
              top: particle.y,
              backgroundColor: particle.color,
              '--particle-angle': `${particle.angle}deg`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Floating +1 numbers */}
      <div className="absolute inset-0 overflow-visible pointer-events-none">
        {floatingNumbers.map((num) => (
          <div
            key={num.id}
            className="tap-floating-number absolute"
            style={{
              left: num.x,
              top: num.y,
            }}
          >
            +{num.value}
          </div>
        ))}
      </div>
    </button>
  );
}
