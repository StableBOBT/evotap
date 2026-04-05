# 🤖 Configuración del Bot - @evoliviabot

## 🔐 TOKEN DE SEGURIDAD

El token del bot está guardado de forma segura en:
```
/Users/munay/dev/memeBolivia/ton-miniapp-bolivia/.env.bot
```

**⚠️ IMPORTANTE**: Este archivo está en `.gitignore` y NUNCA se subirá a GitHub.

---

## 📱 INFORMACIÓN DEL BOT

- **Username**: @evoliviabot
- **Bot ID**: 8712808190
- **Nombre**: evobot
- **Token**: `8712808190:AAHAxj8VvkUQEhde23Ijbed2OD8FEPyzP7w`

---

## 🎮 CONFIGURACIÓN ACTUAL (5 Abril 2026)

### Menu Button (Web App)
```json
{
  "type": "web_app",
  "text": "🎮 Jugar EVO Tap",
  "web_app": {
    "url": "https://ton-miniapp-bolivia.vercel.app"
  }
}
```

### Comandos Disponibles
```
/start - Iniciar el juego
/play - Jugar EVO Tap
/stats - Ver mis estadísticas
/leaderboard - Ver ranking
/help - Ayuda
```

### Descripción del Bot
```
🎮 EVO Tap - El juego tap-to-earn de Bolivia

👆 Haz tap para ganar puntos
🏔️ Únete a Colla o Camba
🏆 Compite en el ranking
💎 Gana recompensas reales
```

### Short Description
```
🎮 Juego tap-to-earn de Bolivia. Únete a Colla o Camba y gana recompensas!
```

---

## 🔄 CÓMO ACTUALIZAR EL BOT

### Opción 1: Usando el script guardado

```bash
# El token está en .env.bot
source .env.bot

# Actualizar menu button
curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setChatMenuButton" \\
  -H "Content-Type: application/json" \\
  -d '{
    "menu_button": {
      "type": "web_app",
      "text": "🎮 Jugar EVO Tap",
      "web_app": {
        "url": "https://ton-miniapp-bolivia.vercel.app"
      }
    }
  }'
```

### Opción 2: Manual vía BotFather

1. Abrir https://t.me/BotFather
2. Enviar: `/mybots`
3. Seleccionar: `@evoliviabot`
4. Seguir las instrucciones

---

## 📋 CHECKLIST DE VERIFICACIÓN

- [x] Token guardado en `.env.bot`
- [x] Archivo `.env.bot` en `.gitignore`
- [x] Menu button configurado con Web App
- [x] URL apunta a: https://ton-miniapp-bolivia.vercel.app
- [x] Comandos configurados
- [x] Descripción configurada
- [x] Short description configurada

---

## 🔗 LINKS IMPORTANTES

- **Bot**: https://t.me/evoliviabot
- **Mini App**: https://ton-miniapp-bolivia.vercel.app ✅ LIVE
- **API Backend**: https://evotap-api.andeanlabs-58f.workers.dev
- **Vercel Dashboard**: https://vercel.com/nunalabs-projects/ton-miniapp-bolivia
- **Latest Deployment**: https://ton-miniapp-bolivia-jz70wao8i-nunalabs-projects.vercel.app

---

## 🛠️ COMANDOS ÚTILES

### Ver info del bot
```bash
source .env.bot
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getMe" | jq .
```

### Ver menu button actual
```bash
source .env.bot
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getChatMenuButton" | jq .
```

### Ver comandos configurados
```bash
source .env.bot
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getMyCommands" | jq .
```

### Cambiar URL del mini app
```bash
source .env.bot
NEW_URL="https://nueva-url.vercel.app"

curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setChatMenuButton" \\
  -H "Content-Type: application/json" \\
  -d "{
    \\"menu_button\\": {
      \\"type\\": \\"web_app\\",
      \\"text\\": \\"🎮 Jugar EVO Tap\\",
      \\"web_app\\": {
        \\"url\\": \\"${NEW_URL}\\"
      }
    }
  }"
```

---

## ⚠️ SEGURIDAD

### ¿Qué hacer si el token se compromete?

1. **Inmediatamente** ir a @BotFather
2. Enviar: `/mybots`
3. Seleccionar: `@evoliviabot`
4. Seleccionar: `API Token`
5. Seleccionar: `Revoke current token`
6. Copiar el nuevo token
7. Actualizar `.env.bot` con el nuevo token
8. Reconfigurar el bot con los comandos de arriba

### Buenas prácticas

- ✅ Nunca compartir el token públicamente
- ✅ Nunca commitear el token a Git
- ✅ Usar variables de entorno
- ✅ Revisar `.gitignore` regularmente
- ✅ Rotar el token periódicamente (cada 6 meses)

---

**Última actualización**: 5 Abril 2026, 20:15 UTC
**Configurado por**: Claude Code
**Status**: ✅ Funcionando correctamente
