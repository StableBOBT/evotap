/**
 * Redis Utility Tests
 * Tests for date key generation and user state management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getCurrentDateKey,
  getCurrentWeekKey,
  getCurrentMonthKey,
} from './redis.js';

describe('getCurrentDateKey', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return date in YYYY-MM-DD format', () => {
    vi.setSystemTime(new Date('2024-03-15T12:00:00Z'));
    expect(getCurrentDateKey()).toBe('2024-03-15');
  });

  it('should handle month boundaries', () => {
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    expect(getCurrentDateKey()).toBe('2024-01-01');

    vi.setSystemTime(new Date('2024-12-31T23:59:59Z'));
    expect(getCurrentDateKey()).toBe('2024-12-31');
  });

  it('should handle leap year', () => {
    vi.setSystemTime(new Date('2024-02-29T12:00:00Z'));
    expect(getCurrentDateKey()).toBe('2024-02-29');
  });
});

describe('getCurrentWeekKey', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return Monday of current week', () => {
    // Wednesday March 13, 2024
    vi.setSystemTime(new Date('2024-03-13T12:00:00Z'));
    expect(getCurrentWeekKey()).toBe('2024-03-11'); // Monday
  });

  it('should handle Monday correctly', () => {
    // Monday March 11, 2024
    vi.setSystemTime(new Date('2024-03-11T12:00:00Z'));
    expect(getCurrentWeekKey()).toBe('2024-03-11');
  });

  it('should handle Sunday correctly', () => {
    // Sunday March 17, 2024
    vi.setSystemTime(new Date('2024-03-17T12:00:00Z'));
    expect(getCurrentWeekKey()).toBe('2024-03-11'); // Previous Monday
  });

  it('should handle year boundaries', () => {
    // Tuesday Jan 2, 2024 (week starts Dec 31, 2023 or Jan 1)
    vi.setSystemTime(new Date('2024-01-02T12:00:00Z'));
    const weekKey = getCurrentWeekKey();
    expect(weekKey).toMatch(/2024-01-01|2023-12-31/);
  });
});

describe('getCurrentMonthKey', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return YYYY-MM format', () => {
    vi.setSystemTime(new Date('2024-03-15T12:00:00Z'));
    expect(getCurrentMonthKey()).toBe('2024-03');
  });

  it('should handle January', () => {
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    expect(getCurrentMonthKey()).toBe('2024-01');
  });

  it('should handle December', () => {
    vi.setSystemTime(new Date('2024-12-15T12:00:00Z'));
    expect(getCurrentMonthKey()).toBe('2024-12');
  });

  it('should pad single digit months', () => {
    vi.setSystemTime(new Date('2024-05-01T12:00:00Z'));
    expect(getCurrentMonthKey()).toBe('2024-05');
  });
});
