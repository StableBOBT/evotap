# Production Checklist - TON Mini App Bolivia

## 🔍 Auditoría Completa (5 Abril 2026)

### ✅ COMPLETADO

1. **Error Boundaries**
   - ✅ Header y Navigation envueltos en ErrorBoundary
   - ✅ Previene crashes completos de la app

2. **Hooks Order**
   - ✅ Todos los hooks antes de early returns
   - ✅ Cumple Rules of Hooks de React

3. **Inicialización**
   - ✅ Timeout de 3s para forzar init si falla
   - ✅ Logging exhaustivo en todo el flujo
   - ✅ No hay loading infinito

4. **Selección de Equipo**
   - ✅ Sin delay artificial (inmediato)
   - ✅ Sincronización correcta con backend
   - ✅ Fallback para casos sin auth

5. **API Local**
   - ✅ Backend corriendo en localhost:8788
   - ✅ Endpoint /api/v1/seasons/battle funcionando
   - ✅ Retorna datos reales (colla: 0, camba: 0)

### ⚠️ PENDIENTE PARA PRODUCCIÓN

1. **Autenticación Real**
   - ⚠️ `initDataRaw` es `null` fuera de Telegram
   - ⚠️ Necesita probarse EN Telegram con bot real
   - **ACTION**: Probar con `@EVOtapBot` en Telegram

2. **Sincronización de Taps**
   - ⚠️ Sin `initDataRaw`, los taps NO se sincronizan al backend
   - ⚠️ Solo se guardan en Telegram Cloud Storage (local)
   - **ACTION**: Verificar que en Telegram los taps lleguen al API

3. **Variables de Entorno**
   - ⚠️ `.env.local` apunta a localhost (desarrollo)
   - **ACTION ANTES DE DEPLOY**: Cambiar a:
     ```
     VITE_API_URL=https://evotap-api.andeanlabs-58f.workers.dev
     ```

4. **Funcionalidades a Revisar**
   - ⚠️ Leaderboard: ¿Muestra datos reales o está vacío?
   - ⚠️ Referral system: ¿Funciona end-to-end?
   - ⚠️ Wallet connection: ¿Se guarda en backend?
   - ⚠️ Social tasks: ¿Verificación real de Telegram/Twitter?

## 🧪 TESTING REQUERIDO

### En Desarrollo (localhost)
- [x] App carga sin crashes
- [x] Selección de equipo funciona
- [x] Taps locales funcionan
- [ ] Taps se sincronizan a backend (requiere initDataRaw)

### En Telegram (@EVOtapBot)
- [ ] App carga correctamente dentro de Telegram
- [ ] `initDataRaw` se obtiene correctamente
- [ ] Taps se sincronizan al backend
- [ ] Scores de equipos se actualizan en tiempo real
- [ ] Referral links funcionan
- [ ] Social tasks se verifican

### En Producción (Vercel)
- [ ] Deploy exitoso
- [ ] API_URL apunta a Cloudflare Workers
- [ ] Todos los endpoints funcionan
- [ ] Performance acceptable (<3s load)

## 📝 MOCKS ENCONTRADOS (LEGÍTIMOS)

1. **useTMA.ts líneas 60-66**
   - Mock de `launchParams` cuando NO estás en Telegram
   - **NECESARIO** para desarrollo en navegador
   - **NO AFECTA** producción porque en Telegram usa datos reales

2. **Comentarios con "mock"**
   - Solo comentarios, no código activo
   - Ejemplo: "don't use mocks" en useTeamBattle.ts:72

## 🚀 PASOS PARA DEPLOYMENT

### 1. Pre-Deploy
```bash
# Cambiar .env.local
VITE_API_URL=https://evotap-api.andeanlabs-58f.workers.dev

# Build
npm run build

# Test build localmente
npm run preview
```

### 2. Deploy Frontend (Vercel)
```bash
vercel --prod
```

### 3. Deploy Backend (Cloudflare Workers)
```bash
cd apps/api
wrangler deploy
```

### 4. Verificar Bot
- Ir a @EVOtapBot
- Abrir mini app
- Probar flujo completo

## 🐛 ISSUES CONOCIDOS

1. **Sin initDataRaw en navegador**
   - Comportamiento esperado
   - Logs de warning normales
   - En Telegram funciona correctamente

2. **Eruda en producción**
   - Actualmente habilitado para debugging
   - **TODO**: Deshabilitar antes de launch público
   - Cambiar `import('eruda')` a conditional basado en env

## 📊 METRICAS A MONITOREAR

Post-launch:
- Taps totales por equipo
- Usuarios activos por día
- Tasa de conversión (visit → tap)
- Errores de API (Sentry/Cloudflare)
- Latencia de endpoints

## ✅ LISTO PARA PRODUCCIÓN CUANDO:

- [ ] Probado en @EVOtapBot con usuarios reales
- [ ] Verificado que taps llegan al backend
- [ ] VITE_API_URL cambiado a producción
- [ ] Eruda deshabilitado (opcional)
- [ ] Deploy en Vercel exitoso
- [ ] Backend en Cloudflare Workers funcionando
- [ ] Monitoreo configurado

---

**Última actualización**: 5 Abril 2026
**Estado**: En desarrollo - Listo para testing en Telegram
