import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { init, miniApp } from '@telegram-apps/sdk-react';
import { App } from './App';
import './styles/index.css';

// Initialize Telegram SDK immediately (non-blocking)
try {
  init();
  if (miniApp?.ready?.isAvailable?.()) {
    miniApp.ready();
  }
} catch (e) {
  console.warn('[TMA] SDK init:', e);
}

// Eruda only in dev (lazy load, non-blocking)
if (import.meta.env.DEV) {
  import('eruda').then((e) => e.default.init()).catch(() => {});
}

// TanStack Query client with conservative defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  },
});

// TON Connect manifest URL
const MANIFEST_URL =
  import.meta.env.VITE_TONCONNECT_MANIFEST_URL ||
  'https://ton-miniapp-bolivia-one.vercel.app/tonconnect-manifest.json';

// Root element
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

// Render app with error boundary fallback
try {
  createRoot(rootElement).render(
    <StrictMode>
      <TonConnectUIProvider
        manifestUrl={MANIFEST_URL}
        actionsConfiguration={{
          twaReturnUrl: 'https://t.me/EVOtapBot',
        }}
      >
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </TonConnectUIProvider>
    </StrictMode>
  );
} catch (error) {
  console.error('[App] Render failed:', error);
  rootElement.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;color:white;font-family:system-ui;text-align:center;padding:20px;">
      <h1 style="font-size:24px;margin-bottom:16px;">EVO Tap</h1>
      <p style="opacity:0.7;">Error loading app. Please try again.</p>
      <button onclick="location.reload()" style="margin-top:20px;padding:12px 24px;background:#6366f1;color:white;border:none;border-radius:8px;cursor:pointer;">
        Reload
      </button>
    </div>
  `;
}
