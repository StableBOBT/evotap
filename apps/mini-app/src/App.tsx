import { useState, useEffect, useCallback } from 'react';
import { Header, Navigation, SplashScreen, AchievementNotification } from './components';
import { GamePage, LeaderboardPage, ProfilePage, TasksPage, TeamSelectionPage, AirdropPage } from './pages';
import { AchievementsList } from './components/AchievementsList';
import { useUIStore } from './stores/uiStore';
import { useGameStore } from './stores/gameStore';

// Loading stages with their progress weights
const LOADING_STAGES = {
  SDK_INIT: { weight: 20, label: 'Initializing SDK...' },
  CLOUD_STORAGE: { weight: 40, label: 'Loading your progress...' },
  ASSETS: { weight: 30, label: 'Preparing game...' },
  READY: { weight: 10, label: 'Almost ready...' },
} as const;

export function App() {
  const { currentPage } = useUIStore();
  const { initialize } = useGameStore();

  const [showSplash, setShowSplash] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Simulate loading progress with actual initialization
  useEffect(() => {
    let mounted = true;

    const runInitialization = async () => {
      // Stage 1: SDK initialization (simulated - already done in main.tsx)
      await simulateProgress(LOADING_STAGES.SDK_INIT.weight, 300);
      if (!mounted) return;

      // Stage 2: Cloud storage / game state initialization
      setLoadProgress((prev) => prev + 5);
      try {
        await initialize();
      } catch (error) {
        console.warn('[App] Game initialization warning:', error);
      }
      if (!mounted) return;
      setLoadProgress(LOADING_STAGES.SDK_INIT.weight + LOADING_STAGES.CLOUD_STORAGE.weight);

      // Stage 3: Asset preloading (simulated for smooth UX)
      await simulateProgress(LOADING_STAGES.ASSETS.weight, 400);
      if (!mounted) return;

      // Stage 4: Final ready state
      await simulateProgress(LOADING_STAGES.READY.weight, 200);
      if (!mounted) return;

      setLoadProgress(100);
      setIsLoading(false);
    };

    const simulateProgress = (amount: number, duration: number): Promise<void> => {
      return new Promise((resolve) => {
        const steps = 10;
        const stepDuration = duration / steps;
        const stepAmount = amount / steps;
        let currentStep = 0;

        const interval = setInterval(() => {
          if (!mounted) {
            clearInterval(interval);
            resolve();
            return;
          }

          currentStep++;
          setLoadProgress((prev) => Math.min(prev + stepAmount, 100));

          if (currentStep >= steps) {
            clearInterval(interval);
            resolve();
          }
        }, stepDuration);
      });
    };

    runInitialization();

    return () => {
      mounted = false;
    };
  }, [initialize]);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'game':
        return <GamePage />;
      case 'leaderboard':
        return <LeaderboardPage />;
      case 'profile':
        return <ProfilePage />;
      case 'tasks':
        return <TasksPage />;
      case 'teams':
        return <TeamSelectionPage />;
      case 'achievements':
        return (
          <div className="flex-1 px-4 py-6 pb-24">
            <AchievementsList />
          </div>
        );
      case 'airdrop':
        return <AirdropPage />;
      default:
        return <GamePage />;
    }
  };

  return (
    <>
      {/* Splash screen overlay */}
      {showSplash && (
        <SplashScreen
          isLoading={isLoading}
          progress={loadProgress}
          onComplete={handleSplashComplete}
        />
      )}

      {/* Achievement notification overlay */}
      <AchievementNotification />

      {/* Main app content */}
      <div className="flex flex-col h-screen bg-tg-bg overflow-hidden">
        <Header />
        <main className="flex-1 flex flex-col overflow-y-auto pb-20">
          {renderPage()}
        </main>
        <Navigation />
      </div>
    </>
  );
}
