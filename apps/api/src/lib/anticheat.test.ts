/**
 * Anti-Cheat System Tests
 * Tests for bot detection, emulator detection, and trust scoring
 */

import { describe, it, expect } from 'vitest';
import {
  analyzeTapBehavior,
  isEmulator,
  hashFingerprint,
  type TapEvent,
  type DeviceFingerprint,
} from './anticheat.js';

describe('analyzeTapBehavior', () => {
  it('should return insufficient_data for less than 10 taps', () => {
    const taps: TapEvent[] = [
      { timestamp: 1000, taps: 1 },
      { timestamp: 1100, taps: 1 },
    ];
    const result = analyzeTapBehavior(taps);
    expect(result.flags).toContain('insufficient_data');
    expect(result.score).toBe(50);
    expect(result.isSuspicious).toBe(false);
  });

  it('should detect low variance (bot-like) behavior', () => {
    // Bot-like: exact 100ms intervals
    const taps: TapEvent[] = Array.from({ length: 20 }, (_, i) => ({
      timestamp: i * 100,
      taps: 1,
    }));
    const result = analyzeTapBehavior(taps);
    expect(result.flags).toContain('low_variance');
    expect(result.score).toBeLessThan(100);
  });

  it('should detect superhuman speed', () => {
    // 30ms between taps is superhuman
    const taps: TapEvent[] = Array.from({ length: 20 }, (_, i) => ({
      timestamp: i * 30,
      taps: 1,
    }));
    const result = analyzeTapBehavior(taps);
    expect(result.flags).toContain('superhuman_speed');
  });

  it('should detect burst patterns', () => {
    const now = Date.now();
    // 100 taps in 10 seconds
    const taps: TapEvent[] = Array.from({ length: 100 }, (_, i) => ({
      timestamp: now - (99 - i) * 100,
      taps: 1,
    }));
    const result = analyzeTapBehavior(taps);
    expect(result.flags).toContain('burst_detected');
  });

  it('should flag missing pauses in long sessions', () => {
    // 60 taps with no pause > 2 seconds
    const taps: TapEvent[] = Array.from({ length: 60 }, (_, i) => ({
      timestamp: i * 500, // 500ms intervals, never > 2000ms
      taps: 1,
    }));
    const result = analyzeTapBehavior(taps);
    expect(result.flags).toContain('no_pauses');
  });

  it('should pass human-like behavior', () => {
    // Human-like: variable intervals with pauses
    const baseTime = Date.now();
    const taps: TapEvent[] = [
      { timestamp: baseTime, taps: 1 },
      { timestamp: baseTime + 150, taps: 1 },
      { timestamp: baseTime + 320, taps: 1 },
      { timestamp: baseTime + 510, taps: 1 },
      { timestamp: baseTime + 750, taps: 1 },
      { timestamp: baseTime + 3200, taps: 1 }, // pause
      { timestamp: baseTime + 3400, taps: 1 },
      { timestamp: baseTime + 3650, taps: 1 },
      { timestamp: baseTime + 3900, taps: 1 },
      { timestamp: baseTime + 4200, taps: 1 },
      { timestamp: baseTime + 4500, taps: 1 },
      { timestamp: baseTime + 4850, taps: 1 },
    ];
    const result = analyzeTapBehavior(taps);
    expect(result.isSuspicious).toBe(false);
    expect(result.score).toBeGreaterThan(50);
  });

  it('should flag extremely suspicious behavior with low score', () => {
    // Extremely bot-like: exact intervals, superhuman, no pauses
    const taps: TapEvent[] = Array.from({ length: 50 }, (_, i) => ({
      timestamp: i * 40, // 40ms intervals (superhuman + exact)
      taps: 1,
    }));
    const result = analyzeTapBehavior(taps);
    // Should have multiple flags and low score
    expect(result.flags.length).toBeGreaterThan(2);
    expect(result.isSuspicious).toBe(true);
    expect(result.score).toBeLessThan(50);
  });
});

describe('isEmulator', () => {
  it('should detect BlueStacks', () => {
    expect(isEmulator('Mozilla/5.0 (Linux; Android 9; HD1907 Build/PKQ1.190714.001) BlueStacks')).toBe(true);
  });

  it('should detect Nox', () => {
    expect(isEmulator('Mozilla/5.0 (Linux; Android 7.1.2; Nox Build/NHG47K)')).toBe(true);
  });

  it('should detect MEmu', () => {
    expect(isEmulator('Mozilla/5.0 (Linux; Android 9; MEmu Build/PI)')).toBe(true);
  });

  it('should detect LDPlayer', () => {
    expect(isEmulator('Mozilla/5.0 (Linux; Android 7.1.2; LDPlayer Build/N2G47O)')).toBe(true);
  });

  it('should detect Genymotion', () => {
    expect(isEmulator('Mozilla/5.0 (Linux; Android 8.0; Genymotion Custom Phone)')).toBe(true);
  });

  it('should detect Android SDK emulator', () => {
    // The emulator indicators include 'android sdk' and 'google_sdk'
    expect(isEmulator('Mozilla/5.0 (Linux; Android 11; google_sdk)')).toBe(true);
    expect(isEmulator('Mozilla/5.0 (Linux; Android 11; Android SDK built for x86_64)')).toBe(true);
  });

  it('should pass real devices', () => {
    // Real Samsung device
    expect(isEmulator('Mozilla/5.0 (Linux; Android 13; SM-G998B) AppleWebKit/537.36')).toBe(false);
    // Real iPhone
    expect(isEmulator('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(false);
    // Real Pixel
    expect(isEmulator('Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro)')).toBe(false);
  });
});

describe('hashFingerprint', () => {
  it('should generate consistent hash for same fingerprint', () => {
    const fp: DeviceFingerprint = {
      userAgent: 'test',
      screenWidth: 1920,
      screenHeight: 1080,
      colorDepth: 24,
      pixelRatio: 2,
      timezone: 'America/La_Paz',
      language: 'es-BO',
      platform: 'Android',
      touchSupport: true,
      maxTouchPoints: 5,
      canvasHash: 'abc123',
    };

    const hash1 = hashFingerprint(fp);
    const hash2 = hashFingerprint(fp);
    expect(hash1).toBe(hash2);
  });

  it('should generate different hash for different fingerprints', () => {
    const fp1: DeviceFingerprint = {
      userAgent: 'test',
      screenWidth: 1920,
      screenHeight: 1080,
      colorDepth: 24,
      pixelRatio: 2,
      timezone: 'America/La_Paz',
      language: 'es-BO',
      platform: 'Android',
      touchSupport: true,
      maxTouchPoints: 5,
    };

    const fp2: DeviceFingerprint = {
      ...fp1,
      screenWidth: 1080, // Different screen
      screenHeight: 2400,
    };

    const hash1 = hashFingerprint(fp1);
    const hash2 = hashFingerprint(fp2);
    expect(hash1).not.toBe(hash2);
  });

  it('should return valid hex string', () => {
    const fp: DeviceFingerprint = {
      userAgent: 'test',
      screenWidth: 1920,
      screenHeight: 1080,
      colorDepth: 24,
      pixelRatio: 2,
      timezone: 'UTC',
      language: 'en',
      platform: 'Win32',
      touchSupport: false,
      maxTouchPoints: 0,
    };

    const hash = hashFingerprint(fp);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });
});
