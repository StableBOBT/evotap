import { useMemo } from 'react';
import { ACHIEVEMENTS, useGameStore, type AchievementId } from '../stores/gameStore';
import { useHaptics } from '../hooks/useHaptics';

type AchievementCategory = 'taps' | 'levels' | 'streaks' | 'social' | 'wallet';

interface AchievementWithCategory {
  id: AchievementId;
  achievement: (typeof ACHIEVEMENTS)[AchievementId];
  category: AchievementCategory;
  progress: number;
  maxProgress: number;
  isUnlocked: boolean;
}

const CATEGORY_CONFIG: Record<AchievementCategory, { name: string; icon: string; color: string }> = {
  taps: { name: 'Taps', icon: '👆', color: 'from-blue-500 to-cyan-500' },
  levels: { name: 'Niveles', icon: '🎖️', color: 'from-yellow-500 to-orange-500' },
  streaks: { name: 'Rachas', icon: '📅', color: 'from-green-500 to-emerald-500' },
  social: { name: 'Social', icon: '🤝', color: 'from-purple-500 to-pink-500' },
  wallet: { name: 'Wallet', icon: '💰', color: 'from-amber-500 to-yellow-500' },
};

function getAchievementCategory(id: AchievementId): AchievementCategory {
  if (id.startsWith('TAP_') || id === 'FIRST_TAP') return 'taps';
  if (id.startsWith('LEVEL_')) return 'levels';
  if (id.startsWith('STREAK_')) return 'streaks';
  if (id.startsWith('REFERRAL_') || id === 'TEAM_JOINED') return 'social';
  if (id === 'WALLET_CONNECTED') return 'wallet';
  return 'taps';
}

function getProgressForAchievement(
  id: AchievementId,
  state: { totalTaps: number; level: number; currentStreak: number; referralCount: number; walletConnected: boolean; team: string | null }
): number {
  const achievement = ACHIEVEMENTS[id];

  switch (id) {
    case 'FIRST_TAP':
    case 'TAP_100':
    case 'TAP_1000':
    case 'TAP_10000':
    case 'TAP_100000':
    case 'TAP_1000000':
      return Math.min(state.totalTaps, achievement.requirement);

    case 'LEVEL_5':
    case 'LEVEL_9':
      return Math.min(state.level, achievement.requirement);

    case 'STREAK_3':
    case 'STREAK_7':
    case 'STREAK_30':
      return Math.min(state.currentStreak, achievement.requirement);

    case 'REFERRAL_1':
    case 'REFERRAL_5':
    case 'REFERRAL_10':
      return Math.min(state.referralCount, achievement.requirement);

    case 'TEAM_JOINED':
      return state.team ? 1 : 0;

    case 'WALLET_CONNECTED':
      return state.walletConnected ? 1 : 0;

    default:
      return 0;
  }
}

interface AchievementCardProps {
  achievement: AchievementWithCategory;
  onTap: () => void;
}

function AchievementCard({ achievement, onTap }: AchievementCardProps) {
  const { achievement: data, isUnlocked, progress, maxProgress } = achievement;
  const progressPercent = (progress / maxProgress) * 100;
  const categoryConfig = CATEGORY_CONFIG[achievement.category];

  return (
    <div
      onClick={onTap}
      className={`
        glass-card p-4 rounded-xl cursor-pointer
        transition-all duration-300 ease-out
        ${isUnlocked
          ? 'border-yellow-500/30 hover:border-yellow-500/50 hover:scale-[1.02]'
          : 'border-white/5 opacity-60 hover:opacity-80'
        }
      `}
      style={{
        background: isUnlocked
          ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(0, 0, 0, 0.3) 100%)'
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(0, 0, 0, 0.3) 100%)',
      }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={`
            relative w-12 h-12 rounded-xl flex-shrink-0
            flex items-center justify-center
            ${isUnlocked ? 'bg-gradient-to-br ' + categoryConfig.color : 'bg-white/5'}
          `}
          style={{
            boxShadow: isUnlocked ? '0 4px 15px rgba(255, 215, 0, 0.3)' : 'none',
          }}
        >
          <span className={`text-2xl ${isUnlocked ? '' : 'grayscale opacity-50'}`}>
            {data.icon}
          </span>

          {/* Unlocked badge */}
          {isUnlocked && (
            <div
              className="
                absolute -top-1 -right-1 w-5 h-5
                bg-green-500 rounded-full
                flex items-center justify-center
                border-2 border-[var(--bg-color)]
              "
            >
              <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3
              className={`
                font-bold text-sm truncate
                ${isUnlocked ? 'text-white' : 'text-white/50'}
              `}
            >
              {data.name}
            </h3>

            {/* Points badge */}
            <div
              className={`
                flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-bold
                ${isUnlocked
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-white/5 text-white/30'
                }
              `}
            >
              +{data.points.toLocaleString()}
            </div>
          </div>

          <p className={`text-xs mb-2 ${isUnlocked ? 'text-white/60' : 'text-white/30'}`}>
            {data.description}
          </p>

          {/* Progress bar */}
          {!isUnlocked && (
            <div className="space-y-1">
              <div className="progress-bar h-2">
                <div
                  className="progress-fill h-full transition-all duration-500"
                  style={{
                    width: `${progressPercent}%`,
                    background: `linear-gradient(90deg, ${categoryConfig.color.includes('blue') ? '#3b82f6' : categoryConfig.color.includes('yellow') ? '#eab308' : categoryConfig.color.includes('green') ? '#22c55e' : categoryConfig.color.includes('purple') ? '#a855f7' : '#f59e0b'}, ${categoryConfig.color.includes('cyan') ? '#06b6d4' : categoryConfig.color.includes('orange') ? '#f97316' : categoryConfig.color.includes('emerald') ? '#10b981' : categoryConfig.color.includes('pink') ? '#ec4899' : '#fbbf24'})`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-white/40 font-mono-game">
                <span>{progress.toLocaleString()}</span>
                <span>{maxProgress.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Unlocked indicator */}
          {isUnlocked && (
            <div className="flex items-center gap-1 text-green-400 text-xs">
              <span>Completado</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AchievementsList() {
  const unlockedAchievements = useGameStore((s) => s.unlockedAchievements);
  const totalTaps = useGameStore((s) => s.totalTaps);
  const level = useGameStore((s) => s.level);
  const currentStreak = useGameStore((s) => s.currentStreak);
  const referralCount = useGameStore((s) => s.referralCount);
  const walletConnected = useGameStore((s) => s.walletConnected);
  const team = useGameStore((s) => s.team);
  const haptics = useHaptics();

  const achievementsList = useMemo((): AchievementWithCategory[] => {
    const state = { totalTaps, level, currentStreak, referralCount, walletConnected, team };

    return (Object.keys(ACHIEVEMENTS) as AchievementId[]).map((id) => {
      const achievement = ACHIEVEMENTS[id];
      const category = getAchievementCategory(id);
      const isUnlocked = unlockedAchievements.includes(id);
      const progress = getProgressForAchievement(id, state);

      return {
        id,
        achievement,
        category,
        progress,
        maxProgress: achievement.requirement,
        isUnlocked,
      };
    });
  }, [unlockedAchievements, totalTaps, level, currentStreak, referralCount, walletConnected, team]);

  const categorizedAchievements = useMemo(() => {
    const categories: Record<AchievementCategory, AchievementWithCategory[]> = {
      taps: [],
      levels: [],
      streaks: [],
      social: [],
      wallet: [],
    };

    achievementsList.forEach((achievement) => {
      categories[achievement.category].push(achievement);
    });

    // Sort each category: unlocked first, then by progress percentage
    Object.values(categories).forEach((list) => {
      list.sort((a, b) => {
        if (a.isUnlocked && !b.isUnlocked) return -1;
        if (!a.isUnlocked && b.isUnlocked) return 1;
        return (b.progress / b.maxProgress) - (a.progress / a.maxProgress);
      });
    });

    return categories;
  }, [achievementsList]);

  const stats = useMemo(() => {
    const total = achievementsList.length;
    const unlocked = achievementsList.filter((a) => a.isUnlocked).length;
    const totalPoints = achievementsList
      .filter((a) => a.isUnlocked)
      .reduce((sum, a) => sum + a.achievement.points, 0);

    return { total, unlocked, totalPoints };
  }, [achievementsList]);

  const handleCardTap = () => {
    haptics.tap();
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 pb-24">
      {/* Header stats */}
      <div className="glass-card p-4 rounded-xl mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white mb-1">Logros</h2>
            <p className="text-sm text-white/50">
              {stats.unlocked} de {stats.total} desbloqueados
            </p>
          </div>

          <div className="text-right">
            <div
              className="text-2xl font-bold font-mono-game"
              style={{
                background: 'linear-gradient(180deg, #FFD700 0%, #FFA500 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {stats.totalPoints.toLocaleString()}
            </div>
            <p className="text-xs text-white/40">puntos ganados</p>
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="mt-4">
          <div className="progress-bar h-3">
            <div
              className="progress-fill h-full"
              style={{
                width: `${(stats.unlocked / stats.total) * 100}%`,
                background: 'linear-gradient(90deg, #FFD700, #FFA500)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Achievement categories */}
      <div className="space-y-6">
        {(Object.keys(categorizedAchievements) as AchievementCategory[]).map((category) => {
          const achievements = categorizedAchievements[category];
          const config = CATEGORY_CONFIG[category];
          const categoryUnlocked = achievements.filter((a) => a.isUnlocked).length;

          return (
            <div key={category}>
              {/* Category header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{config.icon}</span>
                  <h3 className="font-bold text-white">{config.name}</h3>
                </div>
                <span className="text-xs text-white/40 font-mono-game">
                  {categoryUnlocked}/{achievements.length}
                </span>
              </div>

              {/* Achievement cards */}
              <div className="space-y-3">
                {achievements.map((achievement) => (
                  <AchievementCard
                    key={achievement.id}
                    achievement={achievement}
                    onTap={handleCardTap}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {stats.unlocked === 0 && (
        <div className="text-center py-8">
          <span className="text-4xl mb-4 block">🏆</span>
          <p className="text-white/50">
            Empieza a jugar para desbloquear logros
          </p>
        </div>
      )}
    </div>
  );
}
