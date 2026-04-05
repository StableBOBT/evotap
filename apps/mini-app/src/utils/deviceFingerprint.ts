/**
 * Device Fingerprinting for Anti-Cheat
 *
 * Generates a unique fingerprint based on device characteristics
 * Used by backend to detect multi-accounting and bot behavior
 */

export interface DeviceFingerprint {
  // Screen characteristics
  screenWidth: number;
  screenHeight: number;
  screenAvailWidth: number;
  screenAvailHeight: number;
  colorDepth: number;
  pixelRatio: number;

  // Timezone
  timezone: string;
  timezoneOffset: number;

  // Browser/Platform
  userAgent: string;
  platform: string;
  language: string;
  languages: string[];

  // Touch capabilities
  touchSupport: boolean;
  maxTouchPoints: number;

  // Canvas fingerprint (hash)
  canvasHash: string;

  // WebGL fingerprint
  webglVendor: string | null;
  webglRenderer: string | null;

  // Hardware concurrency
  hardwareConcurrency: number;

  // Device memory (if available)
  deviceMemory: number | null;

  // Timestamp
  timestamp: number;
}

/**
 * Generate canvas fingerprint
 */
function generateCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-canvas';

    canvas.width = 200;
    canvas.height = 50;

    // Draw text
    ctx.textBaseline = 'alphabetic';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('EVO Tap 🎮', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Device FP', 4, 45);

    // Get image data
    const dataURL = canvas.toDataURL();

    // Simple hash (non-cryptographic)
    let hash = 0;
    for (let i = 0; i < dataURL.length; i++) {
      const char = dataURL.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return Math.abs(hash).toString(36);
  } catch {
    return 'canvas-error';
  }
}

/**
 * Get WebGL vendor and renderer
 */
function getWebGLInfo(): { vendor: string | null; renderer: string | null } {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return { vendor: null, renderer: null };

    const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return { vendor: null, renderer: null };

    return {
      vendor: (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
      renderer: (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
    };
  } catch {
    return { vendor: null, renderer: null };
  }
}

/**
 * Generate complete device fingerprint
 */
export function generateDeviceFingerprint(): DeviceFingerprint {
  const webglInfo = getWebGLInfo();

  return {
    // Screen
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    screenAvailWidth: window.screen.availWidth,
    screenAvailHeight: window.screen.availHeight,
    colorDepth: window.screen.colorDepth,
    pixelRatio: window.devicePixelRatio || 1,

    // Timezone
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),

    // Browser
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    languages: Array.from(navigator.languages || [navigator.language]),

    // Touch
    touchSupport: 'ontouchstart' in window,
    maxTouchPoints: navigator.maxTouchPoints || 0,

    // Canvas fingerprint
    canvasHash: generateCanvasFingerprint(),

    // WebGL
    webglVendor: webglInfo.vendor,
    webglRenderer: webglInfo.renderer,

    // Hardware
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    deviceMemory: (navigator as any).deviceMemory || null,

    // Timestamp
    timestamp: Date.now(),
  };
}

/**
 * Generate a consistent hash from fingerprint
 * Used as device_id for backend tracking
 */
export function hashFingerprint(fp: DeviceFingerprint): string {
  // Combine stable characteristics (exclude timestamp)
  const data = JSON.stringify({
    screen: `${fp.screenWidth}x${fp.screenHeight}`,
    color: fp.colorDepth,
    platform: fp.platform,
    language: fp.language,
    canvas: fp.canvasHash,
    webgl: `${fp.webglVendor}-${fp.webglRenderer}`,
    hardware: fp.hardwareConcurrency,
  });

  // Simple hash (non-cryptographic, for consistency)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return Math.abs(hash).toString(36).padStart(10, '0');
}

/**
 * Detect potential emulators
 */
export function detectEmulator(fp: DeviceFingerprint): boolean {
  const ua = fp.userAgent.toLowerCase();

  const emulatorIndicators = [
    'bluestacks',
    'nox',
    'memu',
    'ldplayer',
    'genymotion',
    'android sdk',
    'google_sdk',
    'emulator',
    'virtualbox',
    'vmware',
  ];

  return emulatorIndicators.some(indicator => ua.includes(indicator));
}

/**
 * Calculate suspicion score (0-100)
 * Higher = more suspicious
 */
export function calculateSuspicionScore(fp: DeviceFingerprint): number {
  let score = 0;

  // Emulator detected
  if (detectEmulator(fp)) {
    score += 50;
  }

  // Unusual screen resolution (too perfect or too small)
  if (fp.screenWidth === 1920 && fp.screenHeight === 1080) {
    score += 10; // Very common bot resolution
  }
  if (fp.screenWidth < 320 || fp.screenHeight < 480) {
    score += 15; // Suspiciously small
  }

  // No touch support on mobile-like device
  if (fp.userAgent.includes('Mobile') && !fp.touchSupport) {
    score += 20;
  }

  // Hardware concurrency seems fake
  if (fp.hardwareConcurrency === 0 || fp.hardwareConcurrency > 32) {
    score += 10;
  }

  // Canvas fingerprint failed
  if (fp.canvasHash === 'no-canvas' || fp.canvasHash === 'canvas-error') {
    score += 15;
  }

  // Headless indicators
  if (navigator.webdriver) {
    score += 30;
  }

  return Math.min(score, 100);
}
