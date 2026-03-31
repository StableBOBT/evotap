import { useState, useEffect, useRef } from 'react';
import { DEPARTMENTS, useGameStore, DepartmentId, TeamType } from '../stores/gameStore';

// Group departments by team
const TEAM_GROUPS: Record<TeamType, { name: string; description: string; color: string; departments: DepartmentId[] }> = {
  colla: {
    name: 'Colla',
    description: 'Tierras altas del occidente',
    color: 'from-blue-600 to-blue-800',
    departments: ['LA_PAZ', 'ORURO', 'POTOSI'],
  },
  neutral: {
    name: 'Neutral',
    description: 'El corazon de Bolivia',
    color: 'from-yellow-500 to-orange-500',
    departments: ['COCHABAMBA', 'CHUQUISACA'],
  },
  camba: {
    name: 'Camba',
    description: 'Tierras bajas del oriente',
    color: 'from-green-500 to-green-700',
    departments: ['TARIJA', 'SANTA_CRUZ', 'BENI', 'PANDO'],
  },
};

const TEAM_ORDER: TeamType[] = ['colla', 'neutral', 'camba'];

export function TeamSelectionPage() {
  const { department, selectDepartment } = useGameStore();
  const [selectedDept, setSelectedDept] = useState<DepartmentId | null>(department);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [justSelected, setJustSelected] = useState(false);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  const handleDepartmentSelect = (deptId: DepartmentId) => {
    setSelectedDept(deptId);
    setShowConfirmation(true);
  };

  const handleConfirm = () => {
    if (selectedDept) {
      selectDepartment(selectedDept);
      setShowConfirmation(false);
      setJustSelected(true);
      // Hide success message after 3 seconds - with cleanup
      successTimeoutRef.current = setTimeout(() => setJustSelected(false), 3000);
    }
  };

  const handleCancel = () => {
    setSelectedDept(department);
    setShowConfirmation(false);
  };

  const handleChangeTeam = () => {
    setJustSelected(false);
  };

  // If already has a team and just selected, show success
  if (department && justSelected) {
    const currentDept = DEPARTMENTS[department];
    const teamInfo = TEAM_GROUPS[currentDept.team];

    return (
      <div className="flex flex-col flex-1 p-4">
        <div className="flex flex-col items-center justify-center flex-1 gap-6">
          {/* Success animation */}
          <div className="glass-card p-8 text-center animate-scale-in wiphala-border">
            <div className="text-6xl mb-4">{currentDept.emoji}</div>
            <h2 className="text-2xl font-bold text-gradient mb-2">
              ¡Bienvenido al equipo!
            </h2>
            <p className="text-xl font-semibold text-white mb-1">
              {currentDept.name}
            </p>
            <p className={`text-sm font-medium bg-gradient-to-r ${teamInfo.color} bg-clip-text text-transparent`}>
              Team {teamInfo.name}
            </p>
            <p className="text-tg-hint text-sm mt-4">
              ¡Ahora representas a tu departamento!
            </p>
          </div>

          <button
            onClick={handleChangeTeam}
            className="btn-glass px-6 py-3 text-sm"
          >
            Ver todos los equipos
          </button>
        </div>
      </div>
    );
  }

  // If already has a team, show current team with option to change
  if (department && !showConfirmation) {
    const currentDept = DEPARTMENTS[department];
    const teamInfo = TEAM_GROUPS[currentDept.team];

    return (
      <div className="flex flex-col flex-1 p-4 overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gradient mb-2">Tu Equipo</h1>
          <p className="text-tg-hint text-sm">Representa a tu departamento</p>
        </div>

        {/* Current team card */}
        <div className="glass-card p-6 mb-6 wiphala-border">
          <div className="flex items-center gap-4">
            <div className="text-5xl">{currentDept.emoji}</div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white">{currentDept.name}</h2>
              <p className={`text-sm font-medium bg-gradient-to-r ${teamInfo.color} bg-clip-text text-transparent`}>
                Team {teamInfo.name}
              </p>
              <p className="text-tg-hint text-xs mt-1">{teamInfo.description}</p>
            </div>
          </div>
        </div>

        {/* Change team section */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white mb-4">
            ¿Cambiar de departamento?
          </h3>

          {/* All teams */}
          {TEAM_ORDER.map((teamKey) => {
            const teamData = TEAM_GROUPS[teamKey];
            return (
              <div key={teamKey} className="mb-6">
                {/* Team header */}
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${teamData.color}`} />
                  <h4 className={`font-semibold bg-gradient-to-r ${teamData.color} bg-clip-text text-transparent`}>
                    {teamData.name}
                  </h4>
                  <span className="text-tg-hint text-xs">- {teamData.description}</span>
                </div>

                {/* Departments grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {teamData.departments.map((deptId) => {
                    const dept = DEPARTMENTS[deptId];
                    const isCurrentDept = deptId === department;

                    return (
                      <button
                        key={deptId}
                        onClick={() => !isCurrentDept && handleDepartmentSelect(deptId)}
                        disabled={isCurrentDept}
                        className={`
                          glass-card glass-card-hover p-3 text-center transition-all
                          ${isCurrentDept
                            ? 'border-2 border-yellow-500/50 opacity-50 cursor-not-allowed'
                            : 'cursor-pointer active:scale-95'
                          }
                        `}
                      >
                        <div className="text-2xl mb-1">{dept.emoji}</div>
                        <div className="text-xs font-medium text-white truncate">{dept.name}</div>
                        {isCurrentDept && (
                          <div className="text-[10px] text-yellow-400 mt-1">Actual</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 p-4 overflow-y-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gradient mb-2">Elige tu Equipo</h1>
        <p className="text-tg-hint text-sm">
          Selecciona tu departamento y representa a tu region
        </p>
      </div>

      {/* Wiphala decoration */}
      <div className="flex justify-center mb-6">
        <div className="flex gap-1">
          {['#E31C23', '#F47920', '#FFDD00', '#FFFFFF', '#009A44', '#00AEEF', '#662D91'].map((color, i) => (
            <div
              key={i}
              className="w-4 h-4 rounded-sm"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      {/* Teams */}
      {TEAM_ORDER.map((teamKey) => {
        const teamData = TEAM_GROUPS[teamKey];
        return (
          <div key={teamKey} className="mb-6">
            {/* Team header */}
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${teamData.color} shadow-lg`} />
              <div>
                <h2 className={`text-lg font-bold bg-gradient-to-r ${teamData.color} bg-clip-text text-transparent`}>
                  {teamData.name}
                </h2>
                <p className="text-tg-hint text-xs">{teamData.description}</p>
              </div>
            </div>

            {/* Departments grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              {teamData.departments.map((deptId) => {
                const dept = DEPARTMENTS[deptId];
                const isSelected = selectedDept === deptId;

                return (
                  <button
                    key={deptId}
                    onClick={() => handleDepartmentSelect(deptId)}
                    className={`
                      glass-card glass-card-hover p-4 text-center transition-all cursor-pointer
                      ${isSelected
                        ? 'border-2 border-yellow-500 shadow-lg shadow-yellow-500/20'
                        : ''
                      }
                      active:scale-95
                    `}
                  >
                    <div className="text-3xl mb-2">{dept.emoji}</div>
                    <div className="text-sm font-medium text-white">{dept.name}</div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Info card */}
      <div className="glass-card p-4 mt-2 mb-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🇧🇴</span>
          <div>
            <h3 className="font-semibold text-white text-sm mb-1">¡Gana el logro "Patriota"!</h3>
            <p className="text-tg-hint text-xs">
              Al unirte a un equipo desbloqueas el logro y ganas 500 puntos extra.
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation modal */}
      {showConfirmation && selectedDept && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 w-full max-w-sm animate-scale-in">
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">{DEPARTMENTS[selectedDept].emoji}</div>
              <h2 className="text-xl font-bold text-white mb-1">
                ¿Unirte a {DEPARTMENTS[selectedDept].name}?
              </h2>
              <p className={`text-sm font-medium bg-gradient-to-r ${TEAM_GROUPS[DEPARTMENTS[selectedDept].team].color} bg-clip-text text-transparent mb-2`}>
                Team {TEAM_GROUPS[DEPARTMENTS[selectedDept].team].name}
              </p>
              <p className="text-tg-hint text-sm">
                Representaras a tu departamento en las competencias de equipo.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 btn-glass py-3 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 btn-gradient py-3 text-sm font-semibold"
              >
                ¡Confirmar!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
