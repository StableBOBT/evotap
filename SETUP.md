# Setup Guide - EVO Token TON

Guia para configurar el proyecto desde cero en otro ordenador.

## Requisitos

```bash
# Node.js 18+
node --version  # v18.x o superior

# pnpm (recomendado)
npm install -g pnpm

# Git
git --version

# Vercel CLI
npm install -g vercel
```

## 1. Clonar Repositorio

```bash
git clone https://github.com/kawsaymunay7-art/ton-miniapp-bolivia.git
cd ton-miniapp-bolivia
```

## 2. Instalar Dependencias

```bash
pnpm install
```

## 3. Configurar Variables de Entorno

### Crear archivo .env.local

```bash
cp .env.example .env.local
```

### Editar .env.local

```env
# Telegram Bot (obtener de @BotFather)
BOT_TOKEN=tu_bot_token_aqui
BOT_USERNAME=EVOtapBot

# Database (Neon - https://neon.tech)
DATABASE_URL=postgresql://user:pass@host/db

# Redis (Upstash - https://upstash.com)
REDIS_URL=redis://default:pass@host:port

# API
API_URL=https://tu-api.railway.app
VITE_API_URL=https://tu-api.railway.app

# TON
JETTON_MASTER_ADDRESS=  # Despues del deploy
```

## 4. Crear Bot de Telegram

```
1. Abrir Telegram, buscar @BotFather
2. Enviar /newbot
3. Nombre: EVO Token
4. Username: EVOtapBot (o uno disponible)
5. Guardar el BOT_TOKEN
6. Enviar /setmenubutton
7. Seleccionar tu bot
8. Ingresar URL de la Mini App (despues del deploy)
```

## 5. Configurar Base de Datos

### Neon (PostgreSQL gratuito)

```
1. Ir a https://neon.tech
2. Crear cuenta/proyecto
3. Copiar DATABASE_URL
4. Ejecutar migraciones:
   pnpm db:migrate
```

### Upstash (Redis gratuito)

```
1. Ir a https://upstash.com
2. Crear cuenta/database
3. Copiar REDIS_URL
```

## 6. Deploy a Vercel

### Primera vez

```bash
# Login con token
vercel login

# O usar token directamente
export VERCEL_TOKEN=vcp_xxx

# Deploy
vercel

# Seguir instrucciones interactivas
# - Link to existing project? No
# - Project name: evo-token-ton
# - Directory: ./apps/mini-app (cuando exista)
```

### Deploys siguientes

```bash
# Preview
vercel

# Produccion
vercel --prod
```

### Configurar Variables en Vercel

```bash
vercel env add BOT_TOKEN
vercel env add DATABASE_URL
vercel env add REDIS_URL
# etc.
```

## 7. Deploy Backend (Railway)

```
1. Ir a https://railway.app
2. New Project > Deploy from GitHub
3. Seleccionar repositorio
4. Root Directory: apps/api
5. Agregar variables de entorno
6. Deploy automatico con cada push
```

## 8. Desarrollo Local

### Mini App

```bash
cd apps/mini-app
pnpm dev
# Abre http://localhost:5173
```

### API

```bash
cd apps/api
pnpm dev
# Abre http://localhost:3000
```

### Bot

```bash
cd apps/bot
pnpm dev
```

### Testing con Telegram

```bash
# Necesitas HTTPS para Telegram
# Opcion 1: ngrok
ngrok http 5173

# Opcion 2: Cloudflare Tunnel
cloudflared tunnel --url http://localhost:5173

# Usar la URL https en BotFather
```

## 9. Estructura del Proyecto

```
evo-token-ton/
├── apps/
│   ├── mini-app/      # Frontend React (Vercel)
│   ├── api/           # Backend Express (Railway)
│   └── bot/           # Telegram Bot (Railway)
├── packages/
│   ├── core/          # Logica compartida
│   ├── contracts/     # Smart contracts TON
│   └── ui/            # Componentes compartidos
├── docs/              # Documentacion
└── .claude/           # Config Claude Code
```

## 10. Comandos Utiles

```bash
# Desarrollo
pnpm dev              # Todos los apps
pnpm dev:app          # Solo mini-app
pnpm dev:api          # Solo API
pnpm dev:bot          # Solo bot

# Build
pnpm build            # Build todos
pnpm build:app        # Build mini-app

# Database
pnpm db:migrate       # Correr migraciones
pnpm db:studio        # Abrir Prisma Studio
pnpm db:seed          # Seed inicial

# Tests
pnpm test             # Correr tests
pnpm test:watch       # Watch mode

# Deploy
vercel                # Preview
vercel --prod         # Produccion
```

## 11. Crear Token (Cuando Este Listo)

```bash
# 1. Ir a minter.ton.org
# 2. Conectar Tonkeeper
# 3. Configurar:
#    - Name: EVO Token
#    - Symbol: EVO
#    - Decimals: 9
#    - Supply: 1000000000
# 4. Deploy (~0.5 TON)
# 5. Guardar JETTON_MASTER_ADDRESS
```

## 12. Checklist Pre-Launch

```
[ ] Bot creado y configurado
[ ] Mini App deployada en Vercel
[ ] API deployada en Railway
[ ] Database configurada
[ ] Variables de entorno en todos los servicios
[ ] tonconnect-manifest.json accesible
[ ] Dominio personalizado (opcional)
[ ] Testing completo en dispositivo real
[ ] Canal de Telegram creado
[ ] Grupo de comunidad creado
```

## Links de Servicios

| Servicio | URL | Proposito |
|----------|-----|-----------|
| Vercel | vercel.com | Frontend hosting |
| Railway | railway.app | Backend hosting |
| Neon | neon.tech | PostgreSQL |
| Upstash | upstash.com | Redis |
| BotFather | t.me/BotFather | Crear bot |
| TON Minter | minter.ton.org | Crear token |
| STON.fi | ston.fi | DEX/Liquidez |

## Troubleshooting

### Error: initData vacio
- Asegurate de abrir la app DENTRO de Telegram, no en browser

### Error: CORS
- Verificar que el backend permite el origen de la Mini App

### Error: Wallet no conecta
- Verificar que tonconnect-manifest.json es accesible
- URL debe ser HTTPS

### Error: Bot no responde
- Verificar BOT_TOKEN
- Verificar que el bot esta corriendo

## Vercel Token (Andelabs)

Para deployar desde otro ordenador con el token de Vercel:

```bash
# El token esta guardado en archivo local (ver SECRETS.local.md)
# Exportar antes de usar:
export VERCEL_TOKEN=<tu_token_aqui>

# Deploy con token
vercel --token $VERCEL_TOKEN

# Produccion
vercel --token $VERCEL_TOKEN --prod
```

**IMPORTANTE:** El token NO esta en git. Pedir a @kawsaymunay7-art o ver notas locales.

## Contacto

- Telegram: @EVOcommunity
- GitHub Issues: github.com/kawsaymunay7-art/ton-miniapp-bolivia/issues
