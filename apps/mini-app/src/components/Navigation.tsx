import { useUIStore } from '../stores/uiStore';

interface TabConfig {
  id: 'game' | 'leaderboard' | 'tasks' | 'airdrop' | 'profile';
  label: string;
  icon: React.ReactNode;
}

const GameIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M21.58,16.09l-1.09-7.66A3.24,3.24,0,0,0,17.28,6H6.72A3.24,3.24,0,0,0,3.51,8.43L2.42,16.09A3.25,3.25,0,0,0,5.63,20h0a3.25,3.25,0,0,0,2.71-1.46L10,16h4l1.66,2.54A3.25,3.25,0,0,0,18.37,20h0A3.25,3.25,0,0,0,21.58,16.09ZM9,11H8v1a1,1,0,0,1-2,0V11H5a1,1,0,0,1,0-2H6V8A1,1,0,0,1,8,8V9H9a1,1,0,0,1,0,2Zm6,1a1,1,0,1,1,1-1A1,1,0,0,1,15,12Zm2-3a1,1,0,1,1,1-1A1,1,0,0,1,17,9Z" />
  </svg>
);

const LeaderboardIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17,2H7A2,2,0,0,0,5,4V20a2,2,0,0,0,2,2H17a2,2,0,0,0,2-2V4A2,2,0,0,0,17,2ZM9,18a1,1,0,1,1,1-1A1,1,0,0,1,9,18Zm0-4a1,1,0,1,1,1-1A1,1,0,0,1,9,14Zm0-4a1,1,0,1,1,1-1A1,1,0,0,1,9,10Zm6,8H13a1,1,0,0,1,0-2h2a1,1,0,0,1,0,2Zm0-4H13a1,1,0,0,1,0-2h2a1,1,0,0,1,0,2Zm0-4H13a1,1,0,0,1,0-2h2a1,1,0,0,1,0,2Z" />
  </svg>
);

const TasksIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19,3H5A2,2,0,0,0,3,5V19a2,2,0,0,0,2,2H19a2,2,0,0,0,2-2V5A2,2,0,0,0,19,3ZM10,17.41l-3.71-3.7a1,1,0,0,1,1.42-1.42L10,14.59l5.29-5.3a1,1,0,0,1,1.42,1.42Z" />
  </svg>
);

const ProfileIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12,12A5,5,0,1,0,7,7,5,5,0,0,0,12,12Zm0,2c-3.33,0-10,1.67-10,5v2a1,1,0,0,0,1,1H21a1,1,0,0,0,1-1V19C22,15.67,15.33,14,12,14Z" />
  </svg>
);

const AirdropIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12,2A10,10,0,0,0,2,12a9.89,9.89,0,0,0,2.26,6.33l-2,2a1,1,0,0,0-.21,1.09A1,1,0,0,0,3,22h9A10,10,0,0,0,12,2Zm0,18H5.41l.93-.93a1,1,0,0,0,.3-.71,1,1,0,0,0-.3-.7A8,8,0,1,1,12,20Z" />
    <path d="M12,6a1,1,0,0,0-1,1v3.59l-2.29,2.3a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l2.59-2.59A1,1,0,0,0,13,11V7A1,1,0,0,0,12,6Z" />
  </svg>
);

const tabs: TabConfig[] = [
  { id: 'game', label: 'Game', icon: <GameIcon /> },
  { id: 'leaderboard', label: 'Ranks', icon: <LeaderboardIcon /> },
  { id: 'tasks', label: 'Tasks', icon: <TasksIcon /> },
  { id: 'airdrop', label: 'Airdrop', icon: <AirdropIcon /> },
  { id: 'profile', label: 'Profile', icon: <ProfileIcon /> },
];

export function Navigation() {
  const { currentPage, setPage } = useUIStore();

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass-nav safe-area-bottom z-50">
      <div className="flex justify-around items-center h-[72px] px-2">
        {tabs.map((tab) => {
          const isActive = currentPage === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setPage(tab.id)}
              className={`
                nav-item
                flex flex-col items-center justify-center
                w-full h-full py-2 px-1
                ${isActive ? 'active' : ''}
              `}
            >
              {/* Icon container with glow effect when active */}
              <div
                className={`
                  nav-icon relative p-2 rounded-xl mb-1
                  transition-all duration-300 ease-out
                  ${isActive
                    ? 'bg-gradient-to-br from-[var(--gradient-start)]/20 to-[var(--gradient-accent)]/20'
                    : ''
                  }
                `}
              >
                {/* Glow behind icon when active */}
                {isActive && (
                  <div
                    className="absolute inset-0 rounded-xl blur-md opacity-50"
                    style={{
                      background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-accent))',
                    }}
                  />
                )}

                {/* Icon */}
                <div
                  className={`
                    relative z-10
                    transition-colors duration-300
                    ${isActive ? 'text-white' : 'text-white/40'}
                  `}
                >
                  {tab.icon}
                </div>
              </div>

              {/* Label */}
              <span
                className={`
                  text-[11px] font-medium tracking-wide
                  transition-colors duration-300
                  ${isActive
                    ? 'text-gradient font-semibold'
                    : 'text-white/40'
                  }
                `}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
