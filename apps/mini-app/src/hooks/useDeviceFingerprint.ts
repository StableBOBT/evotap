/**
 * Device Fingerprinting Hook
 * Collects device information for anti-cheat and Sybil detection
 */

import { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';
import { useTMA } from './useTMA';

export interface DeviceFingerprint {
  userAgent: string;
  screenWidth: number;
  screenHeight: number;
  colorDepth: number;
  pixelRatio: number;
  timezone: string;
  language: string;
  platform: string;
  touchSupport: boolean;
  maxTouchPoints: number;
  canvasHash: string;
}

interface UseDeviceFingerprintReturn {
  fingerprint: DeviceFingerprint | null;
  isRegistered: boolean;
  isSuspicious: boolean;
  accountsOnDevice: number;
  register: () => Promise<void>;
}

/**
 * Generate a canvas fingerprint hash
 */
function generateCanvasHash(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');

    if (!ctx) return 'no-canvas';

    // Draw some text and shapes
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('EVO Tap Fingerprint', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('EVO Tap Fingerprint', 4, 17);

    // Get data URL and hash it
    const dataUrl = canvas.toDataURL();
    let hash = 0;
    for (let i = 0; i < dataUrl.length; i++) {
      const char = dataUrl.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  } catch {
    return 'canvas-error';
  }
}

/**
 * Collect device fingerprint
 */
function collectFingerprint(): DeviceFingerprint {
  return {
    userAgent: navigator.userAgent,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    colorDepth: window.screen.colorDepth,
    pixelRatio: window.devicePixelRatio || 1,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform,
    touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    maxTouchPoints: navigator.maxTouchPoints || 0,
    canvasHash: generateCanvasHash(),
  };
}

/**
 * Hook to collect and register device fingerprint
 */
export function useDeviceFingerprint(): UseDeviceFingerprintReturn {
  const { initDataRaw } = useTMA();
  const [fingerprint, setFingerprint] = useState<DeviceFingerprint | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isSuspicious, setIsSuspicious] = useState(false);
  const [accountsOnDevice, setAccountsOnDevice] = useState(0);

  // Collect fingerprint on mount
  useEffect(() => {
    const fp = collectFingerprint();
    setFingerprint(fp);
  }, []);

  // Register fingerprint with backend
  const register = useCallback(async () => {
    if (!fingerprint || !initDataRaw || isRegistered) return;

    try {
      const response = await api.registerDevice(initDataRaw, fingerprint);

      if (response.success && response.data) {
        setIsRegistered(true);
        setIsSuspicious(response.data.isSuspicious);
        setAccountsOnDevice(response.data.accountsOnDevice);
      }
    } catch (error) {
      console.error('[useDeviceFingerprint] Registration failed:', error);
    }
  }, [fingerprint, initDataRaw, isRegistered]);

  // Auto-register on first load
  useEffect(() => {
    if (fingerprint && initDataRaw && !isRegistered) {
      register();
    }
  }, [fingerprint, initDataRaw, isRegistered, register]);

  return {
    fingerprint,
    isRegistered,
    isSuspicious,
    accountsOnDevice,
    register,
  };
}
