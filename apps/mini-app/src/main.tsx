import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { init, miniApp } from '@telegram-apps/sdk-react';
import { App } from './App';
import './styles/index.css';

// Initialize Telegram Mini Apps SDK with error handling
try {
  init();
  // Signal ready IMMEDIATELY to remove Telegram's loading screen
  if (miniApp.ready.isAvailable()) {
    miniApp.ready();
  }
} catch (e) {
  console.warn('Failed to initialize TMA SDK:', e);
}

// TanStack Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  },
});

// TON Connect manifest URL - must be publicly accessible
const MANIFEST_URL =
  import.meta.env.VITE_TONCONNECT_MANIFEST_URL ||
  'https://ton-miniapp-bolivia-one.vercel.app/tonconnect-manifest.json';

// Root element
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

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
