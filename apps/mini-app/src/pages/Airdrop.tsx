import { useEffect, useState } from 'react';
import { useTMA } from '../hooks/useTMA';
import { useTonConnect } from '../hooks/useTonConnect';
import { useGameStore } from '../stores/gameStore';
import { api } from '../services/api';

interface TrustScoreData {
  score: number;
  isEligibleForAirdrop: boolean;
  airdropMultiplier: number;
  factors?: Record<string, number>;
}

interface AirdropStatus {
  isActive: boolean;
  root?: string;
  hasClaimed?: boolean;
  allocation?: { amount: string; trustScore: number } | null;
  message?: string;
}

interface EligibilityData {
  isEligible: boolean;
  reasons: string[];
  stats: {
    points: number;
    trustScore: number;
    hasWallet: boolean;
    walletAddress: string | null;
    isPremium: boolean;
    streakDays: number;
  };
}

export function AirdropPage() {
  const { user } = useTMA();
  const { initDataRaw } = useTMA();
  const { isConnected, connect } = useTonConnect();
  const {
    points,
    level,
    totalTaps,
    currentStreak,
    referralCount,
    walletConnected,
  } = useGameStore();

  const [trustScore, setTrustScore] = useState<TrustScoreData | null>(null);
  const [airdropStatus, setAirdropStatus] = useState<AirdropStatus | null>(null);
  const [eligibility, setEligibility] = useState<EligibilityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all data on mount
  useEffect(() => {
    async function fetchData() {
      if (!initDataRaw) return;

      try {
        // Fetch all data in parallel
        const [trustRes, statusRes, eligRes] = await Promise.all([
          api.getTrustScore(initDataRaw),
          api.getAirdropStatus(initDataRaw),
          api.getAirdropEligibility(initDataRaw),
        ]);

        if (trustRes.success && trustRes.data) {
          setTrustScore(trustRes.data);
        }
        if (statusRes.success && statusRes.data) {
          setAirdropStatus(statusRes.data);
        }
        if (eligRes.success && eligRes.data) {
          setEligibility(eligRes.data);
        }
      } catch (error) {
        console.error('Failed to fetch airdrop data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [initDataRaw]);

  // Estimated token allocation based on points and multiplier
  const estimatedTokens = Math.floor(
    (points / 1000) * (trustScore?.airdropMultiplier || 1)
  );

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excelente';
    if (score >= 60) return 'Bueno';
    if (score >= 40) return 'Regular';
    return 'Bajo';
  };

  // Tasks to improve trust score
  const tasks = [
    {
      id: 'wallet',
      title: 'Conectar Wallet TON',
      description: '+10 puntos de confianza',
      icon: '💎',
      completed: walletConnected || isConnected,
      action: walletConnected ? undefined : connect,
    },
    {
      id: 'streak',
      title: 'Mantener racha de 7 dias',
      description: '+15 puntos de confianza',
      icon: '🔥',
      completed: currentStreak >= 7,
      progress: Math.min(currentStreak, 7),
      max: 7,
    },
    {
      id: 'referrals',
      title: 'Invitar 5 amigos',
      description: '+20 puntos de confianza',
      icon: '👥',
      completed: referralCount >= 5,
      progress: Math.min(referralCount, 5),
      max: 5,
    },
    {
      id: 'level',
      title: 'Alcanzar nivel 5',
      description: '+10 puntos de confianza',
      icon: '⭐',
      completed: level >= 5,
      progress: Math.min(level, 5),
      max: 5,
    },
    {
      id: 'premium',
      title: 'Telegram Premium',
      description: '+15 puntos de confianza',
      icon: '✨',
      completed: user?.isPremium || false,
    },
  ];

  return (
    <div className="flex flex-col flex-1 p-4 pb-24 overflow-y-auto">
      {/* Header */}
      <div className="glass-card rounded-2xl p-6 mb-4 text-center">
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-yellow-500 to-red-600 rounded-full flex items-center justify-center text-4xl shadow-lg mb-4">
          🪂
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          Airdrop $EVO
        </h1>
        <p className="text-white/60 text-sm">
          Tu recompensa por ser parte de la comunidad
        </p>
      </div>

      {/* Trust Score */}
      <div className="glass-card rounded-2xl p-4 mb-4">
        <h2 className="font-medium text-white mb-4 flex items-center gap-2">
          <span>🛡️</span> Tu Puntuacion de Confianza
        </h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          </div>
        ) : trustScore ? (
          <div className="text-center">
            <div className="relative w-32 h-32 mx-auto mb-4">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="12"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="url(#gradient)"
                  strokeWidth="12"
                  strokeDasharray={`${(trustScore.score / 100) * 352} 352`}
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#EAB308" />
                    <stop offset="100%" stopColor="#EF4444" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold ${getScoreColor(trustScore.score)}`}>
                  {trustScore.score}
                </span>
                <span className="text-xs text-white/60">/100</span>
              </div>
            </div>

            <p className={`font-medium ${getScoreColor(trustScore.score)}`}>
              {getScoreLabel(trustScore.score)}
            </p>

            <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/10">
              {trustScore.isEligibleForAirdrop ? (
                <p className="text-green-400 text-sm flex items-center justify-center gap-2">
                  <span>✅</span> Elegible para el airdrop
                </p>
              ) : (
                <p className="text-red-400 text-sm flex items-center justify-center gap-2">
                  <span>❌</span> Aun no eres elegible (minimo 50 puntos)
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-white/60 text-center py-4">
            No se pudo cargar la puntuacion
          </p>
        )}
      </div>

      {/* Allocation / Estimated */}
      <div className="glass-card rounded-2xl p-4 mb-4">
        <h2 className="font-medium text-white mb-3 flex items-center gap-2">
          <span>💰</span>
          {airdropStatus?.allocation ? 'Tu Asignacion' : 'Estimacion de Tokens'}
        </h2>

        <div className={`rounded-xl p-4 border ${
          airdropStatus?.allocation
            ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30'
            : 'bg-gradient-to-r from-yellow-500/20 to-red-500/20 border-yellow-500/30'
        }`}>
          <div className="text-center">
            {airdropStatus?.allocation ? (
              <>
                <p className="text-3xl font-bold text-green-400">
                  {BigInt(airdropStatus.allocation.amount).toLocaleString()}
                </p>
                <p className="text-white/60 text-sm">$EVO confirmados</p>
                {airdropStatus.hasClaimed ? (
                  <p className="text-green-400 text-xs mt-2 flex items-center justify-center gap-1">
                    <span>✅</span> Ya reclamaste tus tokens
                  </p>
                ) : (
                  <button className="mt-3 px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium">
                    Reclamar Tokens
                  </button>
                )}
              </>
            ) : (
              <>
                <p className="text-3xl font-bold text-white">
                  {estimatedTokens.toLocaleString()}
                </p>
                <p className="text-white/60 text-sm">$EVO estimados</p>
                {trustScore && (
                  <p className="text-xs text-yellow-400 mt-2">
                    Multiplicador: {trustScore.airdropMultiplier}x
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {!airdropStatus?.allocation && (
          <p className="text-xs text-white/40 text-center mt-3">
            *Estimacion basada en tus puntos actuales. La cantidad final puede variar.
          </p>
        )}

        {airdropStatus?.isActive && !airdropStatus.allocation && (
          <div className="mt-3 p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
            <p className="text-yellow-400 text-xs text-center">
              Snapshot activo pero no estas incluido. Conecta tu wallet y cumple los requisitos.
            </p>
          </div>
        )}
      </div>

      {/* Eligibility Status */}
      {eligibility && !eligibility.isEligible && eligibility.reasons.length > 0 && (
        <div className="glass-card rounded-2xl p-4 mb-4">
          <h2 className="font-medium text-white mb-3 flex items-center gap-2">
            <span>⚠️</span> Requisitos Pendientes
          </h2>
          <div className="space-y-2">
            {eligibility.reasons.map((reason, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-red-500/10 rounded-lg border border-red-500/30">
                <span className="text-red-400">❌</span>
                <p className="text-sm text-red-300">{reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tasks to improve */}
      <div className="glass-card rounded-2xl p-4 mb-4">
        <h2 className="font-medium text-white mb-3 flex items-center gap-2">
          <span>📋</span> Mejora tu Puntuacion
        </h2>

        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`rounded-xl p-3 border ${
                task.completed
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-white/5 border-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{task.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`font-medium ${task.completed ? 'text-green-400' : 'text-white'}`}>
                      {task.title}
                    </p>
                    {task.completed && <span>✅</span>}
                  </div>
                  <p className="text-xs text-white/60">{task.description}</p>

                  {task.progress !== undefined && task.max !== undefined && !task.completed && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-white/40 mb-1">
                        <span>Progreso</span>
                        <span>{task.progress}/{task.max}</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-yellow-500 to-red-500 rounded-full"
                          style={{ width: `${(task.progress / task.max) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {task.action && !task.completed && (
                  <button
                    onClick={task.action}
                    className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-red-500 text-white text-sm rounded-lg font-medium"
                  >
                    Hacer
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats summary */}
      <div className="glass-card rounded-2xl p-4">
        <h2 className="font-medium text-white mb-3 flex items-center gap-2">
          <span>📊</span> Tus Stats
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
            <p className="text-lg font-bold text-white">{points.toLocaleString()}</p>
            <p className="text-xs text-white/60">Puntos totales</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
            <p className="text-lg font-bold text-white">{totalTaps.toLocaleString()}</p>
            <p className="text-xs text-white/60">Taps totales</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
            <p className="text-lg font-bold text-white">{currentStreak}</p>
            <p className="text-xs text-white/60">Racha actual</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
            <p className="text-lg font-bold text-white">{referralCount}</p>
            <p className="text-xs text-white/60">Referidos</p>
          </div>
        </div>
      </div>

      {/* Important notice */}
      <div className="mt-4 p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/30">
        <p className="text-yellow-400 text-xs text-center">
          <span className="font-medium">Importante:</span> Los criterios exactos del airdrop
          no seran revelados hasta el snapshot para evitar manipulacion.
        </p>
      </div>
    </div>
  );
}
