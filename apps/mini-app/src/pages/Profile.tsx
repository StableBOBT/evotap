import { memo, useMemo, useCallback } from 'react';
import { useTMA } from '../hooks/useTMA';
import { useTonConnect } from '../hooks/useTonConnect';
import { useGameStore, DEPARTMENTS, ACHIEVEMENTS, AchievementId, DepartmentId } from '../stores/gameStore';
import { useUIStore } from '../stores/uiStore';
import { useRegionDetection } from '../hooks/useTeamBattle';

function truncateAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 10)}...${address.slice(-8)}`;
}

export const ProfilePage = memo(function ProfilePage() {
  const { user, notificationSuccess } = useTMA();
  const { isConnected, friendlyAddress, connect, disconnect } = useTonConnect();
  const { setPage } = useUIStore();
  const { region, country, isDetecting } = useRegionDetection();

  const {
    points,
    level,
    totalTaps,
    currentStreak,
    longestStreak,
    referralCount,
    referralCode,
    referralEarnings,
    department,
    team,
    unlockedAchievements,
  } = useGameStore();

  const displayAddress = useMemo(
    () => truncateAddress(friendlyAddress || ''),
    [friendlyAddress]
  );

  const copyReferralLink = useCallback(async () => {
    const link = `t.me/EVOtapBot?start=${referralCode}`;
    try {
      await navigator.clipboard.writeText(link);
      notificationSuccess();
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [referralCode, notificationSuccess]);

  const goToGame = useCallback(() => {
    setPage('game');
  }, [setPage]);

  const teamInfo = useMemo(() => {
    if (!team) return null;

    const teamEmojis: Record<string, string> = {
      colla: '🏔️',
      camba: '🌴',
      neutral: '🤝',
    };

    const teamNames: Record<string, string> = {
      colla: 'Colla',
      camba: 'Camba',
      neutral: 'Neutral',
    };

    return {
      emoji: teamEmojis[team],
      name: teamNames[team],
    };
  }, [team]);

  const departmentInfo = useMemo(() => {
    if (!department) return null;
    return DEPARTMENTS[department as DepartmentId];
  }, [department]);

  const stats = useMemo(() => [
    { label: 'Puntos', value: points.toLocaleString(), icon: '💰' },
    { label: 'Nivel', value: level.toString(), icon: '⭐' },
    { label: 'Total Taps', value: totalTaps.toLocaleString(), icon: '👆' },
    { label: 'Racha Actual', value: currentStreak.toString(), icon: '🔥' },
    { label: 'Mejor Racha', value: longestStreak.toString(), icon: '🏆' },
    { label: 'Referidos', value: referralCount.toString(), icon: '👥' },
  ], [points, level, totalTaps, currentStreak, longestStreak, referralCount]);

  return (
    <div className="flex flex-col flex-1 p-4 pb-24 overflow-y-auto">
      {/* Profile header */}
      <div className="glass-card rounded-2xl p-6 mb-4">
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-500 to-red-600 flex items-center justify-center text-3xl mb-3 shadow-lg">
            {user?.firstName?.[0]?.toUpperCase() || '?'}
          </div>
          <h1 className="text-xl font-bold text-white">
            {user?.firstName} {user?.lastName || ''}
          </h1>
          {user?.username && (
            <p className="text-white/60">@{user.username}</p>
          )}
          {user?.isPremium && (
            <span className="mt-2 px-3 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full border border-yellow-500/30">
              Premium
            </span>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="glass-card rounded-2xl p-4 mb-4">
        <h2 className="font-medium text-white mb-3 flex items-center gap-2">
          <span>📊</span> Estadisticas
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-white/5 rounded-xl p-3 text-center border border-white/10"
            >
              <span className="text-xl">{stat.icon}</span>
              <p className="text-lg font-bold text-white mt-1">{stat.value}</p>
              <p className="text-xs text-white/60">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Team section */}
      <div className="glass-card rounded-2xl p-4 mb-4">
        <h2 className="font-medium text-white mb-3 flex items-center gap-2">
          <span>🇧🇴</span> Tu Equipo
        </h2>

        {teamInfo ? (
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{teamInfo.emoji}</span>
              <div>
                <p className="text-white font-medium text-lg">{teamInfo.name}</p>
                {departmentInfo && (
                  <p className="text-white/60 text-sm flex items-center gap-1">
                    {departmentInfo.emoji} {departmentInfo.name}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-white/60 text-sm mb-3">
              Aun no has elegido tu equipo
            </p>
            <button
              onClick={goToGame}
              aria-label="Ir a la pagina de juego para elegir tu equipo"
              className="w-full py-3 bg-gradient-to-r from-yellow-500 to-red-500 text-white rounded-xl font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/50"
            >
              Elegir Equipo
            </button>
          </div>
        )}
      </div>

      {/* Region section */}
      <div className="glass-card rounded-2xl p-4 mb-4">
        <h2 className="font-medium text-white mb-3 flex items-center gap-2">
          <span>📍</span> Tu Ubicacion
        </h2>
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          {isDetecting ? (
            <div className="flex items-center justify-center gap-2 text-white/60">
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              <span>Detectando ubicacion...</span>
            </div>
          ) : region === 'EXTRANJERO' ? (
            <div className="flex items-center gap-3">
              <span className="text-2xl">🌍</span>
              <div>
                <p className="text-white font-medium">Extranjero</p>
                <p className="text-white/60 text-sm">
                  {country ? `Conectando desde ${country}` : 'Fuera de Bolivia'}
                </p>
              </div>
            </div>
          ) : region === 'BOLIVIA' ? (
            <div className="flex items-center gap-3">
              <span className="text-2xl">🇧🇴</span>
              <div>
                <p className="text-white font-medium">Bolivia</p>
                <p className="text-white/60 text-sm">Region no especificada</p>
              </div>
            </div>
          ) : region && DEPARTMENTS[region as DepartmentId] ? (
            <div className="flex items-center gap-3">
              <span className="text-2xl">{DEPARTMENTS[region as DepartmentId].emoji}</span>
              <div>
                <p className="text-white font-medium">{DEPARTMENTS[region as DepartmentId].name}</p>
                <p className="text-white/60 text-sm">
                  🇧🇴 Bolivia - Detectado automaticamente
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-2xl">🌍</span>
              <div>
                <p className="text-white font-medium">Ubicacion desconocida</p>
                <p className="text-white/60 text-sm">No se pudo detectar tu ubicacion</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Referral section */}
      <div className="glass-card rounded-2xl p-4 mb-4">
        <h2 className="font-medium text-white mb-3 flex items-center gap-2">
          <span>👥</span> Invitar Amigos
        </h2>
        <p className="text-sm text-white/60 mb-3">
          Gana 5,000 puntos por cada amigo que se una!
        </p>

        <div className="bg-white/5 rounded-xl p-3 mb-3 border border-white/10">
          <p className="text-xs text-white/60 text-center">Tu codigo de referido</p>
          <p className="text-xl font-bold text-white tracking-widest text-center">
            {referralCode}
          </p>
        </div>

        <button
          onClick={copyReferralLink}
          aria-label={`Copiar link de invitacion con codigo ${referralCode}`}
          className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium mb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50"
        >
          Copiar Link de Invitacion
        </button>

        {referralEarnings > 0 && (
          <div className="bg-green-500/10 rounded-xl p-3 border border-green-500/30">
            <p className="text-green-400 text-sm text-center">
              Ganancias por referidos: <span className="font-bold">{referralEarnings.toLocaleString()}</span> puntos
            </p>
          </div>
        )}
      </div>

      {/* Wallet section */}
      <div className="glass-card rounded-2xl p-4 mb-4">
        <h2 className="font-medium text-white mb-3 flex items-center gap-2">
          <span>💎</span> Wallet TON
        </h2>

        {isConnected ? (
          <div>
            <p className="text-sm text-green-400 mb-2">Conectada</p>
            <p className="text-white font-mono text-sm bg-white/5 rounded-xl px-4 py-3 mb-3 border border-white/10">
              {displayAddress}
            </p>
            <button
              onClick={disconnect}
              aria-label="Desconectar wallet TON"
              className="w-full py-3 bg-red-500/20 text-red-400 rounded-xl text-sm border border-red-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
            >
              Desconectar Wallet
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-white/60 mb-3">
              Conecta tu wallet para recibir airdrops y recompensas
            </p>
            <button
              onClick={connect}
              aria-label="Conectar wallet TON para recibir airdrops y recompensas"
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50"
            >
              Conectar TON Wallet
            </button>
          </div>
        )}
      </div>

      {/* Achievements section */}
      <div className="glass-card rounded-2xl p-4">
        <h2 className="font-medium text-white mb-3 flex items-center gap-2">
          <span>🏅</span> Logros ({unlockedAchievements.length}/{Object.keys(ACHIEVEMENTS).length})
        </h2>

        {unlockedAchievements.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {unlockedAchievements.map((achievementId) => {
              const achievement = ACHIEVEMENTS[achievementId as AchievementId];
              if (!achievement) return null;

              return (
                <div
                  key={achievementId}
                  className="bg-white/5 rounded-xl p-2 text-center border border-yellow-500/30"
                  title={`${achievement.name}: ${achievement.description}`}
                >
                  <span className="text-2xl">{achievement.icon}</span>
                  <p className="text-xs text-white/80 mt-1 truncate">{achievement.name}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-white/60 text-sm text-center py-4">
            Aun no tienes logros. Sigue jugando!
          </p>
        )}

        {/* Locked achievements preview */}
        {unlockedAchievements.length < Object.keys(ACHIEVEMENTS).length && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <p className="text-xs text-white/40 mb-2">Proximos logros:</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {Object.entries(ACHIEVEMENTS)
                .filter(([id]) => !unlockedAchievements.includes(id as AchievementId))
                .slice(0, 4)
                .map(([id, achievement]) => (
                  <div
                    key={id}
                    className="bg-white/5 rounded-xl p-2 text-center border border-white/10 opacity-50"
                    title={`${achievement.name}: ${achievement.description}`}
                  >
                    <span className="text-2xl grayscale">🔒</span>
                    <p className="text-xs text-white/40 mt-1 truncate">{achievement.name}</p>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
