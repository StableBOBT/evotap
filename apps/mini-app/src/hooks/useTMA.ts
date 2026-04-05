import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  useLaunchParams,
  useSignal,
  initData,
  mainButton,
  backButton,
  hapticFeedback,
  viewport,
} from '@telegram-apps/sdk-react';

// Debug logging (temporarily enabled for diagnosis)
const DEBUG = true;
const log = (msg: string, data?: unknown) => {
  if (DEBUG) console.log(`[useTMA] ${msg}`, data ?? '');
};

interface TMAUser {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  isPremium?: boolean;
  languageCode?: string;
}

interface UseTMAReturn {
  user: TMAUser | null;
  initData: string | null;
  initDataRaw: string | null;
  isReady: boolean;
  isTelegramApp: boolean;

  // Haptic feedback
  impactLight: () => void;
  impactMedium: () => void;
  impactHeavy: () => void;
  notificationSuccess: () => void;
  notificationError: () => void;

  // Main button
  showMainButton: (text: string, onClick: () => void) => void;
  hideMainButton: () => void;

  // Back button
  showBackButton: (onClick: () => void) => void;
  hideBackButton: () => void;

  // Viewport
  isExpanded: boolean;
  expand: () => void;
}

// Safe wrapper that catches launch params errors
function useSafeLaunchParams() {
  try {
    const params = useLaunchParams();
    log('useLaunchParams result:', {
      hasInitDataRaw: !!params?.initDataRaw,
      initDataRawPreview: params?.initDataRaw ? String(params.initDataRaw).slice(0, 50) + '...' : 'null',
    });
    return params;
  } catch (error) {
    console.warn('[useTMA] Not in Telegram, using mock params:', error);

    // Fallback: Try to get from window.Telegram.WebApp
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const twa = window.Telegram.WebApp;
      log('Fallback to window.Telegram.WebApp', {
        hasInitData: !!twa.initData,
        initDataPreview: twa.initData ? twa.initData.slice(0, 50) + '...' : 'null',
      });

      return {
        initDataRaw: twa.initData || null,
        initData: twa.initDataUnsafe || null,
      } as any;
    }

    // Last resort: return null params
    return {
      initDataRaw: null,
      initData: null,
    } as any;
  }
}

export function useTMA(): UseTMAReturn {
  const [isReady, setIsReady] = useState(false);
  const [isTelegramApp, setIsTelegramApp] = useState(false);
  const [mainButtonCallback, setMainButtonCallback] = useState<(() => void) | null>(null);
  const [backButtonCallback, setBackButtonCallback] = useState<(() => void) | null>(null);

  // Get launch params safely
  const launchParams = useSafeLaunchParams();

  // Use signals for reactive state
  const initDataState = useSignal(initData.state);
  const viewportState = useSignal(viewport.state);

  useEffect(() => {
    // Check if we're in Telegram WebApp
    const isTg = typeof window !== 'undefined' && window.Telegram?.WebApp;
    setIsTelegramApp(!!isTg);
    setIsReady(true);

    log('Environment check:', {
      isTelegram: !!isTg,
      hasLaunchParams: !!launchParams,
      hasInitDataRaw: !!launchParams?.initDataRaw,
    });

    // Expand viewport if in Telegram
    if (isTg && viewport.expand.isAvailable()) {
      viewport.expand();
    }
  }, [launchParams]);

  // Subscribe to main button clicks
  useEffect(() => {
    if (!mainButtonCallback || !mainButton.onClick.isAvailable()) return;

    const off = mainButton.onClick(mainButtonCallback);
    return () => off();
  }, [mainButtonCallback]);

  // Subscribe to back button clicks
  useEffect(() => {
    if (!backButtonCallback || !backButton.onClick.isAvailable()) return;

    const off = backButton.onClick(backButtonCallback);
    return () => off();
  }, [backButtonCallback]);

  // Parse user from init data
  const user: TMAUser | null = initDataState?.user
    ? {
        id: initDataState.user.id,
        firstName: initDataState.user.first_name,
        lastName: initDataState.user.last_name,
        username: initDataState.user.username,
        isPremium: initDataState.user.is_premium,
        languageCode: initDataState.user.language_code,
      }
    : null;

  // Get raw init data string for API auth - memoized for stability
  const initDataRaw = useMemo(() => {
    // Try multiple sources in order of reliability
    let raw: string | null = null;

    // Source 1: launchParams (most reliable after SDK init)
    if (launchParams?.initDataRaw) {
      raw = String(launchParams.initDataRaw);
      log('initDataRaw from launchParams:', `${raw.slice(0, 50)}...`);
      return raw;
    }

    // Source 2: window.Telegram.WebApp (fallback)
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) {
      raw = window.Telegram.WebApp.initData;
      log('initDataRaw from Telegram.WebApp:', `${raw.slice(0, 50)}...`);
      return raw;
    }

    // Source 3: Check if SDK was initialized but data not in launchParams yet
    if (initDataState?.user?.id) {
      // SDK has user data but not raw string - this is a timing issue
      log('⚠️ initDataState has user but no initDataRaw - SDK timing issue');
    }

    log('⚠️ initDataRaw is null from all sources');
    return null;
  }, [launchParams?.initDataRaw, initDataState]);

  // Haptic feedback helpers
  const impactLight = useCallback(() => {
    if (hapticFeedback.impactOccurred.isAvailable()) {
      hapticFeedback.impactOccurred('light');
    }
  }, []);

  const impactMedium = useCallback(() => {
    if (hapticFeedback.impactOccurred.isAvailable()) {
      hapticFeedback.impactOccurred('medium');
    }
  }, []);

  const impactHeavy = useCallback(() => {
    if (hapticFeedback.impactOccurred.isAvailable()) {
      hapticFeedback.impactOccurred('heavy');
    }
  }, []);

  const notificationSuccess = useCallback(() => {
    if (hapticFeedback.notificationOccurred.isAvailable()) {
      hapticFeedback.notificationOccurred('success');
    }
  }, []);

  const notificationError = useCallback(() => {
    if (hapticFeedback.notificationOccurred.isAvailable()) {
      hapticFeedback.notificationOccurred('error');
    }
  }, []);

  // Main button helpers
  const showMainButton = useCallback((text: string, onClick: () => void) => {
    if (mainButton.setParams.isAvailable()) {
      mainButton.setParams({ text, isVisible: true });
      setMainButtonCallback(() => onClick);
    }
  }, []);

  const hideMainButton = useCallback(() => {
    if (mainButton.setParams.isAvailable()) {
      mainButton.setParams({ isVisible: false });
      setMainButtonCallback(null);
    }
  }, []);

  // Back button helpers
  const showBackButton = useCallback((onClick: () => void) => {
    if (backButton.show.isAvailable()) {
      backButton.show();
      setBackButtonCallback(() => onClick);
    }
  }, []);

  const hideBackButton = useCallback(() => {
    if (backButton.hide.isAvailable()) {
      backButton.hide();
      setBackButtonCallback(null);
    }
  }, []);

  // Viewport
  const isExpanded = viewportState?.isExpanded ?? true;
  const expand = useCallback(() => {
    if (viewport.expand.isAvailable()) {
      viewport.expand();
    }
  }, []);

  return {
    user,
    initData: initDataRaw, // alias for compatibility
    initDataRaw,
    isReady,
    isTelegramApp,
    impactLight,
    impactMedium,
    impactHeavy,
    notificationSuccess,
    notificationError,
    showMainButton,
    hideMainButton,
    showBackButton,
    hideBackButton,
    isExpanded,
    expand,
  };
}
