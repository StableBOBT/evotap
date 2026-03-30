import { useState } from 'react';
import { useUIStore } from '../stores/uiStore';

interface Section {
  id: string;
  icon: string;
  title: string;
  content: string[];
}

const SECTIONS: Section[] = [
  {
    id: 'basics',
    icon: '👆',
    title: 'Como Jugar',
    content: [
      'Toca el boton central para ganar puntos',
      'Cada tap consume 1 de energia',
      'La energia se regenera: 1 por segundo',
      'Maximo 1000 de energia',
      'Juega todos los dias para mantener tu racha',
    ],
  },
  {
    id: 'teams',
    icon: '⚔️',
    title: 'Batalla Colla vs Camba',
    content: [
      'Elige tu bando: COLLA (occidente) o CAMBA (oriente)',
      'Tus puntos suman al total de tu equipo',
      'El equipo ganador recibe bonus en el airdrop',
      'COLLA: La Paz, Oruro, Potosi, Cochabamba, Chuquisaca, Tarija',
      'CAMBA: Santa Cruz, Beni, Pando',
    ],
  },
  {
    id: 'seasons',
    icon: '🏆',
    title: 'Temporadas',
    content: [
      'Cada temporada dura 14 dias',
      'Al final hay airdrop de tokens $EVO',
      'Los puntos de temporada se reinician',
      'Tus puntos totales se mantienen',
      'Nueva temporada = nueva oportunidad de ganar',
    ],
  },
  {
    id: 'airdrop',
    icon: '🪂',
    title: 'Airdrop de $EVO',
    content: [
      'Conecta tu wallet TON para participar',
      'Tu parte depende de tu posicion en el ranking',
      'Bonus por racha de dias consecutivos',
      'Bonus por referidos activos',
      'Bonus si tu equipo gana la temporada',
      'Sin wallet = no puedes reclamar tokens',
    ],
  },
  {
    id: 'referrals',
    icon: '👥',
    title: 'Sistema de Referidos',
    content: [
      'Comparte tu codigo unico con amigos',
      'Cuando se unen, ambos ganan puntos bonus',
      'Mas referidos = mejor multiplicador de airdrop',
      'Tus referidos aparecen en tu perfil',
      'Los referidos deben jugar para contar',
    ],
  },
  {
    id: 'ranking',
    icon: '📊',
    title: 'Ranking y Privacidad',
    content: [
      'El ranking muestra solo puntos, sin nombres',
      'Tu posicion determina tu parte del airdrop',
      'Rankings: diario, semanal, global, por equipo',
      'Compite para estar en el top 100',
      'Los mejores jugadores reciben mas tokens',
    ],
  },
  {
    id: 'tips',
    icon: '💡',
    title: 'Tips para Maximizar',
    content: [
      'Juega TODOS los dias para mantener racha',
      'Conecta tu wallet lo antes posible',
      'Invita amigos con tu codigo de referido',
      'No uses bots - te banearan',
      'Participa desde el inicio de cada temporada',
      'El 80% de tokens van a la comunidad',
    ],
  },
];

export function HowToPlayPage() {
  const setPage = useUIStore((s) => s.setPage);
  const [expandedSection, setExpandedSection] = useState<string | null>('basics');

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <div className="sticky top-0 bg-[#0a0a0f]/95 backdrop-blur-sm z-10 px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPage('game')}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"
          >
            ←
          </button>
          <h1 className="text-xl font-bold text-white">Como Funciona EVO Tap</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-3">
        {/* Intro */}
        <div className="bg-gradient-to-r from-blue-600/20 to-green-600/20 rounded-xl p-4 border border-white/10">
          <p className="text-white/80 text-sm leading-relaxed">
            EVO Tap es un juego tap-to-earn donde compites por tokens $EVO.
            Representa la batalla cultural boliviana entre Collas y Cambas.
            Juega, invita amigos, y gana en cada airdrop!
          </p>
        </div>

        {/* Accordion Sections */}
        {SECTIONS.map((section) => (
          <div
            key={section.id}
            className="bg-[#1a1a2e] rounded-xl overflow-hidden border border-white/5"
          >
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center gap-3 p-4 text-left"
            >
              <span className="text-2xl">{section.icon}</span>
              <span className="flex-1 font-medium text-white">{section.title}</span>
              <span
                className={`text-white/40 transition-transform ${
                  expandedSection === section.id ? 'rotate-180' : ''
                }`}
              >
                ▼
              </span>
            </button>

            {expandedSection === section.id && (
              <div className="px-4 pb-4 pt-0">
                <ul className="space-y-2">
                  {section.content.map((item, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm text-white/70"
                    >
                      <span className="text-green-400 mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}

        {/* Token Info */}
        <div className="bg-[#1a1a2e] rounded-xl p-4 border border-yellow-500/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🪙</span>
            <h3 className="font-bold text-yellow-400">Token $EVO</h3>
          </div>
          <div className="space-y-1 text-sm text-white/70">
            <p>• Supply total: 1,000,000,000 $EVO</p>
            <p>• 80% para la comunidad (airdrops + juego)</p>
            <p>• 15% liquidez en DEX</p>
            <p>• 5% equipo (vesting 12 meses)</p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20">
          <p className="text-xs text-red-300/80 text-center">
            DYOR | NFA | Meme Token | No es inversion | El valor puede bajar a cero
          </p>
        </div>
      </div>
    </div>
  );
}
