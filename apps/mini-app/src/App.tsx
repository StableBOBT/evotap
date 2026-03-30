import { useState, useEffect, useCallback } from 'react';
import { Header, Navigation, SplashScreen, AchievementNotification } from './components';
import { GamePage, LeaderboardPage, ProfilePage, TasksPage, TeamSelectionPage, AirdropPage, HowToPlayPage } from './pages';
import { AchievementsList } from './components/AchievementsList';
import { useUIStore } from './stores/uiStore';
import { useGameStore } from './stores/gameStore';

// Fast loading - max 2 seconds total
const MAX_LOAD_TIME = 2000;

export function App() {
  const { currentPage } = useUIStore();
  const { initialize } = useGameStore();

  const [showSplash, setShowSplash] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fast initialization with hard timeout
  useEffect(() => {
    let mounted = true;
    const startTime = Date.now();

    const runInit = async () => {
      // Start progress animation immediately
      const progressInterval = setInterval(() => {
        if (!mounted) {
          clearInterval(progressInterval);
          return;
        }
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / MAX_LOAD_TIME) * 100, 95);
        setLoadProgress(progress);
      }, 50);

      // Initialize game state (has its own timeout)
      try {
        await initialize();
      } catch (e) {
        console.warn('[App] Init warning:', e);
      }

      // Clear progress interval and complete
      clearInterval(progressInterval);

      if (mounted) {
        setLoadProgress(100);
        // Small delay for smooth animation
        setTimeout(() => {
          if (mounted) setIsLoading(false);
        }, 200);
      }
    };

    // Force complete after MAX_LOAD_TIME regardless
    const forceComplete = setTimeout(() => {
      if (mounted && isLoading) {
        console.warn('[App] Force completing load');
        setLoadProgress(100);
        setIsLoading(false);
      }
    }, MAX_LOAD_TIME);

    runInit();

    return () => {
      mounted = false;
      clearTimeout(forceComplete);
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
      case 'howtoplay':
        return <HowToPlayPage />;
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
