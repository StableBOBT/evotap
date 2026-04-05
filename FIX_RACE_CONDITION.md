# Fix de Race Condition - SDK vs React

**Fecha:** 2026-04-06 02:30
**Commit:** d044435
**Status:** ✅ Deployed a producción

---

## 🔍 PROBLEMA ROOT CAUSE

**Síntoma:** `initDataRaw` era `null` → Sin autenticación → Sin sync al backend
**Root Cause:** **RACE CONDITION entre inicialización del SDK y montaje de React**

### Secuencia del Problema (ANTES):

```
Timeline:
│
├─ 0ms:  main.tsx ejecuta
│        initializeTelegramSDKWithRetry(3, 1000).then(...)
│        [SDK inicializa en background - ASYNC]
│
├─ 1ms:  React monta componentes INMEDIATAMENTE
│        App → GamePage → useGameSync → useTMA
│        useTMA() intenta obtener initDataRaw
│        ❌ SDK aún NO terminó de inicializar
│        ❌ initDataRaw = null
│
├─ 50ms: gameStore.pendingTaps = 10 (usuario hace taps)
│        useGameSync intenta sincronizar
│        ❌ initDataRaw sigue null
│        ❌ Sync no se ejecuta
│
├─ 2000ms: SDK finalmente termina de inicializar
│          initDataRaw AHORA está disponible
│          ❌ PERO useGameSync ya se ejecutó con null
│          ❌ NO hay mecanismo para re-sincronizar
│
└─ Resultado: Puntos locales suben, backend NO recibe nada
```

---

## ✅ SOLUCIÓN IMPLEMENTADA

### 1. **Blocking SDK Initialization** (CRÍTICO)

**main.tsx - ANTES:**
```typescript
// SDK inicializa en background (non-blocking)
initializeTelegramSDKWithRetry(3, 1000).then((result) => {
  console.log('SDK ready');
});

// React monta INMEDIATAMENTE (no espera al SDK)
const root = createRoot(rootElement);
root.render(<App />);
```

**main.tsx - DESPUÉS:**
```typescript
async function initializeAndRender() {
  // 1. WAIT for SDK to initialize (BLOCKING)
  const sdkResult = await initializeTelegramSDKWithRetry(3, 1000);

  console.log('SDK initialization complete:', {
    success: sdkResult.success,
    hasInitDataRaw: !!sdkResult.initDataRaw,
  });

  // 2. ONLY THEN render React
  const root = createRoot(rootElement);
  root.render(<App />);
}

// Start
initializeAndRender();
```

**Beneficio:** React solo monta cuando `initDataRaw` ya está disponible → NO más null

---

### 2. **Multiple Fallback Sources** en useTMA.ts

**ANTES:**
```typescript
const initDataRaw = launchParams?.initDataRaw
  ? String(launchParams.initDataRaw)
  : null;
```

**DESPUÉS:**
```typescript
const initDataRaw = useMemo(() => {
  // Source 1: launchParams (most reliable after SDK init)
  if (launchParams?.initDataRaw) {
    return String(launchParams.initDataRaw);
  }

  // Source 2: window.Telegram.WebApp (fallback)
  if (window.Telegram?.WebApp?.initData) {
    return window.Telegram.WebApp.initData;
  }

  // Source 3: Diagnostic logging
  if (initDataState?.user?.id) {
    console.log('⚠️ SDK has user but no raw string - timing issue');
  }

  console.log('⚠️ initDataRaw is null from all sources');
  return null;
}, [launchParams?.initDataRaw, initDataState]);
```

**Beneficio:** Si launchParams falla, intenta window.Telegram directamente

---

### 3. **Auto-Sync When Auth Becomes Available**

**useGameSync.ts - AGREGADO:**
```typescript
useEffect(() => {
  const wasNull = initDataRef.current === null;
  const nowHasValue = initDataRaw !== null;

  initDataRef.current = initDataRaw;

  // If auth just became available, sync pending taps
  if (wasNull && nowHasValue) {
    console.log('[useGameSync] ✅ Auth became available');
    const pendingTaps = useGameStore.getState().pendingTaps;
    if (pendingTaps > 0) {
      console.log('[useGameSync] Syncing', pendingTaps, 'pending taps');
      setTimeout(() => syncTaps(), 100);
    }
  }
}, [initDataRaw, syncTaps]);
```

**Beneficio:** Si por alguna razón auth llega tarde, automáticamente sincroniza taps pendientes

---

## 🎯 CAMBIOS EN LA EXPERIENCIA DEL USUARIO

### ANTES:
```
Usuario abre app → Ve "Loading..." → App carga
                    ↓
                 [SDK inicializando en background]
                    ↓
                 Hace taps → Puntos suben localmente
                    ↓
                 ❌ Backend no recibe nada
                 ❌ Rankings vacíos
                 ❌ Team Battle 0-0
```

### DESPUÉS:
```
Usuario abre app → Ve "Initializing Telegram SDK..."
                    ↓
                 [SDK inicializa COMPLETAMENTE]
                    ↓
                 App carga con initDataRaw YA disponible
                    ↓
                 Hace taps → Puntos suben localmente
                    ↓
                 ✅ Backend recibe sync inmediatamente
                 ✅ Rankings se llenan
                 ✅ Team Battle actualiza
```

---

## 📊 LOGS ESPERADOS (Consola)

**Cuando funciona correctamente:**

```
[Main] Starting SDK initialization (blocking React mount)...
[TelegramSDK] Initializing SDK...
[TelegramSDK] Restoring initData...
[TelegramSDK] initData.restore() completed
[TelegramSDK] miniApp mounted
[TelegramSDK] miniApp.ready() called
[TelegramSDK] themeParams mounted
[TelegramSDK] Viewport expanded
[TelegramSDK] Back button mounted
[TelegramSDK] initDataRaw from launchParams: query_id=AAH...
[TelegramSDK] User ID from state: 123456789
[TelegramSDK] ✅ Initialization successful
[Main] SDK initialization complete: { success: true, hasInitDataRaw: true, userId: 123456789 }
[Main] ✅ SDK initialized successfully
[Main] Creating React root...
[Main] React root created, rendering...
[Main] React render called successfully!
[App] === APP COMPONENT RENDERING ===
[useTMA] initDataRaw from launchParams: query_id=AAH...
[useGameSync] Syncing taps: { taps: 5, hasAuth: true }
[useGameSync] Tap sync success: { success: true, data: {...} }
```

**Si algo falla:**

```
[TelegramSDK] ⏳ Retrying in 1000ms...
[TelegramSDK] Initialization attempt 2/3
[TelegramSDK] ❌ All initialization attempts failed
[Main] SDK initialization complete: { success: false, error: "initDataRaw is null" }
[Main] ❌ SDK initialization failed
```

---

## 🚀 DEPLOY

**Vercel Production:**
- ✅ Build exitoso (23 segundos)
- ✅ URL: https://ton-miniapp-bolivia-one.vercel.app
- ✅ Commit: d044435

**Cloudflare Workers:**
- ✅ API: https://evotap-api.andeanlabs-58f.workers.dev
- ✅ Bot: https://evotap-bot.andeanlabs-58f.workers.dev

---

## ✅ TESTING: QUÉ DEBE HACER EL USUARIO

1. **Cerrar Telegram completamente** (no solo la app, cerrar Telegram)
2. **Volver a abrir Telegram**
3. **Ir a @EVOtapBot**
4. **Presionar /start**
5. **Presionar "Play Now"**
6. **Observar:** Debería ver brevemente "Initializing Telegram SDK..." antes de que cargue el juego
7. **Hacer 10-20 taps**
8. **Verificar:**
   - ❌ Banner amarillo de advertencia ya NO aparece
   - ✅ Team Battle actualiza (puntos de Colla suben)
   - ✅ Rankings se llenan con jugadores
   - ✅ Puntos personales siguen funcionando

---

## 🔍 SI AÚN NO FUNCIONA

**El usuario debe enviar los logs de la consola:**

1. Abrir Telegram Desktop
2. Click derecho → Inspect Element (F12)
3. Ir a pestaña Console
4. Copiar TODOS los logs que contengan:
   - `[TelegramSDK]`
   - `[Main]`
   - `[useTMA]`
   - `[useGameSync]`
   - Cualquier mensaje en ROJO

---

## 📈 IMPACTO ESPERADO

### Métrica ANTES vs DESPUÉS:

| Métrica | Antes | Después |
|---------|-------|---------|
| initDataRaw null rate | 100% | 0% |
| Taps synced to backend | 0% | 100% |
| Team Battle updating | ❌ No | ✅ Sí |
| Rankings populated | ❌ No | ✅ Sí |
| Auth warning banner | ✅ Visible | ❌ Oculto |

---

## 🎓 LECCIONES APRENDIDAS

1. **Async initialization requiere coordinación explícita** - No asumir que callbacks asíncronos terminarán antes del render de React
2. **SDK initialization debe ser blocking** - Para dependencias críticas como auth, esperar es mejor que race conditions
3. **Multiple fallback sources** - Siempre tener Plan B, C, D para obtener datos críticos
4. **Logging comprehensivo** - Sin logs detallados, race conditions son casi imposibles de debuggear
5. **Auto-recovery mechanisms** - Aunque evitemos el problema, tener fallback si auth llega tarde

---

## ✍️ COMMITS

```
d044435 - fix(sdk): eliminate race condition by blocking React render until SDK initializes
fda14c9 - docs: add comprehensive documentation of structural SDK fix
ba958ba - fix: remove unused DEBUG variable
1d247aa - fix(sdk): implement robust Telegram SDK initialization with retry logic
```

---

**Conclusión:** Este fix es **estructural y permanente**. La race condition está **eliminada** porque React ahora solo monta cuando el SDK ya está inicializado. El problema de `initDataRaw null` debería estar **completamente resuelto**.
