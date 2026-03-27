# /miniapp-dev - Desarrollo de Mini App

Skill para desarrollar y debuggear Mini Apps de Telegram.

## Trigger

Usuario dice: `/miniapp-dev`, "crear mini app", "desarrollar app", "telegram app"

## Stack Recomendado

```
Frontend:   React + Vite + TailwindCSS
SDK:        @tma.js/sdk + @tonconnect/ui-react
Backend:    Node.js + Express (o Next.js)
Database:   PostgreSQL + Redis
Deploy:     Vercel + Railway
```

## Comandos de Setup

```bash
# Crear proyecto con template
npx @anthropic-ai/create-tma evo-mini-app
cd evo-mini-app

# Instalar dependencias
pnpm install

# Desarrollo local
pnpm dev

# Build produccion
pnpm build
```

## Estructura de Archivos

```
/src
├── /components     # Componentes React
├── /hooks          # Custom hooks (useTelegram, useGame)
├── /pages          # Paginas/vistas
├── /stores         # Estado global (Zustand)
├── /utils          # Helpers y API client
├── App.tsx
└── main.tsx
```

## Hooks Esenciales

### useTelegram

```typescript
import { useTelegram } from './hooks/useTelegram';

const { webApp, user, initData, haptic } = useTelegram();

// Feedback tactil
haptic('light'); // light | medium | heavy

// Datos del usuario
console.log(user?.id, user?.first_name);
```

### useGame

```typescript
import { useGameStore } from './stores/gameStore';

const { points, energy, addPoints, useEnergy } = useGameStore();
```

## Testing Local

```bash
# Terminal 1: App
pnpm dev

# Terminal 2: Tunnel HTTPS
ngrok http 5173
# Usar URL de ngrok en BotFather
```

## Debugging

### iOS
1. Safari > Develop > Tu dispositivo
2. Inspeccionar WebView

### Android
1. chrome://inspect
2. USB debugging habilitado

### Desktop
Telegram Desktop Beta tiene inspector integrado

## Checklist Deploy

```
[ ] HTTPS obligatorio
[ ] tonconnect-manifest.json accesible
[ ] Variables de entorno configuradas
[ ] CORS configurado en backend
[ ] Rate limiting activo
```

## Errores Comunes

| Error | Solucion |
|-------|----------|
| initData vacio | Usar dentro de Telegram |
| CORS blocked | Configurar headers backend |
| Wallet no conecta | Verificar manifest URL |
| Haptic no funciona | Solo funciona en mobile |
