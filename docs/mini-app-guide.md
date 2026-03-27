# Guia de Desarrollo - Mini App TON

## Setup Inicial

### Requisitos

```bash
Node.js >= 18
pnpm (recomendado) o npm
Cuenta de Telegram
Bot creado via @BotFather
```

### Crear Proyecto

```bash
# Usar template oficial
npx @anthropic-ai/create-tma my-mini-app

# O manualmente
mkdir evo-mini-app && cd evo-mini-app
pnpm init
pnpm add react react-dom @tma.js/sdk @tonconnect/ui-react
pnpm add -D vite @vitejs/plugin-react typescript tailwindcss
```

### Estructura Base

```
/src
├── /components
│   ├── TapButton.tsx      # Boton principal de tap
│   ├── EnergyBar.tsx      # Barra de energia
│   ├── PointsDisplay.tsx  # Contador de puntos
│   ├── Leaderboard.tsx    # Top usuarios
│   └── ReferralLink.tsx   # Link de referido
├── /hooks
│   ├── useTelegram.ts     # Hook para Telegram SDK
│   ├── useGame.ts         # Estado del juego
│   └── useAuth.ts         # Autenticacion
├── /pages
│   ├── Home.tsx           # Pantalla principal (tap)
│   ├── Friends.tsx        # Referidos
│   ├── Tasks.tsx          # Tareas
│   └── Wallet.tsx         # Conexion wallet
├── /stores
│   └── gameStore.ts       # Zustand store
├── /utils
│   └── api.ts             # Cliente API
├── App.tsx
└── main.tsx
```

---

## Configuracion Vite

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer'],
      globals: { Buffer: true },
    }),
  ],
  build: {
    outDir: 'dist',
    minify: 'terser',
  },
  server: {
    host: true, // Para testing local con ngrok
  },
});
```

---

## Integracion Telegram SDK

### Hook Principal

```typescript
// src/hooks/useTelegram.ts
import { useEffect, useState } from 'react';

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  close: () => void;
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
      is_premium?: boolean;
    };
    start_param?: string;
  };
  themeParams: {
    bg_color?: string;
    text_color?: string;
    button_color?: string;
    button_text_color?: string;
  };
  colorScheme: 'light' | 'dark';
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
  };
}

export function useTelegram() {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [user, setUser] = useState<TelegramWebApp['initDataUnsafe']['user']>();

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      setWebApp(tg);
      setUser(tg.initDataUnsafe.user);
    }
  }, []);

  const haptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
    webApp?.HapticFeedback.impactOccurred(type);
  };

  return {
    webApp,
    user,
    initData: webApp?.initData,
    startParam: webApp?.initDataUnsafe.start_param,
    colorScheme: webApp?.colorScheme,
    haptic,
  };
}
```

---

## Componente de Tap

```tsx
// src/components/TapButton.tsx
import { useState, useCallback } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import { useGameStore } from '../stores/gameStore';

export function TapButton() {
  const { haptic } = useTelegram();
  const { points, energy, addPoints, useEnergy } = useGameStore();
  const [taps, setTaps] = useState<{ id: number; x: number; y: number }[]>([]);

  const handleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (energy <= 0) return;

    // Haptic feedback
    haptic('light');

    // Calcular posicion del tap
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Animacion flotante de "+1"
    const tapId = Date.now();
    setTaps(prev => [...prev, { id: tapId, x, y }]);
    setTimeout(() => {
      setTaps(prev => prev.filter(t => t.id !== tapId));
    }, 1000);

    // Actualizar estado
    addPoints(1);
    useEnergy(1);
  }, [energy, haptic, addPoints, useEnergy]);

  return (
    <div className="relative flex items-center justify-center">
      <button
        onClick={handleTap}
        onTouchStart={handleTap}
        disabled={energy <= 0}
        className={`
          w-64 h-64 rounded-full
          bg-gradient-to-br from-yellow-400 to-orange-500
          shadow-2xl transform transition-transform
          active:scale-95 disabled:opacity-50
          flex items-center justify-center
        `}
      >
        <span className="text-8xl">🪙</span>
      </button>

      {/* Animaciones de +1 */}
      {taps.map(tap => (
        <span
          key={tap.id}
          className="absolute text-2xl font-bold text-yellow-400 animate-float-up pointer-events-none"
          style={{ left: tap.x, top: tap.y }}
        >
          +1
        </span>
      ))}
    </div>
  );
}
```

---

## Estado del Juego (Zustand)

```typescript
// src/stores/gameStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GameState {
  points: number;
  energy: number;
  energyMax: number;
  level: number;
  lastEnergyUpdate: number;

  // Actions
  addPoints: (amount: number) => void;
  useEnergy: (amount: number) => void;
  rechargeEnergy: () => void;
  syncWithServer: () => Promise<void>;
}

const ENERGY_RECHARGE_RATE = 1; // 1 energia por segundo

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      points: 0,
      energy: 1000,
      energyMax: 1000,
      level: 1,
      lastEnergyUpdate: Date.now(),

      addPoints: (amount) => {
        set(state => ({
          points: state.points + amount * state.level,
        }));
      },

      useEnergy: (amount) => {
        set(state => ({
          energy: Math.max(0, state.energy - amount),
        }));
      },

      rechargeEnergy: () => {
        const now = Date.now();
        const elapsed = Math.floor((now - get().lastEnergyUpdate) / 1000);
        const recharge = elapsed * ENERGY_RECHARGE_RATE;

        set(state => ({
          energy: Math.min(state.energyMax, state.energy + recharge),
          lastEnergyUpdate: now,
        }));
      },

      syncWithServer: async () => {
        const state = get();
        try {
          const response = await fetch('/api/game/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              points: state.points,
              energy: state.energy,
            }),
          });
          const data = await response.json();
          set({
            points: data.points,
            energy: data.energy,
            level: data.level,
          });
        } catch (error) {
          console.error('Sync failed:', error);
        }
      },
    }),
    {
      name: 'evo-game-storage',
    }
  )
);
```

---

## TON Connect Setup

```tsx
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TonConnectUIProvider
      manifestUrl="https://evo-token.com/tonconnect-manifest.json"
      actionsConfiguration={{
        twaReturnUrl: 'https://t.me/EVOtapBot',
      }}
    >
      <App />
    </TonConnectUIProvider>
  </React.StrictMode>
);
```

### Boton de Wallet

```tsx
// src/components/WalletButton.tsx
import { TonConnectButton, useTonAddress } from '@tonconnect/ui-react';

export function WalletButton() {
  const address = useTonAddress();

  return (
    <div className="flex flex-col items-center gap-4">
      <TonConnectButton />

      {address && (
        <p className="text-sm text-gray-500">
          Conectado: {address.slice(0, 6)}...{address.slice(-4)}
        </p>
      )}
    </div>
  );
}
```

---

## Sistema de Referidos

```tsx
// src/components/ReferralLink.tsx
import { useState } from 'react';
import { useTelegram } from '../hooks/useTelegram';

export function ReferralLink() {
  const { user } = useTelegram();
  const [copied, setCopied] = useState(false);

  const referralLink = `https://t.me/EVOtapBot?start=ref_${user?.id}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = () => {
    const text = `Unete a $EVO y gana puntos que se convierten en crypto!
Usa mi link y empezamos los dos con bonus:`;

    window.Telegram?.WebApp.openTelegramLink(
      `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(text)}`
    );
  };

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <h3 className="text-lg font-bold mb-2">Invita Amigos</h3>
      <p className="text-sm text-gray-400 mb-4">
        +5,000 puntos por cada amigo
      </p>

      <div className="flex gap-2">
        <button
          onClick={copyLink}
          className="flex-1 py-2 bg-gray-700 rounded"
        >
          {copied ? 'Copiado!' : 'Copiar Link'}
        </button>

        <button
          onClick={shareLink}
          className="flex-1 py-2 bg-blue-600 rounded"
        >
          Compartir
        </button>
      </div>
    </div>
  );
}
```

---

## Estilos CSS (Tailwind)

```css
/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --tg-theme-bg-color: #1a1a1a;
  --tg-theme-text-color: #ffffff;
  --tg-theme-button-color: #3b82f6;
}

body {
  background-color: var(--tg-theme-bg-color);
  color: var(--tg-theme-text-color);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  margin: 0;
  padding: 0;
  min-height: 100vh;
  overflow-x: hidden;
}

/* Animacion flotante para +1 */
@keyframes float-up {
  0% {
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateY(-50px);
  }
}

.animate-float-up {
  animation: float-up 1s ease-out forwards;
}

/* Desactivar seleccion de texto (mejor UX en tap) */
* {
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}
```

---

## Testing Local

### 1. Crear Bot en BotFather

```
1. Buscar @BotFather en Telegram
2. /newbot
3. Seguir instrucciones
4. Guardar BOT_TOKEN
```

### 2. Configurar Mini App

```
1. En BotFather: /mybots -> Tu bot -> Bot Settings
2. Menu Button -> Configure menu button
3. Ingresar URL de tu app (necesita HTTPS)
```

### 3. Usar ngrok para HTTPS local

```bash
# Terminal 1: Correr app
pnpm dev

# Terminal 2: Exponer con ngrok
ngrok http 5173
```

### 4. Configurar URL en BotFather

Usar la URL de ngrok (https://xxxx.ngrok.io)

---

## Deployment

### Vercel (Recomendado)

```bash
# Instalar Vercel CLI
pnpm add -g vercel

# Deploy
vercel

# Configurar dominio personalizado en Vercel Dashboard
```

### Variables de Entorno

```env
# .env
VITE_API_URL=https://api.evo-token.com
VITE_BOT_USERNAME=EVOtapBot
```

---

## Checklist Pre-Launch

```
[ ] Bot creado y configurado
[ ] Mini App hosteada con HTTPS
[ ] Menu button configurado
[ ] tonconnect-manifest.json accesible
[ ] API backend funcionando
[ ] Validacion de initData implementada
[ ] Rate limiting activo
[ ] Testing en dispositivo real
[ ] Analytics configurado
```

---

## Recursos

### Templates
- [reactjs-template](https://github.com/Telegram-Mini-Apps/reactjs-template)
- [Hamster Clone](https://github.com/nikandr-surkov/Hamster-Kombat-Telegram-Mini-App-Clone)

### Documentacion
- [Telegram Mini Apps](https://core.telegram.org/bots/webapps)
- [tma.js SDK](https://docs.telegram-mini-apps.com/)
- [TON Connect](https://docs.ton.org/ecosystem/ton-connect/overview)

---

*Guia de desarrollo - Actualizar segun necesidades*
