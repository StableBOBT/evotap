import { create } from 'zustand';

interface FloatingScore {
  id: string;
  value: number;
  x: number;
  y: number;
}

interface UIState {
  // Navigation
  currentPage: 'game' | 'leaderboard' | 'profile' | 'tasks' | 'teams' | 'achievements' | 'airdrop';

  // Modals
  isWalletModalOpen: boolean;
  isSettingsOpen: boolean;

  // Floating scores for tap feedback
  floatingScores: FloatingScore[];

  // Loading states
  isLoading: boolean;
  loadingMessage: string;

  // Actions
  setPage: (page: UIState['currentPage']) => void;
  openWalletModal: () => void;
  closeWalletModal: () => void;
  toggleSettings: () => void;
  addFloatingScore: (value: number, x: number, y: number) => void;
  removeFloatingScore: (id: string) => void;
  setLoading: (isLoading: boolean, message?: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  currentPage: 'game',
  isWalletModalOpen: false,
  isSettingsOpen: false,
  floatingScores: [],
  isLoading: false,
  loadingMessage: '',

  setPage: (page) => set({ currentPage: page }),

  openWalletModal: () => set({ isWalletModalOpen: true }),

  closeWalletModal: () => set({ isWalletModalOpen: false }),

  toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),

  addFloatingScore: (value, x, y) => {
    const id = `${Date.now()}-${Math.random()}`;
    set((state) => ({
      floatingScores: [...state.floatingScores, { id, value, x, y }],
    }));

    // Auto-remove after animation
    setTimeout(() => {
      set((state) => ({
        floatingScores: state.floatingScores.filter((s) => s.id !== id),
      }));
    }, 800);
  },

  removeFloatingScore: (id) =>
    set((state) => ({
      floatingScores: state.floatingScores.filter((s) => s.id !== id),
    })),

  setLoading: (isLoading, message = '') =>
    set({ isLoading, loadingMessage: message }),
}));
