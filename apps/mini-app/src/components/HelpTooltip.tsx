import { useState, useEffect, useCallback } from 'react';

interface HelpTooltipProps {
  title: string;
  description: string;
  children?: React.ReactNode;
}

/**
 * Help tooltip component - shows a "?" icon that opens a modal with info
 * Accessible: proper touch targets, keyboard support, focus management
 */
export function HelpTooltip({ title, description }: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Close on Escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  return (
    <>
      {/* Help Icon - min 44x44 touch target */}
      <button
        onClick={() => setIsOpen(true)}
        className="w-11 h-11 -m-3 rounded-full flex items-center justify-center text-xs text-white/60 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/50"
        aria-label={`Ayuda: ${title}`}
        aria-haspopup="dialog"
      >
        <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">?</span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-dialog-title"
        >
          <div
            className="bg-[#1a1a2e] rounded-2xl p-5 max-w-sm w-full shadow-xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 id="help-dialog-title" className="text-lg font-bold text-white">{title}</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="w-11 h-11 -m-1 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/50"
                aria-label="Cerrar"
              >
                <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">✕</span>
              </button>
            </div>
            <p className="text-white/70 text-sm leading-relaxed">{description}</p>
          </div>
        </div>
      )}
    </>
  );
}

// Pre-defined help content for different sections
export const HELP_CONTENT = {
  teamBattle: {
    title: 'Batalla de Equipos',
    description:
      'Bolivia dividida en dos bandos: COLLA (occidente: La Paz, Oruro, Potosi, Cochabamba, Chuquisaca, Tarija) vs CAMBA (oriente: Santa Cruz, Beni, Pando). Tus puntos suman al total de tu equipo. El equipo ganador al final de la temporada recibe bonus en el airdrop!',
  },
  energy: {
    title: 'Energia',
    description:
      'Cada tap consume 1 de energia. La energia se regenera automaticamente: 1 punto por segundo. Cuando llegues a 0, espera a que se recargue o vuelve mas tarde. Maximo: 1000 energia.',
  },
  points: {
    title: 'Puntos',
    description:
      'Ganas puntos con cada tap. Mas puntos = mejor posicion en el ranking = mayor recompensa en el airdrop. Los puntos de la temporada se reinician, pero tus puntos totales se guardan.',
  },
  streak: {
    title: 'Racha Diaria',
    description:
      'Juega cada dia para mantener tu racha. Dias consecutivos aumentan tu multiplicador de confianza para el airdrop. Si pierdes un dia, la racha se reinicia a 1.',
  },
  level: {
    title: 'Nivel',
    description:
      'Tu nivel sube automaticamente segun tus puntos totales. Niveles mas altos desbloquean beneficios futuros y demuestran tu compromiso con la comunidad.',
  },
  season: {
    title: 'Temporadas',
    description:
      'Cada temporada dura 14 dias. Al final de cada temporada hay un airdrop de tokens $EVO basado en tu posicion en el ranking. Nueva temporada = nueva oportunidad!',
  },
  leaderboard: {
    title: 'Ranking',
    description:
      'Compite con otros jugadores por las mejores posiciones. El ranking muestra solo puntos (sin nombres) para privacidad. Tu posicion determina tu parte del airdrop.',
  },
  referral: {
    title: 'Referidos',
    description:
      'Invita amigos con tu codigo unico. Cuando se unen y juegan, ambos ganan puntos bonus! Mas referidos activos = mejor multiplicador en el airdrop.',
  },
  wallet: {
    title: 'Wallet TON',
    description:
      'Conecta tu wallet TON para recibir el airdrop de tokens $EVO. Sin wallet conectada no podras reclamar tus tokens. Usa Tonkeeper, TON Space u otra wallet compatible.',
  },
  airdrop: {
    title: 'Airdrop',
    description:
      'Al final de cada temporada, los tokens $EVO se distribuyen a los jugadores segun: posicion en ranking, racha de dias, referidos activos, y wallet conectada. Juega consistentemente para maximizar tu parte!',
  },
  tapPower: {
    title: 'Poder de Tap',
    description:
      'Multiplicador de puntos por cada tap. Actualmente 1x. En el futuro podras aumentarlo con upgrades y logros especiales.',
  },
};
