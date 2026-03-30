import { useCallback, useEffect, useRef, useState } from 'react';

type SoundName = 'tap' | 'success' | 'levelUp' | 'error' | 'achievement' | 'coin';

interface AudioConfig {
  src: string;
  volume?: number;
  preload?: boolean;
}

const STORAGE_KEY = 'evo_audio_settings';

interface AudioSettings {
  muted: boolean;
  volume: number;
}

const DEFAULT_SETTINGS: AudioSettings = {
  muted: false,
  volume: 0.5,
};

interface UseAudioReturn {
  play: (sound: SoundName) => void;
  preload: (sounds: SoundName[]) => void;
  setMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  isMuted: boolean;
  volume: number;
  isSupported: boolean;
}

const SOUND_PATHS: Record<SoundName, AudioConfig> = {
  tap: { src: '/sounds/tap.mp3', volume: 0.3, preload: true },
  success: { src: '/sounds/success.mp3', volume: 0.5 },
  levelUp: { src: '/sounds/level-up.mp3', volume: 0.7 },
  error: { src: '/sounds/error.mp3', volume: 0.4 },
  achievement: { src: '/sounds/achievement.mp3', volume: 0.6 },
  coin: { src: '/sounds/coin.mp3', volume: 0.4, preload: true },
};

function loadSettings(): AudioSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        muted: typeof parsed.muted === 'boolean' ? parsed.muted : DEFAULT_SETTINGS.muted,
        volume: typeof parsed.volume === 'number' ? parsed.volume : DEFAULT_SETTINGS.volume,
      };
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: AudioSettings): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}

export function useAudio(): UseAudioReturn {
  const audioCache = useRef<Map<SoundName, HTMLAudioElement>>(new Map());
  const [settings, setSettings] = useState<AudioSettings>(loadSettings);

  const isSupported =
    typeof window !== 'undefined' &&
    typeof Audio !== 'undefined';

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (!isSupported) return;

    const soundsToPreload = Object.entries(SOUND_PATHS)
      .filter(([, config]) => config.preload)
      .map(([name]) => name as SoundName);

    soundsToPreload.forEach((soundName) => {
      const config = SOUND_PATHS[soundName];
      if (!audioCache.current.has(soundName)) {
        try {
          const audio = new Audio(config.src);
          audio.preload = 'auto';
          audio.volume = (config.volume ?? 1) * settings.volume;
          audioCache.current.set(soundName, audio);
        } catch {
          // Ignore audio creation errors
        }
      }
    });
  }, [isSupported, settings.volume]);

  const getAudio = useCallback(
    (soundName: SoundName): HTMLAudioElement | null => {
      if (!isSupported) return null;

      const config = SOUND_PATHS[soundName];
      if (!config) {
        console.warn(`[useAudio] Unknown sound: ${soundName}`);
        return null;
      }

      let audio = audioCache.current.get(soundName);
      if (!audio) {
        try {
          audio = new Audio(config.src);
          audioCache.current.set(soundName, audio);
        } catch {
          return null;
        }
      }

      audio.volume = (config.volume ?? 1) * settings.volume;
      return audio;
    },
    [isSupported, settings.volume]
  );

  const play = useCallback(
    (soundName: SoundName) => {
      if (settings.muted || !isSupported) return;

      const audio = getAudio(soundName);
      if (!audio) return;

      audio.currentTime = 0;
      audio.play().catch(() => {
        // Ignore play errors (usually autoplay restrictions)
      });
    },
    [settings.muted, isSupported, getAudio]
  );

  const preload = useCallback(
    (sounds: SoundName[]) => {
      if (!isSupported) return;

      sounds.forEach((soundName) => {
        getAudio(soundName);
      });
    },
    [isSupported, getAudio]
  );

  const setMuted = useCallback((muted: boolean) => {
    setSettings((prev) => ({ ...prev, muted }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    setSettings((prev) => ({ ...prev, volume: clampedVolume }));
  }, []);

  const toggleMute = useCallback(() => {
    setSettings((prev) => ({ ...prev, muted: !prev.muted }));
  }, []);

  return {
    play,
    preload,
    setMuted,
    setVolume,
    toggleMute,
    isMuted: settings.muted,
    volume: settings.volume,
    isSupported,
  };
}
