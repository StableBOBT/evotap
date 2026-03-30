import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTMA } from '../hooks/useTMA';
import { useTonConnect } from '../hooks/useTonConnect';
import { useGameStore, ACHIEVEMENTS, type AchievementId } from '../stores/gameStore';
import { useUIStore } from '../stores/uiStore';
import { api } from '../services/api';

// =============================================================================
// TYPES
// =============================================================================

type TaskStatus = 'completed' | 'pending' | 'in-progress' | 'claimable';
type TaskCategory = 'daily' | 'onetime' | 'achievement';

interface Task {
  id: string;
  title: string;
  description: string;
  reward: number;
  category: TaskCategory;
  status: TaskStatus;
  progress?: { current: number; target: number };
  action?: {
    label: string;
    type: 'claim' | 'go' | 'connect' | 'share' | 'navigate';
    url?: string;
    page?: 'game' | 'profile';
  };
  icon: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DAILY_TAP_TARGET = 100;
const TELEGRAM_CHANNEL_URL = 'https://t.me/EVOtokenTON';
const TWITTER_URL = 'https://twitter.com/EVOtokenTON';

// =============================================================================
// COMPONENT
// =============================================================================

export function TasksPage() {
  const { notificationSuccess, impactMedium, initDataRaw } = useTMA();
  const { connect, isConnected } = useTonConnect();
  const setPage = useUIStore((s) => s.setPage);

  // Game state
  const {
    department,
    walletConnected,
    currentStreak,
    streakBonusCollected,
    totalTaps,
    referralCount,
    referralCode,
    unlockedAchievements,
    collectStreakBonus,
    addPoints,
  } = useGameStore();

  // Track daily taps (simple implementation - resets on page load)
  // In production, you'd track this in the store with lastPlayDate comparison
  const [dailyTapsStart] = useState(totalTaps);
  const [claimedTasks, setClaimedTasks] = useState<Set<string>>(new Set());

  // Social tasks state from server
  const [socialTasksStatus, setSocialTasksStatus] = useState<Record<string, { claimed: boolean; reward: number }>>({});
  const [verifyingTask, setVerifyingTask] = useState<string | null>(null);

  // Fetch social task status on mount
  const fetchSocialStatus = useCallback(async () => {
    if (!initDataRaw) return;
    const response = await api.getSocialTasksStatus(initDataRaw);
    if (response.success && response.data) {
      setSocialTasksStatus(response.data);
    }
  }, [initDataRaw]);

  useEffect(() => {
    fetchSocialStatus();
  }, [fetchSocialStatus]);

  // Calculate daily taps made today
  const dailyTaps = totalTaps - dailyTapsStart;

  // Calculate streak bonus amount
  const streakBonusAmount = currentStreak * 100;

  // =============================================================================
  // TASK DEFINITIONS
  // =============================================================================

  const tasks = useMemo<Task[]>(() => {
    const taskList: Task[] = [];

    // ----- DAILY TASKS -----

    // Streak Bonus
    if (currentStreak > 0) {
      taskList.push({
        id: 'daily-streak',
        title: 'Bono de Racha',
        description: `${currentStreak} dias seguidos - Reclama tu bonus`,
        reward: streakBonusAmount,
        category: 'daily',
        status: streakBonusCollected ? 'completed' : 'claimable',
        icon: '🔥',
        action: streakBonusCollected
          ? undefined
          : { label: 'Reclamar', type: 'claim' },
      });
    }

    // Daily Taps
    const dailyTapProgress = Math.min(dailyTaps, DAILY_TAP_TARGET);
    const dailyTapCompleted = dailyTapProgress >= DAILY_TAP_TARGET;
    taskList.push({
      id: 'daily-taps',
      title: 'Tapea 100 veces',
      description: 'Taps de hoy',
      reward: 500,
      category: 'daily',
      status: dailyTapCompleted
        ? claimedTasks.has('daily-taps')
          ? 'completed'
          : 'claimable'
        : 'in-progress',
      progress: { current: dailyTapProgress, target: DAILY_TAP_TARGET },
      icon: '👆',
      action: dailyTapCompleted && !claimedTasks.has('daily-taps')
        ? { label: 'Reclamar', type: 'claim' }
        : !dailyTapCompleted
        ? { label: 'Jugar', type: 'navigate', page: 'game' }
        : undefined,
    });

    // ----- ONE-TIME TASKS -----

    // Select Team
    taskList.push({
      id: 'onetime-team',
      title: 'Selecciona tu equipo',
      description: 'Elige tu departamento y unete a un bando',
      reward: 1000,
      category: 'onetime',
      status: department !== null ? 'completed' : 'pending',
      icon: '🇧🇴',
      action: department === null
        ? { label: 'Elegir', type: 'navigate', page: 'profile' }
        : undefined,
    });

    // Connect Wallet
    taskList.push({
      id: 'onetime-wallet',
      title: 'Conecta tu wallet TON',
      description: 'Prepara tu wallet para el airdrop',
      reward: 2000,
      category: 'onetime',
      status: walletConnected || isConnected ? 'completed' : 'pending',
      icon: '💰',
      action: !(walletConnected || isConnected)
        ? { label: 'Conectar', type: 'connect' }
        : undefined,
    });

    // Share Referral (server-verified)
    const shareStatus = socialTasksStatus['share-referral'];
    taskList.push({
      id: 'social-share-referral',
      title: 'Comparte tu link de referido',
      description: `Tu codigo: ${referralCode}`,
      reward: shareStatus?.reward || 500,
      category: 'onetime',
      status: shareStatus?.claimed ? 'completed' : 'pending',
      icon: '🔗',
      action: !shareStatus?.claimed
        ? { label: 'Compartir', type: 'share' }
        : undefined,
    });

    // Join Telegram Channel (server-verified)
    const telegramChannelStatus = socialTasksStatus['telegram-channel'];
    taskList.push({
      id: 'social-telegram-channel',
      title: 'Unete al canal de Telegram',
      description: 'Suscribete a @EVOtokenTON',
      reward: telegramChannelStatus?.reward || 3000,
      category: 'onetime',
      status: telegramChannelStatus?.claimed ? 'completed' : 'pending',
      icon: '📱',
      action: !telegramChannelStatus?.claimed
        ? { label: 'Verificar', type: 'go', url: TELEGRAM_CHANNEL_URL }
        : undefined,
    });

    // Join Telegram Group (server-verified)
    const telegramGroupStatus = socialTasksStatus['telegram-group'];
    taskList.push({
      id: 'social-telegram-group',
      title: 'Unete a la comunidad',
      description: 'Unete a @EVOcommunity',
      reward: telegramGroupStatus?.reward || 2000,
      category: 'onetime',
      status: telegramGroupStatus?.claimed ? 'completed' : 'pending',
      icon: '💬',
      action: !telegramGroupStatus?.claimed
        ? { label: 'Verificar', type: 'go', url: 'https://t.me/EVOcommunity' }
        : undefined,
    });

    // Follow Twitter (server-verified)
    const twitterStatus = socialTasksStatus['twitter-follow'];
    taskList.push({
      id: 'social-twitter-follow',
      title: 'Siguenos en Twitter',
      description: 'Sigue @EVOtokenTON',
      reward: twitterStatus?.reward || 2000,
      category: 'onetime',
      status: twitterStatus?.claimed ? 'completed' : 'pending',
      icon: '🐦',
      action: !twitterStatus?.claimed
        ? { label: 'Verificar', type: 'go', url: TWITTER_URL }
        : undefined,
    });

    // ----- ACHIEVEMENT PROGRESS -----

    // Find next unlockable achievements
    const tapAchievements: AchievementId[] = [
      'TAP_100',
      'TAP_1000',
      'TAP_10000',
      'TAP_100000',
      'TAP_1000000',
    ];
    const nextTapAchievement = tapAchievements.find(
      (id) => !unlockedAchievements.includes(id)
    );

    if (nextTapAchievement) {
      const achievement = ACHIEVEMENTS[nextTapAchievement];
      const progress = Math.min(totalTaps, achievement.requirement);
      taskList.push({
        id: `achievement-${nextTapAchievement}`,
        title: achievement.name,
        description: achievement.description,
        reward: achievement.points,
        category: 'achievement',
        status: progress >= achievement.requirement ? 'completed' : 'in-progress',
        progress: { current: progress, target: achievement.requirement },
        icon: achievement.icon,
        action:
          progress < achievement.requirement
            ? { label: 'Jugar', type: 'navigate', page: 'game' }
            : undefined,
      });
    }

    // Streak achievements
    const streakAchievements: AchievementId[] = ['STREAK_3', 'STREAK_7', 'STREAK_30'];
    const nextStreakAchievement = streakAchievements.find(
      (id) => !unlockedAchievements.includes(id)
    );

    if (nextStreakAchievement) {
      const achievement = ACHIEVEMENTS[nextStreakAchievement];
      const progress = Math.min(currentStreak, achievement.requirement);
      taskList.push({
        id: `achievement-${nextStreakAchievement}`,
        title: achievement.name,
        description: achievement.description,
        reward: achievement.points,
        category: 'achievement',
        status: progress >= achievement.requirement ? 'completed' : 'in-progress',
        progress: { current: progress, target: achievement.requirement },
        icon: achievement.icon,
      });
    }

    // Referral achievements
    const referralAchievements: AchievementId[] = [
      'REFERRAL_1',
      'REFERRAL_5',
      'REFERRAL_10',
    ];
    const nextReferralAchievement = referralAchievements.find(
      (id) => !unlockedAchievements.includes(id)
    );

    if (nextReferralAchievement) {
      const achievement = ACHIEVEMENTS[nextReferralAchievement];
      const progress = Math.min(referralCount, achievement.requirement);
      taskList.push({
        id: `achievement-${nextReferralAchievement}`,
        title: achievement.name,
        description: achievement.description,
        reward: achievement.points,
        category: 'achievement',
        status: progress >= achievement.requirement ? 'completed' : 'in-progress',
        progress: { current: progress, target: achievement.requirement },
        icon: achievement.icon,
        action: { label: 'Invitar', type: 'share' },
      });
    }

    return taskList;
  }, [
    department,
    walletConnected,
    isConnected,
    currentStreak,
    streakBonusCollected,
    streakBonusAmount,
    dailyTaps,
    totalTaps,
    referralCount,
    referralCode,
    unlockedAchievements,
    claimedTasks,
    socialTasksStatus,
  ]);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  // Helper to verify social task with API
  const verifySocialTask = async (taskId: 'telegram-channel' | 'telegram-group' | 'twitter-follow' | 'share-referral') => {
    if (!initDataRaw || verifyingTask) return false;

    setVerifyingTask(taskId);

    try {
      const response = await api.verifySocialTask(initDataRaw, taskId);

      if (response.success && response.data?.verified) {
        // Update local state
        setSocialTasksStatus((prev) => ({
          ...prev,
          [taskId]: { claimed: true, reward: response.data!.reward },
        }));

        // Add points to store
        addPoints(response.data.reward);
        notificationSuccess();
        return true;
      } else {
        // Show error - user needs to actually join/follow first
        console.warn('[Tasks] Verification failed:', response.error);
        return false;
      }
    } catch (error) {
      console.error('[Tasks] Error verifying task:', error);
      return false;
    } finally {
      setVerifyingTask(null);
    }
  };

  const handleTaskAction = async (task: Task) => {
    if (task.status === 'completed' || !task.action) return;

    impactMedium();

    // Handle social tasks that need server verification
    if (task.id.startsWith('social-')) {
      const socialTaskId = task.id.replace('social-', '') as 'telegram-channel' | 'telegram-group' | 'twitter-follow' | 'share-referral';

      // For 'go' type actions, open the link first then verify
      if (task.action.type === 'go' && task.action.url) {
        window.open(task.action.url, '_blank');

        // Wait for user to potentially join, then verify
        setTimeout(async () => {
          const verified = await verifySocialTask(socialTaskId);
          if (!verified) {
            // Refresh status from server
            await fetchSocialStatus();
          }
        }, 3000);
        return;
      }

      // For share tasks
      if (task.action.type === 'share') {
        const shareUrl = `https://t.me/EVOtapBot?start=${referralCode}`;
        const shareText = 'Unete a EVO Tap y gana puntos! Usa mi codigo de referido:';

        if (navigator.share) {
          try {
            await navigator.share({ title: 'EVO Tap', text: shareText, url: shareUrl });
            await verifySocialTask('share-referral');
          } catch {
            // User cancelled
          }
        } else {
          await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
          await verifySocialTask('share-referral');
        }
        return;
      }
    }

    // Non-social task handlers
    switch (task.action.type) {
      case 'claim':
        if (task.id === 'daily-streak') {
          const bonus = collectStreakBonus();
          if (bonus > 0) {
            notificationSuccess();
          }
        } else {
          setClaimedTasks((prev) => new Set([...prev, task.id]));
          notificationSuccess();
        }
        break;

      case 'go':
        if (task.action.url) {
          window.open(task.action.url, '_blank');
          setTimeout(() => {
            setClaimedTasks((prev) => new Set([...prev, task.id]));
          }, 2000);
        }
        break;

      case 'connect':
        await connect();
        break;

      case 'share':
        const shareUrl = `https://t.me/EVOtapBot?start=${referralCode}`;
        const shareText = 'Unete a EVO Tap y gana puntos! Usa mi codigo de referido:';

        if (navigator.share) {
          try {
            await navigator.share({ title: 'EVO Tap', text: shareText, url: shareUrl });
            setClaimedTasks((prev) => new Set([...prev, task.id]));
            notificationSuccess();
          } catch {
            // User cancelled
          }
        } else {
          await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
          setClaimedTasks((prev) => new Set([...prev, task.id]));
          notificationSuccess();
        }
        break;

      case 'navigate':
        if (task.action.page) {
          setPage(task.action.page);
        }
        break;
    }
  };

  // =============================================================================
  // GROUPING & STATS
  // =============================================================================

  const groupedTasks = useMemo(() => {
    return {
      daily: tasks.filter((t) => t.category === 'daily'),
      onetime: tasks.filter((t) => t.category === 'onetime'),
      achievement: tasks.filter((t) => t.category === 'achievement'),
    };
  }, [tasks]);

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const totalRewards = tasks
    .filter((t) => t.status === 'completed')
    .reduce((sum, t) => sum + t.reward, 0);

  // =============================================================================
  // RENDER HELPERS
  // =============================================================================

  const getCategoryTitle = (category: TaskCategory): string => {
    switch (category) {
      case 'daily':
        return 'Tareas Diarias';
      case 'onetime':
        return 'Tareas Unicas';
      case 'achievement':
        return 'Progreso de Logros';
    }
  };

  const getCategoryIcon = (category: TaskCategory): string => {
    switch (category) {
      case 'daily':
        return '📅';
      case 'onetime':
        return '⭐';
      case 'achievement':
        return '🏆';
    }
  };

  const getStatusColor = (status: TaskStatus): string => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400';
      case 'claimable':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'in-progress':
        return 'bg-blue-500/20 text-blue-400';
      case 'pending':
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getButtonStyle = (status: TaskStatus): string => {
    if (status === 'claimable') {
      return 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold animate-pulse';
    }
    return 'bg-tg-button text-tg-button-text';
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="flex flex-col flex-1 p-4 pb-20">
      <h1 className="text-2xl font-bold text-tg-text mb-4">Tareas</h1>

      {/* Progress Summary - Glass Card */}
      <div className="glass-card rounded-2xl p-4 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-tg-hint">Completadas</p>
            <p className="text-2xl font-bold text-tg-text">
              {completedCount} / {tasks.length}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-tg-hint">Ganado</p>
            <p className="text-2xl font-bold text-green-400">
              +{totalRewards.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-3 bg-tg-bg/50 rounded-full mt-4 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-500"
            style={{
              width: `${tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {/* Task Sections */}
      <div className="flex-1 overflow-y-auto space-y-6">
        {(Object.entries(groupedTasks) as [TaskCategory, Task[]][]).map(
          ([category, taskList]) =>
            taskList.length > 0 && (
              <div key={category}>
                <h2 className="text-sm font-semibold text-tg-hint uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span>{getCategoryIcon(category)}</span>
                  <span>{getCategoryTitle(category)}</span>
                </h2>

                <div className="space-y-3">
                  {taskList.map((task) => (
                    <div
                      key={task.id}
                      className={`
                        glass-card rounded-xl p-4 transition-all duration-200
                        ${task.status === 'completed' ? 'opacity-60' : ''}
                        ${task.status === 'claimable' ? 'ring-2 ring-yellow-500/50' : ''}
                      `}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div
                          className={`
                            w-10 h-10 rounded-xl flex items-center justify-center text-xl
                            ${getStatusColor(task.status)}
                          `}
                        >
                          {task.status === 'completed' ? '✓' : task.icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p
                            className={`
                              font-semibold
                              ${task.status === 'completed' ? 'text-tg-hint line-through' : 'text-tg-text'}
                            `}
                          >
                            {task.title}
                          </p>
                          <p className="text-sm text-tg-hint mt-0.5">
                            {task.description}
                          </p>

                          {/* Progress Bar (if applicable) */}
                          {task.progress && task.status !== 'completed' && (
                            <div className="mt-2">
                              <div className="flex justify-between text-xs text-tg-hint mb-1">
                                <span>Progreso</span>
                                <span>
                                  {task.progress.current.toLocaleString()} /{' '}
                                  {task.progress.target.toLocaleString()}
                                </span>
                              </div>
                              <div className="h-2 bg-tg-bg/50 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full transition-all duration-300"
                                  style={{
                                    width: `${
                                      (task.progress.current / task.progress.target) * 100
                                    }%`,
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Reward */}
                          <p className="text-sm text-green-400 mt-2 font-medium">
                            +{task.reward.toLocaleString()} puntos
                          </p>
                        </div>

                        {/* Action Button */}
                        {task.action && task.status !== 'completed' && (
                          <button
                            onClick={() => handleTaskAction(task)}
                            className={`
                              px-4 py-2 rounded-xl text-sm font-semibold
                              transition-all duration-200 active:scale-95
                              ${getButtonStyle(task.status)}
                            `}
                          >
                            {task.action.label}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
        )}
      </div>

      {/* Streak Info Banner (if no streak yet) */}
      {currentStreak === 0 && (
        <div className="glass-card rounded-xl p-4 mt-4 text-center">
          <p className="text-tg-hint text-sm">
            Juega todos los dias para construir tu racha y ganar bonos diarios
          </p>
        </div>
      )}
    </div>
  );
}
