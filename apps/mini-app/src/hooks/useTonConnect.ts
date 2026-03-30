import { useTonConnectUI, useTonAddress, useTonWallet } from '@tonconnect/ui-react';
import { useCallback } from 'react';

interface UseTonConnectReturn {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  address: string | null;
  friendlyAddress: string | null;

  // Wallet info
  walletName: string | null;
  walletImage: string | null;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export function useTonConnect(): UseTonConnectReturn {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const address = useTonAddress(false);
  const friendlyAddress = useTonAddress(true);

  const isConnected = !!wallet;
  const isConnecting = !tonConnectUI.connectionRestored;

  const walletName = wallet?.device?.appName ?? null;
  // Get wallet image from wallet info if available
  const walletImage = (wallet as { imageUrl?: string } | null)?.imageUrl ?? null;

  const connect = useCallback(async () => {
    try {
      await tonConnectUI.openModal();
    } catch (error) {
      console.error('Failed to open wallet modal:', error);
    }
  }, [tonConnectUI]);

  const disconnect = useCallback(async () => {
    try {
      await tonConnectUI.disconnect();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  }, [tonConnectUI]);

  return {
    isConnected,
    isConnecting,
    address: address || null,
    friendlyAddress: friendlyAddress || null,
    walletName,
    walletImage,
    connect,
    disconnect,
  };
}
