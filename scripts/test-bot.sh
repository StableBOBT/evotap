#!/bin/bash

# Script para verificar la configuración del bot
# Uso: ./scripts/test-bot.sh

set -e

echo "🤖 VERIFICACIÓN DEL BOT @evoliviabot"
echo "===================================="
echo ""

# Cargar token
if [ ! -f ".env.bot" ]; then
    echo "❌ Error: .env.bot no encontrado"
    echo "   Asegúrate de estar en el directorio raíz del proyecto"
    exit 1
fi

source .env.bot

# Verificar que el token existe
if [ -z "$BOT_TOKEN" ]; then
    echo "❌ Error: BOT_TOKEN no definido en .env.bot"
    exit 1
fi

echo "✅ Token encontrado"
echo ""

# Obtener info del bot
echo "📱 INFORMACIÓN DEL BOT:"
echo "----------------------"
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getMe" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if data['ok']:
        result = data['result']
        print(f\"  Username: @{result['username']}\")
        print(f\"  Name: {result['first_name']}\")
        print(f\"  ID: {result['id']}\")
        print(f\"  Is Bot: {result['is_bot']}\")
    else:
        print(f\"  ❌ Error: {data.get('description', 'Unknown error')}\")
except Exception as e:
    print(f\"  ❌ Error parsing response: {e}\")
"
echo ""

# Verificar menu button
echo "🎮 MENU BUTTON (WEB APP):"
echo "-------------------------"
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getChatMenuButton" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if data['ok']:
        btn = data['result']
        if btn.get('type') == 'web_app':
            print(f\"  ✅ Type: {btn['type']}\")
            print(f\"  Text: {btn['text']}\")
            print(f\"  URL: {btn['web_app']['url']}\")
        else:
            print(f\"  ⚠️  Type: {btn.get('type', 'unknown')}\")
            print(f\"  (No es web_app, necesita configuración)\")
    else:
        print(f\"  ❌ Error: {data.get('description', 'Unknown error')}\")
except Exception as e:
    print(f\"  ❌ Error parsing response: {e}\")
"
echo ""

# Listar comandos
echo "📝 COMANDOS CONFIGURADOS:"
echo "-------------------------"
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getMyCommands" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if data['ok']:
        commands = data['result']
        if commands:
            for cmd in commands:
                print(f\"  /{cmd['command']:15} - {cmd['description']}\")
        else:
            print(f\"  ⚠️  No hay comandos configurados\")
    else:
        print(f\"  ❌ Error: {data.get('description', 'Unknown error')}\")
except Exception as e:
    print(f\"  ❌ Error parsing response: {e}\")
"
echo ""

# Verificar que la URL funciona
echo "🌐 VERIFICANDO MINI APP URL:"
echo "----------------------------"
MINI_APP_URL="https://ton-miniapp-bolivia.vercel.app"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$MINI_APP_URL")

if [ "$HTTP_CODE" = "200" ]; then
    echo "  ✅ URL funciona: $MINI_APP_URL"
    echo "  HTTP Status: $HTTP_CODE"
else
    echo "  ⚠️  URL responde con: $HTTP_CODE"
    echo "  URL: $MINI_APP_URL"
fi
echo ""

# Resumen final
echo "=================================="
echo "✅ VERIFICACIÓN COMPLETADA"
echo ""
echo "🎮 PROBAR AHORA:"
echo "   https://t.me/evoliviabot"
echo ""
echo "📚 DOCUMENTACIÓN:"
echo "   ./BOT_CONFIGURATION.md"
echo "=================================="
