# Reporte de Bugs - TON Mini App Bolivia
**Fecha:** 2026-04-06
**Auditor:** Claude Sonnet 4.5
**Scope:** Frontend (React) + Backend (API) + Hooks + Stores

---

## 🔴 CRÍTICOS (Action Required)

### 1. **INCONSISTENCIA: Frontend vs Backend calculateLevel** 🔥
**Archivos:**
- Frontend: `apps/mini-app/src/stores/gameStore.ts:225`
- Backend: `apps/api/src/types.ts:164`
**Severidad:** CRITICAL
**Descripción:**
```typescript
// FRONTEND usa totalTaps:
function calculateLevel(totalTaps: number): number {
  if (totalTaps < 1000) return 1;
  if (totalTaps < 5000) return 2;
  // ...
}

// BACKEND usa points:
export function calculateLevel(points: number): number {
  const thresholds = GAME_CONFIG.LEVEL_THRESHOLDS; // [5000, 25000, 100000, ...]
  // ...
}
```

**Impacto:**
- **Level desync entre frontend y backend**
- Frontend: usuario con 5,000 taps = nivel 2
- Backend: usuario con 5,000 points = nivel 2
- Si 1 tap ≠ 1 point (con bonuses/multipliers), el level será DIFERENTE
- Cuando syncFromServer actualiza el nivel, puede BAJAR el nivel del usuario en UI
- Usuario ve "Nivel 5" local, pero servidor dice "Nivel 3"

**Fix:**
Decidir source of truth:

**Opción A - Backend correcto (usar points):**
```typescript
// Frontend gameStore.ts - Cambiar línea 421:
const newLevel = calculateLevel(newPoints); // ❌ ACTUAL: usa totalTaps
// A:
const newLevel = calculateLevel(state.points + 1); // ✅ Usar points acumulados
```

**Opción B - Frontend correcto (usar totalTaps):**
```typescript
// Backend types.ts - Cambiar línea 164:
export function calculateLevel(totalTaps: number): number { // Cambiar param name
  const thresholds = [1000, 5000, 15000, 50000, ...]; // Ajustar thresholds
  // ...
}
```

**Recomendación:** Usar **points** (Opción A) porque:
- Backend tests ya asumen points
- Permite balanceo futuro con tap_power/multipliers
- Más flexible para economía del juego

---

### 2. **Memory Leak en useTeamBattle** ⚠️
**Archivo:** `apps/mini-app/src/hooks/useTeamBattle.ts:79-86`
**Severidad:** CRITICAL
**Descripción:**
```typescript
// BUG: fetchScores se recrea en cada render, causando loop infinito de useEffect
const fetchScores = useCallback(async () => {
  // ...
}, []); // ❌ fetchScores depende de setState, pero deps array está vacío

useEffect(() => {
  fetchScores();
  const interval = setInterval(fetchScores, 5000);
  return () => clearInterval(interval);
}, [fetchScores]); // ❌ fetchScores cambia en cada render → cleanup/re-setup infinito
```

**Impacto:**
- Memory leak por intervals no limpiados correctamente
- Re-renders innecesarios cada 5 segundos
- Puede causar slowdown progresivo de la app

**Fix:**
```typescript
const fetchScores = useCallback(async () => {
  // ...
}, []); // Asegurar deps estables

// O mejor: remover fetchScores de deps
useEffect(() => {
  const fn = async () => { /* lógica aquí */ };
  fn();
  const interval = setInterval(fn, 5000);
  return () => clearInterval(interval);
}, []); // Solo mount/unmount
```

---

### 3. **Fetch sin Timeout a API Externa** ⚠️
**Archivo:** `apps/mini-app/src/hooks/useTeamBattle.ts:109`
**Severidad:** HIGH
**Descripción:**
```typescript
const response = await fetch('https://ipapi.co/json/');
// ❌ Sin timeout, puede colgar indefinidamente
```

**Impacto:**
- App puede freezarse si ipapi.co está caído
- Mala UX en regiones con internet lento
- No hay fallback si la request falla

**Fix:**
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000);
try {
  const response = await fetch('https://ipapi.co/json/', {
    signal: controller.signal
  });
  clearTimeout(timeoutId);
  // ...
} catch (error) {
  if (error.name === 'AbortError') {
    console.warn('[useRegionDetection] Timeout, using fallback');
    setRegion('EXTRANJERO');
  }
}
```

---

### 4. **Async Operation en useEffect Cleanup** ⚠️
**Archivo:** `apps/mini-app/src/hooks/useCloudStorage.ts:231-241`
**Severidad:** HIGH
**Descripción:**
```typescript
useEffect(() => {
  return () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const currentPending = pendingDataRef.current;
    if (currentPending) {
      saveGameDataRef.current(currentPending); // ❌ Async, puede no ejecutarse
    }
  };
}, []);
```

**Impacto:**
- Taps pendientes pueden perderse al cerrar la app
- saveGameData es async pero cleanup no espera su resolución
- React puede unmount antes de que termine el save

**Fix:**
```typescript
// Usar flush síncrono o event listener
useEffect(() => {
  const handleBeforeUnload = () => {
    if (pendingDataRef.current) {
      // Usar API síncrona o localStorage como fallback
      localStorage.setItem('pending_save', JSON.stringify(pendingDataRef.current));
    }
  };
  window.addEventListener('beforeunload', handleBeforeUnload);

  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
    // Intentar flush inmediato (best effort)
    if (pendingDataRef.current) {
      cloudStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...gameData,
        ...pendingDataRef.current
      }));
    }
  };
}, []);
```

---

### 5. **Variable Global Compartida entre Componentes** ⚠️
**Archivo:** `apps/mini-app/src/hooks/useTeamBattle.ts:19`
**Severidad:** MEDIUM-HIGH
**Descripción:**
```typescript
// ❌ Variable global fuera del hook, compartida entre todas las instancias
let cachedScores: TeamScores = { colla: 0, camba: 0, lastUpdated: 0 };
```

**Impacto:**
- Si se usan múltiples instancias de useTeamBattle, comparten el mismo cache
- Estado inconsistente entre componentes
- No es un patrón React estándar

**Fix:**
```typescript
// Usar React Context o mover dentro del hook con useRef
const cacheRef = useRef<TeamScores>({ colla: 0, camba: 0, lastUpdated: 0 });
const now = Date.now();
if (now - cacheRef.current.lastUpdated < CACHE_TTL) {
  setScores(cacheRef.current);
  return;
}
```

---

## 🟠 HIGH (Should Fix Soon)

### 6. **División por Cero Potencial - Energy Percent**
**Archivo:** `apps/mini-app/src/components/TapButton.tsx:70`
**Severidad:** MEDIUM
**Descripción:**
```typescript
const energyPercent = (energy / maxEnergy) * 100;
// ❌ Si maxEnergy === 0, energyPercent = Infinity o NaN
```

**Impacto:**
- UI rompe si maxEnergy es 0
- SVG circle con NaN en strokeDasharray

**Fix:**
```typescript
const energyPercent = maxEnergy > 0 ? (energy / maxEnergy) * 100 : 0;
```

---

### 7. **setTimeout sin Cleanup en useGameSync**
**Archivo:** `apps/mini-app/src/hooks/useGameSync.ts:186`
**Severidad:** MEDIUM
**Descripción:**
```typescript
if (wasNull && nowHasValue) {
  setTimeout(() => syncTaps(), 100); // ❌ Sin cleanup, puede ejecutarse post-unmount
}
```

**Impacto:**
- Puede intentar sincronizar después de unmount
- Warning en console: "Can't perform a React state update on unmounted component"

**Fix:**
```typescript
useEffect(() => {
  const wasNull = initDataRef.current === null;
  const nowHasValue = initDataRaw !== null;
  initDataRef.current = initDataRaw;

  if (wasNull && nowHasValue) {
    const timer = setTimeout(() => syncTaps(), 100);
    return () => clearTimeout(timer); // ✅ Cleanup
  }
}, [initDataRaw, syncTaps]);
```

---

### 8. **Validación Faltante en truncateAddress**
**Archivo:** `apps/mini-app/src/components/Header.tsx:5`
**Severidad:** LOW-MEDIUM
**Descripción:**
```typescript
function truncateAddress(address: string, start: number = 6, end: number = 4): string {
  if (!address) return '';
  return `${address.slice(0, start)}...${address.slice(-end)}`;
  // ❌ Si address.length < start + end, resultado es raro: "abc...bc"
}
```

**Impacto:**
- Para direcciones muy cortas, el resultado es confuso

**Fix:**
```typescript
function truncateAddress(address: string, start: number = 6, end: number = 4): string {
  if (!address) return '';
  if (address.length <= start + end) return address; // ✅ No truncar si muy corto
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}
```

---

### 9. **crypto.randomUUID() sin Fallback**
**Archivo:** `apps/mini-app/src/services/api.ts:238,246`
**Severidad:** LOW
**Descripción:**
```typescript
body: JSON.stringify({ taps, nonce: crypto.randomUUID() }),
// ❌ crypto.randomUUID() no disponible en navegadores viejos o HTTP (non-HTTPS)
```

**Impacto:**
- App rompe en navegadores viejos
- En desarrollo HTTP local puede fallar

**Fix:**
```typescript
function generateUUID(): string {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback usando Math.random
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Usar:
body: JSON.stringify({ taps, nonce: generateUUID() }),
```

---

### 10. **useEffect con Deps Inestables en useCloudStorage**
**Archivo:** `apps/mini-app/src/hooks/useCloudStorage.ts:121-123`
**Severidad:** MEDIUM
**Descripción:**
```typescript
useEffect(() => {
  loadGameData();
}, [loadGameData]); // ❌ loadGameData se recrea si isAvailable cambia
```

**Impacto:**
- Puede causar re-fetches innecesarios
- Loop infinito potencial si loadGameData no está bien memoizado

**Fix:**
```typescript
// loadGameData ya está en useCallback con deps correctos
// Cambiar a ejecutar solo una vez:
useEffect(() => {
  loadGameData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // Solo mount

// O asegurar que isAvailable es estable:
const isAvailableRef = useRef(cloudStorage.setItem.isAvailable());
```

---

## 🟡 MEDIUM (Nice to Fix)

### 11. **Validación Insuficiente de Timestamps**
**Archivo:** `apps/api/src/routes/game.ts:78-87`
**Severidad:** MEDIUM
**Descripción:**
```typescript
const lastRefill = new Date(lastRefillTime).getTime();
if (isNaN(lastRefill) || lastRefill <= 0) {
  // ✅ Tiene validación, PERO...
  console.warn('[Game] Invalid lastRefillTime, using current time:', lastRefillTime);
  return { energy: currentEnergy, lastRefill: new Date().toISOString() };
}
// ❌ No valida si lastRefill está en el FUTURO (clock drift, cheating)
```

**Impacto:**
- Usuario con clock adelantado podría tener energía "gratis"
- Edge case muy raro pero posible

**Fix:**
```typescript
const now = Date.now();
const lastRefill = new Date(lastRefillTime).getTime();
if (isNaN(lastRefill) || lastRefill <= 0 || lastRefill > now + 60000) {
  // ✅ Rechazar si está >1 minuto en el futuro
  console.warn('[Game] Invalid lastRefillTime:', { lastRefillTime, now });
  return { energy: currentEnergy, lastRefill: new Date().toISOString() };
}
```

---

### 12. **Debug Logs Habilitados en Producción**
**Archivos:** Múltiples (`App.tsx:9`, `Game.tsx:19`, etc.)
**Severidad:** LOW
**Descripción:**
```typescript
const DEBUG = true; // ❌ Hardcoded en producción
const log = (msg: string, data?: unknown) => {
  if (DEBUG) console.log(`[App] ${msg}`, data ?? '');
};
```

**Impacto:**
- Console spam en producción
- Potencial leak de información sensible
- Performance levemente peor

**Fix:**
```typescript
const DEBUG = import.meta.env.DEV; // ✅ Solo en desarrollo
```

---

### 13. **Falta Validación de NaN en Múltiples Lugares**
**Archivos:** Varios componentes con cálculos numéricos
**Severidad:** LOW-MEDIUM
**Descripción:**
- `ScoreDisplay.tsx`: `points.toLocaleString()` asume `points` es número válido
- `EnergyBar.tsx`: Similar con `energy`

**Impacto:**
- Si el estado corrompe, UI muestra "NaN" en vez de 0

**Fix:**
```typescript
// Agregar guards:
const safePoints = Number.isFinite(points) ? points : 0;
<h1>{safePoints.toLocaleString()}</h1>
```

---

## 🟢 LOW (Optional Improvements)

### 14. **Potencial XSS en User Names** (ya mitigado parcialmente)
**Archivo:** `apps/mini-app/src/components/Header.tsx:38,48`
**Severidad:** LOW (React ya escapa)
**Descripción:**
```typescript
<span>{user?.firstName || 'Player'}</span>
```

**Nota:** React automáticamente escapa strings, pero si firstName viene con HTML, React lo mostraría como texto plano. **No es un bug** en React, pero validar en backend es buena práctica.

**Recomendación:** API ya valida Telegram data, no hay acción necesaria.

---

### 15. **Falta Manejo de Window Resize**
**Archivo:** `apps/mini-app/src/utils/deviceFingerprint.ts`
**Severidad:** LOW
**Descripción:**
Fingerprint se genera una vez, pero si user cambia zoom o rotación del dispositivo, fingerprint queda obsoleto.

**Impacto:** Mínimo, fingerprint es para anti-cheat no crítico

**Recomendación:** Aceptable como está, pero podrían agregar listener:
```typescript
window.addEventListener('resize', debounce(updateFingerprint, 1000));
```

---

## 📊 RESUMEN

| Severidad | Cantidad | Acción |
|-----------|----------|--------|
| CRITICAL | 5 | **Fix Inmediato** |
| HIGH | 5 | Fix en próximo sprint |
| MEDIUM | 3 | Considerar para backlog |
| LOW | 2 | Nice to have |

**Total:** 15 bugs encontrados

---

## ✅ CÓDIGO BIEN HECHO (Para Celebrar)

1. ✅ **Nonce validation** en API (anti-replay attacks) - `game.ts:107-119`
2. ✅ **Anti-cheat behavioral analysis** - Completo y robusto
3. ✅ **Smart merge en syncFromServer** - Ya arreglado, previene pérdida de taps
4. ✅ **Retry logic con exponential backoff** - `api.ts:137-147`
5. ✅ **Rate limiting dual** (user + IP) - `game.ts:128`
6. ✅ **Cleanup en mayoría de useEffects** - Hooks bien diseñados
7. ✅ **TypeScript estricto** - Previene muchos bugs en tiempo de compilación

---

## 🔧 PRIORIDADES DE FIXES

### Sprint Actual (Esta Semana):
1. **Fix #1 - Frontend/Backend level sync** ⚠️ MUY IMPORTANTE
2. Fix #2 - Memory leak useTeamBattle
3. Fix #3 - Fetch timeout
4. Fix #4 - Async cleanup

### Próximo Sprint:
5. Fix #5 - Variable global
6. Fix #6 - División por cero
7. Fix #7 - setTimeout cleanup

### Backlog:
- Resto de fixes MEDIUM y LOW

---

**Generado:** 2026-04-06
**Herramienta:** Claude Code Bug Audit
**Status:** ✅ Listo para implementar fixes
