import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateDeviceFingerprint,
  hashFingerprint,
  detectEmulator,
  calculateSuspicionScore,
} from '../deviceFingerprint';

describe('deviceFingerprint', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
  });

  describe('generateDeviceFingerprint', () => {
    it('should generate a complete fingerprint', () => {
      const fp = generateDeviceFingerprint();

      expect(fp).toHaveProperty('screenWidth');
      expect(fp).toHaveProperty('screenHeight');
      expect(fp).toHaveProperty('colorDepth');
      expect(fp).toHaveProperty('pixelRatio');
      expect(fp).toHaveProperty('timezone');
      expect(fp).toHaveProperty('timezoneOffset');
      expect(fp).toHaveProperty('userAgent');
      expect(fp).toHaveProperty('platform');
      expect(fp).toHaveProperty('language');
      expect(fp).toHaveProperty('languages');
      expect(fp).toHaveProperty('touchSupport');
      expect(fp).toHaveProperty('maxTouchPoints');
      expect(fp).toHaveProperty('canvasHash');
      expect(fp).toHaveProperty('webglVendor');
      expect(fp).toHaveProperty('webglRenderer');
      expect(fp).toHaveProperty('hardwareConcurrency');
      expect(fp).toHaveProperty('deviceMemory');
      expect(fp).toHaveProperty('timestamp');
    });

    it('should have numeric screen dimensions', () => {
      const fp = generateDeviceFingerprint();

      expect(typeof fp.screenWidth).toBe('number');
      expect(typeof fp.screenHeight).toBe('number');
      expect(fp.screenWidth).toBeGreaterThan(0);
      expect(fp.screenHeight).toBeGreaterThan(0);
    });

    it('should have valid timezone info', () => {
      const fp = generateDeviceFingerprint();

      expect(typeof fp.timezone).toBe('string');
      expect(fp.timezone.length).toBeGreaterThan(0);
      expect(typeof fp.timezoneOffset).toBe('number');
    });

    it('should have canvas hash', () => {
      const fp = generateDeviceFingerprint();

      expect(typeof fp.canvasHash).toBe('string');
      expect(fp.canvasHash.length).toBeGreaterThan(0);
    });
  });

  describe('hashFingerprint', () => {
    it('should generate consistent hash for same fingerprint', () => {
      const fp = generateDeviceFingerprint();
      const hash1 = hashFingerprint(fp);
      const hash2 = hashFingerprint(fp);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different fingerprints', () => {
      const fp1 = generateDeviceFingerprint();
      const fp2 = { ...fp1, screenWidth: fp1.screenWidth + 1 };

      const hash1 = hashFingerprint(fp1);
      const hash2 = hashFingerprint(fp2);

      expect(hash1).not.toBe(hash2);
    });

    it('should generate hash of length 10', () => {
      const fp = generateDeviceFingerprint();
      const hash = hashFingerprint(fp);

      expect(hash.length).toBe(10);
    });

    it('should ignore timestamp in hash (consistency)', () => {
      const fp1 = generateDeviceFingerprint();
      const fp2 = { ...fp1, timestamp: fp1.timestamp + 1000 };

      const hash1 = hashFingerprint(fp1);
      const hash2 = hashFingerprint(fp2);

      expect(hash1).toBe(hash2); // Should be same despite different timestamp
    });
  });

  describe('detectEmulator', () => {
    it('should detect BlueStacks', () => {
      const fp = {
        ...generateDeviceFingerprint(),
        userAgent: 'Mozilla/5.0 (Linux; Android 7.1.2; BlueStacks) AppleWebKit/537.36',
      };

      expect(detectEmulator(fp)).toBe(true);
    });

    it('should detect Nox', () => {
      const fp = {
        ...generateDeviceFingerprint(),
        userAgent: 'Mozilla/5.0 (Linux; Android 5.1.1; nox Build/LMY47I)',
      };

      expect(detectEmulator(fp)).toBe(true);
    });

    it('should not detect real devices', () => {
      const fp = {
        ...generateDeviceFingerprint(),
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
      };

      expect(detectEmulator(fp)).toBe(false);
    });

    it('should handle case-insensitive detection', () => {
      const fp = {
        ...generateDeviceFingerprint(),
        userAgent: 'Mozilla/5.0 (Linux; Android 7.1.2; BLUESTACKS)',
      };

      expect(detectEmulator(fp)).toBe(true);
    });
  });

  describe('calculateSuspicionScore', () => {
    it('should return 0 for typical device', () => {
      const fp = {
        ...generateDeviceFingerprint(),
        screenWidth: 390,
        screenHeight: 844,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
        touchSupport: true,
        hardwareConcurrency: 6,
        canvasHash: 'abc123',
      };

      const score = calculateSuspicionScore(fp);
      expect(score).toBe(0);
    });

    it('should detect emulator (high score)', () => {
      const fp = {
        ...generateDeviceFingerprint(),
        userAgent: 'Mozilla/5.0 (Linux; Android 7.1.2; BlueStacks)',
      };

      const score = calculateSuspicionScore(fp);
      expect(score).toBeGreaterThanOrEqual(50);
    });

    it('should detect suspicious screen resolution', () => {
      const fp = {
        ...generateDeviceFingerprint(),
        screenWidth: 1920,
        screenHeight: 1080,
        userAgent: 'Normal user agent',
      };

      const score = calculateSuspicionScore(fp);
      expect(score).toBeGreaterThan(0);
    });

    it('should detect mobile without touch', () => {
      const fp = {
        ...generateDeviceFingerprint(),
        userAgent: 'Mozilla/5.0 (Mobile)',
        touchSupport: false,
      };

      const score = calculateSuspicionScore(fp);
      expect(score).toBeGreaterThan(0);
    });

    it('should detect headless browser', () => {
      // Mock navigator.webdriver
      Object.defineProperty(navigator, 'webdriver', {
        get: () => true,
        configurable: true,
      });

      const fp = generateDeviceFingerprint();
      const score = calculateSuspicionScore(fp);

      expect(score).toBeGreaterThanOrEqual(30);

      // Cleanup
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
        configurable: true,
      });
    });

    it('should cap score at 100', () => {
      const fp = {
        ...generateDeviceFingerprint(),
        userAgent: 'BlueStacks',
        screenWidth: 1920,
        screenHeight: 1080,
        touchSupport: false,
        hardwareConcurrency: 0,
        canvasHash: 'no-canvas',
      };

      // Mock navigator.webdriver
      Object.defineProperty(navigator, 'webdriver', {
        get: () => true,
        configurable: true,
      });

      const score = calculateSuspicionScore(fp);
      expect(score).toBeLessThanOrEqual(100);

      // Cleanup
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
        configurable: true,
      });
    });
  });
});
