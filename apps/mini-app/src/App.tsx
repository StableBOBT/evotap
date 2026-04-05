import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Header, Navigation, SplashScreen, AchievementNotification } from './components';
import { GamePage } from './pages'; // Keep main page eager
import { AchievementsList } from './components/AchievementsList';
import { useUIStore } from './stores/uiStore';
import { useGameStore } from './stores/gameStore';

// Lazy load non-critical pages for better initial load performance
const LeaderboardPage = lazy(() => import('./pages/Leaderboard').then(m => ({ default: m.LeaderboardPage })));
const ProfilePage = lazy(() => import('./pages/Profile').then(m => ({ default: m.ProfilePage })));
const TasksPage = lazy(() => import('./pages/Tasks').then(m => ({ default: m.TasksPage })));
const TeamSelectionPage = lazy(() => import('./pages/TeamSelection').then(m => ({ default: m.TeamSelectionPage })));
const AirdropPage = lazy(() => import('./pages/Airdrop').then(m => ({ default: m.AirdropPage })));
const HowToPlayPage = lazy(() => import('./pages/HowToPlay').then(m => ({ default: m.HowToPlayPage })));

// Loading fallback for lazy pages
function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  );
}

export function App() {
  const { currentPage } = useUIStore();
  const { initialize, isInitialized } = useGameStore();

  const [showSplash, setShowSplash] = useState(true);

  // Initialize immediately on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'game':
        return <GamePage />;
      case 'leaderboard':
        return (
          <Suspense fallback={<PageLoader />}>
            <LeaderboardPage />
          </Suspense>
        );
      case 'profile':
        return (
          <Suspense fallback={<PageLoader />}>
            <ProfilePage />
          </Suspense>
        );
      case 'tasks':
        return (
          <Suspense fallback={<PageLoader />}>
            <TasksPage />
          </Suspense>
        );
      case 'teams':
        return (
          <Suspense fallback={<PageLoader />}>
            <TeamSelectionPage />
          </Suspense>
        );
      case 'achievements':
        return (
          <div className="flex-1 px-4 py-6 pb-24">
            <AchievementsList />
          </div>
        );
      case 'airdrop':
        return (
          <Suspense fallback={<PageLoader />}>
            <AirdropPage />
          </Suspense>
        );
      case 'howtoplay':
        return (
          <Suspense fallback={<PageLoader />}>
            <HowToPlayPage />
          </Suspense>
        );
      default:
        return <GamePage />;
    }
  };

  return (
    <>
      {/* Splash screen overlay */}
      {showSplash && (
        <SplashScreen
          isLoading={!isInitialized}
          progress={isInitialized ? 100 : 50}
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
