/**
 * Telegram SDK Initialization - Robust & Scalable
 *
 * This module provides a production-ready initialization sequence for the Telegram Mini App SDK.
 * It handles edge cases, provides retry logic, and includes comprehensive error handling.
 *
 * @module telegram-sdk
 */

import {
  init as initSDK,
  initData,
  miniApp,
  themeParams,
  viewport,
  backButton,
  retrieveLaunchParams,
} from '@telegram-apps/sdk-react';

interface InitResult {
  success: boolean;
  initDataRaw: string | null;
  userId: number | null;
  error?: string;
  warnings: string[];
}

/**
 * Initialize Telegram SDK with retry logic and comprehensive error handling
 *
 * @returns Promise<InitResult> - Result of initialization including any warnings/errors
 */
export async function initializeTelegramSDK(): Promise<InitResult> {
  const warnings: string[] = [];
  const result: InitResult = {
    success: false,
    initDataRaw: null,
    userId: null,
    warnings,
  };

  try {
    // Step 1: Initialize the SDK core
    console.log('[TelegramSDK] Initializing SDK...');
    initSDK();

    console.log('[TelegramSDK] Restoring initData...');
    try {
      initData.restore();
      console.log('[TelegramSDK] initData.restore() completed');
    } catch (e) {
      const warning = `Failed to restore initData: ${String(e)}`;
      console.warn('[TelegramSDK]', warning);
      warnings.push(warning);
    }

    // Step 3: Mount miniApp component
    if (miniApp.mount.isAvailable()) {
      miniApp.mount();
      console.log('[TelegramSDK] miniApp mounted');

      // Signal that app is ready
      if (miniApp.ready.isAvailable()) {
        miniApp.ready();
        console.log('[TelegramSDK] miniApp.ready() called');
      }
    } else {
      warnings.push('miniApp.mount not available - may not be in Telegram environment');
    }

    if (themeParams.mount.isAvailable()) {
      themeParams.mount();
      console.log('[TelegramSDK] themeParams mounted');
    }

    // Step 5: Expand viewport to full screen
    if (viewport.expand.isAvailable()) {
      viewport.expand();
      console.log('[TelegramSDK] Viewport expanded');
    } else {
      warnings.push('viewport.expand not available');
    }

    if (backButton.mount.isAvailable()) {
      backButton.mount();
      console.log('[TelegramSDK] Back button mounted');
    }

    // Step 7: Retrieve and validate initData
    let initDataRaw: string | null = null;
    let userId: number | null = null;

    try {
      // Method 1: Get raw initData from launch params
      const launchParams = retrieveLaunchParams();
      if (launchParams?.initDataRaw) {
        initDataRaw = String(launchParams.initDataRaw);
        console.log('[TelegramSDK] initDataRaw from launchParams:', initDataRaw.slice(0, 50) + '...');
      } else {
        console.warn('[TelegramSDK] launchParams.initDataRaw is null');
      }

      // Method 2: Get from initData.state
      if (initData.state) {
        const state = initData.state();
        if (state?.user?.id) {
          userId = state.user.id;
          console.log('[TelegramSDK] User ID from state:', userId);
        }
      }

      // Method 3: Fallback to window.Telegram.WebApp
      if (!initDataRaw && typeof window !== 'undefined' && window.Telegram?.WebApp) {
        const twa = window.Telegram.WebApp;
        if (twa.initData) {
          initDataRaw = twa.initData;
          console.log('[TelegramSDK] initDataRaw from Telegram.WebApp:', initDataRaw.slice(0, 50) + '...');
        }
        if (twa.initDataUnsafe?.user?.id) {
          userId = twa.initDataUnsafe.user.id;
          console.log('[TelegramSDK] User ID from WebApp:', userId);
        }
      }
    } catch (e) {
      const warning = `Failed to retrieve initData: ${e}`;
      console.warn('[TelegramSDK]', warning);
      warnings.push(warning);
    }

    // Step 8: Validate result
    if (!initDataRaw) {
      const error = 'initDataRaw is null - user not authenticated';
      console.error('[TelegramSDK]', error);
      result.error = error;
      result.success = false;
    } else {
      result.success = true;
      result.initDataRaw = initDataRaw;
      result.userId = userId;
      console.log('[TelegramSDK] ✅ Initialization successful');
    }

    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[TelegramSDK] Fatal error during initialization:', errorMsg);
    result.error = errorMsg;
    result.success = false;
    return result;
  }
}

/**
 * Check if running inside Telegram environment
 */
export function isTelegramEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window.Telegram?.WebApp);
}

/**
 * Get current Telegram Web App instance
 */
export function getTelegramWebApp() {
  if (typeof window === 'undefined') return null;
  return window.Telegram?.WebApp || null;
}

/**
 * Retry initialization with exponential backoff
 *
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param initialDelay - Initial delay in ms (default: 1000)
 * @returns Promise<InitResult>
 */
export async function initializeTelegramSDKWithRetry(
  maxRetries = 3,
  initialDelay = 1000
): Promise<InitResult> {
  let lastResult: InitResult | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`[TelegramSDK] Initialization attempt ${attempt}/${maxRetries}`);

    lastResult = await initializeTelegramSDK();

    if (lastResult.success) {
      console.log('[TelegramSDK] ✅ Initialization succeeded on attempt', attempt);
      return lastResult;
    }

    if (attempt < maxRetries) {
      const delay = initialDelay * Math.pow(2, attempt - 1);
      console.log(`[TelegramSDK] ⏳ Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  console.error('[TelegramSDK] ❌ All initialization attempts failed');
  return lastResult || {
    success: false,
    initDataRaw: null,
    userId: null,
    error: 'All retry attempts failed',
    warnings: [],
  };
}

// Type augmentation for window.Telegram (only if not already defined)
// Note: This may conflict with @telegram-apps/sdk-react types
// If so, remove this declaration and rely on SDK types
