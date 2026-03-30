import { describe, it, expect, beforeEach } from 'vitest';
import { create } from 'zustand';

// Create a test version of the store without persistence
const INITIAL_MAX_ENERGY = 1000;

interface GameState {
  localScore: number;
  energy: number;
  maxEnergy: number;
  level: number;
  lastEnergyUpdate: number;
  pendingTaps: number;
  tap: () => boolean;
  clearPendingTaps: () => void;
  syncFromServer: (state: { points: number; energy: number; maxEnergy: number; level: number }) => void;
  reset: () => void;
}

const createTestStore = () =>
  create<GameState>((set, get) => ({
    localScore: 0,
    energy: INITIAL_MAX_ENERGY,
    maxEnergy: INITIAL_MAX_ENERGY,
    level: 1,
    lastEnergyUpdate: Date.now(),
    pendingTaps: 0,

    tap: () => {
      const state = get();
      if (state.energy <= 0) return false;

      set({
        localScore: state.localScore + 1,
        energy: state.energy - 1,
        pendingTaps: state.pendingTaps + 1,
      });
      return true;
    },

    clearPendingTaps: () => set({ pendingTaps: 0 }),

    syncFromServer: (serverState) => {
      set({
        localScore: serverState.points,
        energy: serverState.energy,
        maxEnergy: serverState.maxEnergy,
        level: serverState.level,
        lastEnergyUpdate: Date.now(),
      });
    },

    reset: () => {
      set({
        localScore: 0,
        energy: INITIAL_MAX_ENERGY,
        maxEnergy: INITIAL_MAX_ENERGY,
        level: 1,
        lastEnergyUpdate: Date.now(),
        pendingTaps: 0,
      });
    },
  }));

describe('gameStore', () => {
  let useStore: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    useStore = createTestStore();
  });

  describe('tap', () => {
    it('should increment score when tapping', () => {
      const store = useStore.getState();
      expect(store.localScore).toBe(0);

      const result = store.tap();

      expect(result).toBe(true);
      expect(useStore.getState().localScore).toBe(1);
    });

    it('should decrement energy when tapping', () => {
      const initialEnergy = useStore.getState().energy;
      useStore.getState().tap();

      expect(useStore.getState().energy).toBe(initialEnergy - 1);
    });

    it('should increment pending taps', () => {
      useStore.getState().tap();
      useStore.getState().tap();
      useStore.getState().tap();

      expect(useStore.getState().pendingTaps).toBe(3);
    });

    it('should return false when no energy', () => {
      // Create store with 0 energy
      useStore.setState({ energy: 0 });

      const result = useStore.getState().tap();

      expect(result).toBe(false);
    });

    it('should not change score when no energy', () => {
      useStore.setState({ energy: 0, localScore: 100 });

      useStore.getState().tap();

      expect(useStore.getState().localScore).toBe(100);
    });
  });

  describe('clearPendingTaps', () => {
    it('should reset pending taps to 0', () => {
      useStore.getState().tap();
      useStore.getState().tap();
      expect(useStore.getState().pendingTaps).toBe(2);

      useStore.getState().clearPendingTaps();

      expect(useStore.getState().pendingTaps).toBe(0);
    });
  });

  describe('syncFromServer', () => {
    it('should update state from server', () => {
      useStore.getState().syncFromServer({
        points: 5000,
        energy: 500,
        maxEnergy: 1500,
        level: 5,
      });

      const state = useStore.getState();
      expect(state.localScore).toBe(5000);
      expect(state.energy).toBe(500);
      expect(state.maxEnergy).toBe(1500);
      expect(state.level).toBe(5);
    });
  });

  describe('reset', () => {
    it('should reset all values to initial state', () => {
      // Modify state
      useStore.getState().tap();
      useStore.getState().syncFromServer({
        points: 5000,
        energy: 500,
        maxEnergy: 1500,
        level: 5,
      });

      // Reset
      useStore.getState().reset();

      const state = useStore.getState();
      expect(state.localScore).toBe(0);
      expect(state.energy).toBe(1000);
      expect(state.maxEnergy).toBe(1000);
      expect(state.level).toBe(1);
      expect(state.pendingTaps).toBe(0);
    });
  });
});
