import { useTonConnect } from '../hooks/useTonConnect';
import { useTMA } from '../hooks/useTMA';

export function Header() {
  const { user } = useTMA();
  const { isConnected, friendlyAddress, connect, disconnect } = useTonConnect();

  const truncateAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <header className="glass-header sticky top-0 z-50 safe-area-top">
      <div className="flex items-center justify-between px-4 py-3">
        {/* User info */}
        <div className="flex items-center gap-3">
          {/* Avatar with gradient border */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-accent)] rounded-full blur-sm opacity-60" />
            <div className="relative w-11 h-11 rounded-full bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] p-[2px]">
              <div className="w-full h-full rounded-full bg-[var(--bg-dark)] flex items-center justify-center">
                <span className="text-lg font-bold text-gradient">
                  {user?.firstName?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
            </div>
          </div>

          {/* Name and premium badge */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white text-sm">
                {user?.firstName || 'Player'}
              </span>
              {user?.isPremium && (
                <span className="chip-premium flex items-center gap-1">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  PRO
                </span>
              )}
            </div>
            <span className="text-xs text-white/40">Tap to earn</span>
          </div>
        </div>

        {/* Wallet button */}
        <button
          onClick={isConnected ? disconnect : connect}
          className={`
            relative overflow-hidden
            px-4 py-2.5 rounded-xl text-sm font-semibold
            transition-all duration-300 ease-out
            ${isConnected
              ? 'glass border-green-500/30'
              : 'btn-gradient'
            }
          `}
        >
          {/* Connected state */}
          {isConnected ? (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 font-mono-game text-xs">
                {truncateAddress(friendlyAddress || '')}
              </span>
            </div>
          ) : (
            /* Disconnected state */
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M21.64,13.67a.91.91,0,0,1-.91-.91V9.43A4.52,4.52,0,0,0,16.2,5H7.8A4.52,4.52,0,0,0,3.27,9.43v3.33a.91.91,0,0,1-1.82,0V9.43A6.35,6.35,0,0,1,7.8,3.18h8.4a6.35,6.35,0,0,1,6.35,6.25v3.33A.91.91,0,0,1,21.64,13.67Z" />
                <path d="M12,20.82a6.35,6.35,0,0,1-6.35-6.25V9.43a.91.91,0,0,1,1.82,0v5.14A4.52,4.52,0,0,0,12,19a4.52,4.52,0,0,0,4.53-4.43V9.43a.91.91,0,1,1,1.82,0v5.14A6.35,6.35,0,0,1,12,20.82Z" />
              </svg>
              <span>Connect</span>
            </div>
          )}

          {/* Shine effect for connect button */}
          {!isConnected && (
            <div className="absolute inset-0 overflow-hidden rounded-xl">
              <div
                className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
                style={{ animationDuration: '3s' }}
              />
            </div>
          )}
        </button>
      </div>
    </header>
  );
}
