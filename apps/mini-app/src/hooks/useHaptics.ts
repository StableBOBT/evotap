import { useCallback, useRef } from 'react';
import { hapticFeedback } from '@telegram-apps/sdk-react';

type HapticPattern = 'tap' | 'success' | 'levelUp' | 'error' | 'achievement';

interface HapticConfig {
  pattern: number[];
  telegramFallback: () => void;
}

const HAPTIC_PATTERNS: Record<HapticPattern, HapticConfig> = {
  tap: {
    pattern: [50],
    telegramFallback: () => {
      if (hapticFeedback.impactOccurred.isAvailable()) {
        hapticFeedback.impactOccurred('light');
      }
    },
  },
  success: {
    pattern: [50, 50, 50, 50, 50],
    telegramFallback: () => {
      if (hapticFeedback.notificationOccurred.isAvailable()) {
        hapticFeedback.notificationOccurred('success');
      }
    },
  },
  levelUp: {
    pattern: [100, 50, 100, 50, 200],
    telegramFallback: () => {
      if (hapticFeedback.impactOccurred.isAvailable()) {
        hapticFeedback.impactOccurred('heavy');
        setTimeout(() => {
          if (hapticFeedback.impactOccurred.isAvailable()) {
            hapticFeedback.impactOccurred('heavy');
          }
        }, 100);
        setTimeout(() => {
          if (hapticFeedback.notificationOccurred.isAvailable()) {
            hapticFeedback.notificationOccurred('success');
          }
        }, 200);
      }
    },
  },
  error: {
    pattern: [200],
    telegramFallback: () => {
      if (hapticFeedback.notificationOccurred.isAvailable()) {
        hapticFeedback.notificationOccurred('error');
      }
    },
  },
  achievement: {
    pattern: [50, 30, 50, 30, 100],
    telegramFallback: () => {
      if (hapticFeedback.notificationOccurred.isAvailable()) {
        hapticFeedback.notificationOccurred('success');
      }
    },
  },
};

interface UseHapticsReturn {
  trigger: (pattern: HapticPattern) => void;
  tap: () => void;
  success: () => void;
  levelUp: () => void;
  error: () => void;
  achievement: () => void;
  isSupported: boolean;
}

export function useHaptics(): UseHapticsReturn {
  const lastVibrationRef = useRef<number>(0);
  const MIN_INTERVAL_MS = 30;

  const isSupported =
    typeof navigator !== 'undefined' &&
    ('vibrate' in navigator || hapticFeedback.impactOccurred.isAvailable());

  const isTelegramApp =
    typeof window !== 'undefined' && !!window.Telegram?.WebApp;

  const vibrate = useCallback(
    (pattern: number[]): boolean => {
      if (typeof navigator === 'undefined') return false;

      const now = Date.now();
      if (now - lastVibrationRef.current < MIN_INTERVAL_MS) {
        return false;
      }
      lastVibrationRef.current = now;

      if ('vibrate' in navigator) {
        try {
          return navigator.vibrate(pattern);
        } catch {
          return false;
        }
      }
      return false;
    },
    []
  );

  const trigger = useCallback(
    (patternName: HapticPattern) => {
      const config = HAPTIC_PATTERNS[patternName];

      if (!config) {
        console.warn(`[useHaptics] Unknown pattern: ${patternName}`);
        return;
      }

      if (isTelegramApp) {
        config.telegramFallback();
      } else {
        vibrate(config.pattern);
      }
    },
    [isTelegramApp, vibrate]
  );

  const tap = useCallback(() => trigger('tap'), [trigger]);
  const success = useCallback(() => trigger('success'), [trigger]);
  const levelUp = useCallback(() => trigger('levelUp'), [trigger]);
  const error = useCallback(() => trigger('error'), [trigger]);
  const achievement = useCallback(() => trigger('achievement'), [trigger]);

  return {
    trigger,
    tap,
    success,
    levelUp,
    error,
    achievement,
    isSupported,
  };
}
