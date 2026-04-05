# Instrucciones de Debug - EVO Tap

**Última actualización:** 2026-04-05 23:55

---

## 🔍 PROBLEMA ACTUAL

Los puntos personales suben pero:
- ❌ Team Battle no actualiza (sigue 0-0)
- ❌ Rankings vacíos
- ❌ Taps no llegan al backend

**Causa probable:** `initDataRaw` es `null` → sin autenticación de Telegram

---

## ✅ QUÉ VER AHORA

### 1. Banner de Advertencia

Abre el juego desde Telegram y busca un **banner amarillo** en la parte superior:

```
⚠️ Sin autenticación Telegram
Taps solo guardan localmente. Rankings y Team Battle no actualizan.
Abre desde @EVOtapBot.
```

**Si lo ves:**
- ✅ Confirma que initDataRaw es null
- ✅ Explica por qué no funciona el backend
- ⏭️ Pasa al paso 2

**Si NO lo ves:**
- El problema es otro
- Ve al paso 3

---

### 2. Cómo Abrir Correctamente desde Telegram

**Pasos correctos:**

1. Abre Telegram (app móvil o desktop - **NO web.telegram.org**)
2. Busca `@EVOtapBot` o usa este link: https://t.me/EVOtapBot
3. Presiona `/start`
4. Presiona el botón **"Play Now"** (azul)
5. La mini app debe abrir DENTRO de Telegram (no en navegador externo)

**Si se abre en navegador:**
- Cierra el navegador
- En Telegram, ve a Settings → Data and Storage → Web Page Preview
- Asegúrate que esté habilitado
- Intenta de nuevo

---

### 3. Ver la Consola de JavaScript

Para entender qué está pasando, necesitas ver los logs:

#### En Telegram Desktop (Windows/Mac/Linux):
1. Abre el juego
2. Click derecho en cualquier parte → "Inspect Element" o "Inspect"
3. Ve a la pestaña "Console"
4. Busca mensajes que digan `[useTMA]` o `[useGameSync]`

#### En Telegram iOS:
1. Conecta tu iPhone a una Mac
2. Safari → Develop → [Tu iPhone] → Telegram WebView
3. Ve a Console

#### En Telegram Android:
1. Habilita USB Debugging en el celular
2. Conecta a PC con Chrome
3. Chrome → `chrome://inspect`
4. Busca la WebView de Telegram
5. Click en "Inspect"

**Qué buscar:**

```javascript
// Esto debería aparecer:
[useTMA] Environment check: {isTelegram: true, hasLaunchParams: true, hasInitDataRaw: true}
[useTMA] initDataRaw computed: query_id=... (texto largo)

// Si ves esto MAL:
[useTMA] initDataRaw computed: null  ← PROBLEMA AQUÍ
```

---

### 4. Qué Reportar

Copia y pega **TODOS** los mensajes de la consola que contengan:
- `[useTMA]`
- `[useGameSync]`
- `[Game]`
- `[GameStore]`
- Cualquier mensaje en ROJO (errores)

Envía toda esa info para diagnosticar.

---

## 🛠️ POSIBLES SOLUCIONES

### Solución 1: Usar la App de Telegram (no web)

El problema más común es usar `web.telegram.org` en vez de la app:

- ❌ web.telegram.org → NO envía initData correctamente
- ✅ Telegram Desktop → Envía initData ✅
- ✅ Telegram iOS/Android → Envía initData ✅

**Fix:** Descarga la app de Telegram y úsala.

### Solución 2: Borrar Caché

Si usas Telegram Desktop:
1. Settings → Advanced → Clear cache
2. Reinicia Telegram
3. Abre el bot de nuevo

### Solución 3: Verificar Permisos

1. En el chat del bot, presiona el nombre arriba
2. Ve a "Permissions"
3. Asegúrate que el bot tenga permiso de "Send messages"

### Solución 4: Reinstalar Bot

1. Busca @EVOtapBot
2. Presiona "Stop" o "Block"
3. Presiona "/start" de nuevo
4. Acepta los permisos
5. Presiona "Play Now"

---

## 📊 VERIFICAR QUE FUNCIONA

Cuando esté funcionando correctamente deberías ver:

1. **NO hay banner amarillo de advertencia**
2. **En consola:**
   ```
   [useTMA] initDataRaw computed: query_id=AAH...
   [useGameSync] Syncing taps: {taps: 5, hasAuth: true}
   [useGameSync] Tap sync success: {success: true, ...}
   ```
3. **Team Battle actualiza** (puntos de Colla/Camba suben)
4. **Rankings se llenan** (apareces en la tabla)

---

## 🆘 SI NADA FUNCIONA

Envía capturas de pantalla de:

1. La app completa (incluyendo si ves el banner amarillo)
2. La consola de JavaScript (todos los logs)
3. Cómo estás abriendo la app (desde dónde)
4. Qué versión de Telegram usas (desktop/mobile/web)
5. Sistema operativo

---

## 📞 CONTACTO

Si necesitas ayuda urgente, reporta en el issue de GitHub con toda la info de arriba.
