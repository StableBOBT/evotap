// FIRST LOG - Before any imports
console.log('=== MAIN.TSX LOADING ===');
console.log('Window:', typeof window);
console.log('Document:', typeof document);

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { init, miniApp } from '@telegram-apps/sdk-react';
import { App } from './App';
import './styles/index.css';

console.log('=== IMPORTS LOADED ===');

// Initialize Telegram SDK immediately (non-blocking)
try {
  console.log('[TMA] Initializing SDK...');
  init();
  if (miniApp?.ready?.isAvailable?.()) {
    miniApp.ready();
  }
  console.log('[TMA] SDK initialized');
} catch (e) {
  console.warn('[TMA] SDK init:', e);
}

// Eruda for debugging (only in development)
if (import.meta.env.VITE_ENVIRONMENT === 'development') {
  console.log('[Main] Loading Eruda for development...');
  import('eruda').then((e) => {
    e.default.init();
    console.log('[Main] Eruda initialized!');
  }).catch((err) => {
    console.error('[Main] Eruda failed to load:', err);
  });
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
console.log('[Main] Looking for root element...');
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('[Main] Root element not found!');
  throw new Error('Root element not found');
}
console.log('[Main] Root element found:', rootElement);

// Show immediate feedback
rootElement.innerHTML = '<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);color:white;font-size:20px;text-align:center;"><div style="margin-bottom:20px;">🔄 JavaScript is loading...</div><div style="font-size:14px;opacity:0.5;">Check console (F12)</div></div>';
console.log('[Main] Temporary loading UI set');

// Render app with error boundary fallback
try {
  console.log('[Main] Creating React root...');
  const root = createRoot(rootElement);
  console.log('[Main] React root created, rendering...');

  root.render(
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

  console.log('[Main] React render called successfully!');
} catch (error) {
  console.error('[Main] Render failed:', error);
  rootElement.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;color:white;font-family:system-ui;text-align:center;padding:20px;">
      <h1 style="font-size:24px;margin-bottom:16px;">EVO Tap</h1>
      <p style="opacity:0.7;">Error loading app. Please try again.</p>
      <p style="opacity:0.5;font-size:12px;margin-top:10px;">Error: ${error instanceof Error ? error.message : 'Unknown'}</p>
      <button onclick="location.reload()" style="margin-top:20px;padding:12px 24px;background:#6366f1;color:white;border:none;border-radius:8px;cursor:pointer;">
        Reload
      </button>
    </div>
  `;
}
