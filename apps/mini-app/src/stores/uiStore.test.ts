import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useUIStore } from './uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset store state
    useUIStore.setState({
      currentPage: 'game',
      isWalletModalOpen: false,
      isSettingsOpen: false,
      floatingScores: [],
      isLoading: false,
      loadingMessage: '',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('setPage', () => {
    it('should update current page', () => {
      useUIStore.getState().setPage('leaderboard');
      expect(useUIStore.getState().currentPage).toBe('leaderboard');

      useUIStore.getState().setPage('profile');
      expect(useUIStore.getState().currentPage).toBe('profile');
    });
  });

  describe('wallet modal', () => {
    it('should open wallet modal', () => {
      useUIStore.getState().openWalletModal();
      expect(useUIStore.getState().isWalletModalOpen).toBe(true);
    });

    it('should close wallet modal', () => {
      useUIStore.getState().openWalletModal();
      useUIStore.getState().closeWalletModal();
      expect(useUIStore.getState().isWalletModalOpen).toBe(false);
    });
  });

  describe('settings', () => {
    it('should toggle settings', () => {
      expect(useUIStore.getState().isSettingsOpen).toBe(false);

      useUIStore.getState().toggleSettings();
      expect(useUIStore.getState().isSettingsOpen).toBe(true);

      useUIStore.getState().toggleSettings();
      expect(useUIStore.getState().isSettingsOpen).toBe(false);
    });
  });

  describe('floating scores', () => {
    it('should add floating score', () => {
      useUIStore.getState().addFloatingScore(10, 100, 200);

      const scores = useUIStore.getState().floatingScores;
      expect(scores).toHaveLength(1);
      expect(scores[0].value).toBe(10);
      expect(scores[0].x).toBe(100);
      expect(scores[0].y).toBe(200);
    });

    it('should auto-remove floating score after 800ms', () => {
      useUIStore.getState().addFloatingScore(10, 100, 200);
      expect(useUIStore.getState().floatingScores).toHaveLength(1);

      vi.advanceTimersByTime(800);

      expect(useUIStore.getState().floatingScores).toHaveLength(0);
    });

    it('should remove specific floating score', () => {
      useUIStore.getState().addFloatingScore(10, 100, 200);
      const scoreId = useUIStore.getState().floatingScores[0].id;

      useUIStore.getState().removeFloatingScore(scoreId);

      expect(useUIStore.getState().floatingScores).toHaveLength(0);
    });
  });

  describe('loading state', () => {
    it('should set loading state', () => {
      useUIStore.getState().setLoading(true, 'Loading...');

      expect(useUIStore.getState().isLoading).toBe(true);
      expect(useUIStore.getState().loadingMessage).toBe('Loading...');
    });

    it('should clear loading state', () => {
      useUIStore.getState().setLoading(true, 'Loading...');
      useUIStore.getState().setLoading(false);

      expect(useUIStore.getState().isLoading).toBe(false);
      expect(useUIStore.getState().loadingMessage).toBe('');
    });
  });
});
