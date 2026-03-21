/// <reference path="../phantom-browser-sdk.d.ts" />
import React from 'react';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { SignClient } from '@walletconnect/sign-client';
import type { SessionTypes } from '@walletconnect/types';

// Phantom Browser SDK - used for injected + deeplink (mobile) flows
// Types may vary by SDK version; see @phantom/browser-sdk docs
import { BrowserSDK, AddressType } from '@phantom/browser-sdk';

// WalletConnect Project ID
const WALLETCONNECT_PROJECT_ID = 'c3b0e9fbee1b5d626cbba381b2f3f560';

// Solana RPC endpoints - using Helius as primary and Alchemy as fallback
const HELIUS_API_KEY = import.meta.env.VITE_HELIUS_API_KEY || '22e64403-eb95-4b21-bedc-5d0f360e9037';
const ALCHEMY_RPC_URL = import.meta.env.VITE_ALCHEMY_SOLANA_RPC || 'https://solana-mainnet.g.alchemy.com/v2/Br9B6PkCm4u7NhukuwdGihx6SZnhrLWI';
const SOLANA_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const SOLANA_RPC_FALLBACKS = [
  ALCHEMY_RPC_URL,
  'https://api.mainnet-beta.solana.com',
];

const SOLANA_CAIP2_CHAIN_ID = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
const TOKEN_MINT_ADDRESS = 'V8tLkyqHdtzzYCGdsVf5CZ55BsLuvu7F4TchiDhJgem';

/** LocalStorage key for connection source (phantom-injected | phantom-deeplink | walletconnect) */
const STORAGE_KEY_CONNECTION_SOURCE = 'solana_connection_source';

/** Only log Phantom appId warning once per session */
let phantomAppIdWarned = false;
/** Only log Phantom appId value once per session (for verification) */
let phantomAppIdLogged = false;

/** Browser-safe Uint8Array to base64 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  const CHUNK = 8192;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const sub = bytes.subarray(i, Math.min(i + CHUNK, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(sub));
  }
  return btoa(binary);
}

// --- Platform & provider detection (used for connection strategy) ---

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPhone|iPad|iPod|Android/i.test(ua);
}

/** Phantom in-app browser: mobile UA + injected Phantom provider present */
function isInPhantomInAppBrowser(): boolean {
  return isMobileDevice() && hasInjectedPhantom();
}

function hasInjectedPhantom(): boolean {
  if (typeof window === 'undefined') return false;
  const provider = (window as any).phantom?.solana || (window as any).solana;
  return !!provider?.isPhantom;
}

interface SolanaWalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  uri?: string;
}

/** Connection source: which path was used to connect (for sign/send and restore) */
type ConnectionSource = 'phantom-injected' | 'phantom-deeplink' | 'walletconnect' | null;

class SolanaWalletManager {
  private state: SolanaWalletState = {
    address: null,
    isConnected: false,
    isConnecting: false,
    error: null,
  };

  private listeners: Set<(state: SolanaWalletState) => void> = new Set();
  private connection: Connection | null = null;
  private signClient: Awaited<ReturnType<typeof SignClient.init>> | null = null;
  private session: SessionTypes.Struct | null = null;

  /** Phantom Browser SDK instance (lazy-inited for deeplink + optional injected) */
  private phantomSdk: InstanceType<typeof BrowserSDK> | null = null;

  /** Which path connected the wallet; used for signAndSendTransaction and checkExistingConnection */
  private connectionSource: ConnectionSource = null;

  constructor() {
    this.connection = new Connection(SOLANA_RPC_URL, 'confirmed');
    this.initializeSignClient();
  }

  /** Get or create Phantom Browser SDK. appId from env; required for deeplink. */
  private getPhantomSdk(): InstanceType<typeof BrowserSDK> | null {
    if (typeof window === 'undefined') return null;
    if (this.phantomSdk) return this.phantomSdk;
    const appId = import.meta.env.VITE_PHANTOM_APP_ID as string | undefined;
    if (!appId?.trim()) {
      if (import.meta.env.DEV && !phantomAppIdWarned) {
        phantomAppIdWarned = true;
        console.warn('[SolanaWallet] VITE_PHANTOM_APP_ID not set; Phantom deeplink (mobile) will not be available.');
      }
      return null;
    }
    if (!phantomAppIdLogged) {
      phantomAppIdLogged = true;
    }
    try {
      this.phantomSdk = new BrowserSDK({
        appId,
        providers: ['injected', 'deeplink'],
        addressTypes: [AddressType.solana],
      });
      return this.phantomSdk;
    } catch (e) {
      console.warn('[SolanaWallet] Failed to create Phantom Browser SDK:', e);
      return null;
    }
  }

  /** Extract Solana address from Phantom SDK connect() result. addresses is array of { address, type? }. */
  private static extractSolanaAddressFromPhantomAddresses(addresses: unknown): string | null {
    if (!addresses || !Array.isArray(addresses)) return null;
    const item = addresses.find((a: any) => a?.type === 'solana' || !a?.type) ?? addresses[0];
    const addr = item?.address ?? item;
    return typeof addr === 'string' ? addr : null;
  }

  private async initializeSignClient() {
    try {
      this.signClient = await SignClient.init({
        projectId: WALLETCONNECT_PROJECT_ID,
        metadata: {
          name: 'Univoice',
          description: 'Univoice Application',
          url: typeof window !== 'undefined' ? window.location.origin : '',
          icons: [typeof window !== 'undefined' ? `${window.location.origin}/favicon.ico` : ''],
        },
      });

      this.signClient.on('session_event', (args: any) => {
        console.log('Session event:', args);
      });

      this.signClient.on('session_update', (args: any) => {
        const { topic, params } = args;
        const { namespaces } = params;
        const solanaNamespace = namespaces?.solana;
        if (solanaNamespace?.accounts?.[0]) {
          const account = solanaNamespace.accounts[0];
          const parts = account.split(':');
          const address = parts.length >= 3 ? parts[2] : account;
          this.updateState({ address, isConnected: true, isConnecting: false });
          localStorage.setItem('solana_wallet_address', address);
        }
      });

      this.signClient.on('session_delete', () => {
        this.updateState({ address: null, isConnected: false, isConnecting: false });
        localStorage.removeItem('solana_wallet_address');
        localStorage.removeItem(STORAGE_KEY_CONNECTION_SOURCE);
        this.session = null;
        this.connectionSource = null;
      });

      const sessions = this.signClient.session.getAll();
      if (sessions.length > 0) {
        this.session = sessions[0];
        const solanaNamespace = this.session.namespaces.solana;
        if (solanaNamespace?.accounts?.[0]) {
          const account = solanaNamespace.accounts[0];
          const parts = account.split(':');
          const address = parts.length >= 3 ? parts[2] : account;
          this.connectionSource = 'walletconnect';
          this.updateState({ address, isConnected: true });
        }
      }
    } catch (error) {
      console.error('Failed to initialize SignClient:', error);
    }
  }

  subscribe(listener: (state: SolanaWalletState) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(listener => listener(this.state));
  }

  private updateState(updates: Partial<SolanaWalletState>) {
    this.state = { ...this.state, ...updates };
    this.notify();
  }

  private isPhantomInstalled(): boolean {
    return hasInjectedPhantom();
  }

  private getPhantomProvider() {
    if (typeof window === 'undefined') return null;
    if ((window as any).phantom?.solana?.isPhantom) return (window as any).phantom.solana;
    if ((window as any).solana?.isPhantom) return (window as any).solana;
    return null;
  }

  /** Connect via Phantom injected provider (extension or Phantom in-app browser). Reuses legacy provider flow. */
  private async connectPhantomInjected(): Promise<string | null> {
    if (!this.isPhantomInstalled()) return null;

    const provider = this.getPhantomProvider();
    if (!provider) return null;

    if (provider.isConnected && provider.publicKey) {
      const address = provider.publicKey.toString();
      this.connectionSource = 'phantom-injected';
      this.updateState({ address, isConnected: true, isConnecting: false, error: null });
      localStorage.setItem('solana_wallet_address', address);
      localStorage.setItem(STORAGE_KEY_CONNECTION_SOURCE, 'phantom-injected');
      return address;
    }

    const isLocked = provider._isLocked ?? provider.isLocked;
    if (isLocked) {
      throw new Error('Phantom wallet is locked. Please unlock it from the browser toolbar.');
    }

    const connectionPromise = new Promise<string>((resolve, reject) => {
      let resolved = false;
      let checkInterval: ReturnType<typeof setInterval> | null = null;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      const cleanup = () => {
        if (checkInterval) clearInterval(checkInterval);
        if (timeoutId) clearTimeout(timeoutId);
      };
      const markResolved = (address: string) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        resolve(address);
      };
      const markRejected = (err: Error) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        reject(err);
      };

      const connectResult = typeof provider.connect === 'function'
        ? provider.connect()
        : typeof provider.request === 'function'
          ? provider.request({ method: 'connect' })
          : null;

      if (connectResult && typeof connectResult.then === 'function') {
        connectResult
          .then((response: any) => {
            if (response?.publicKey) markResolved(response.publicKey.toString());
            else if (provider.isConnected && provider.publicKey) markResolved(provider.publicKey.toString());
          })
          .catch((e: any) => markRejected(e));
      }

      const onConnect = () => {
        if (!resolved && provider.publicKey) markResolved(provider.publicKey.toString());
      };
      provider.on?.('connect', onConnect);

      checkInterval = setInterval(() => {
        if (resolved) return;
        if (provider.isConnected && provider.publicKey) {
          provider.removeListener?.('connect', onConnect);
          markResolved(provider.publicKey.toString());
        }
      }, 500);

      timeoutId = setTimeout(() => {
        if (!resolved) {
          provider.removeListener?.('connect', onConnect);
          markRejected(new Error('Phantom connection timeout. Please unlock the extension and approve the connection.'));
        }
      }, 30000);
    });

    const address = await connectionPromise;
    this.connectionSource = 'phantom-injected';
    this.updateState({ address, isConnected: true, isConnecting: false, error: null });
    localStorage.setItem('solana_wallet_address', address);
    localStorage.setItem(STORAGE_KEY_CONNECTION_SOURCE, 'phantom-injected');
    return address;
  }

  /** Connect via Phantom deeplink (mobile browser -> Phantom app). Uses Phantom Browser SDK. */
  private async connectPhantomDeeplink(): Promise<string | null> {
    const sdk = this.getPhantomSdk();
    if (!sdk) {
      throw new Error('Phantom app is not configured. Please set VITE_PHANTOM_APP_ID for mobile deeplink.');
    }
    const { addresses } = await sdk.connect({ provider: 'deeplink' });
    const address = SolanaWalletManager.extractSolanaAddressFromPhantomAddresses(addresses);
    if (!address) {
      throw new Error('Phantom deeplink did not return a Solana address.');
    }
    this.connectionSource = 'phantom-deeplink';
    this.updateState({
      address,
      isConnected: true,
      isConnecting: false,
      error: null,
    });
    localStorage.setItem('solana_wallet_address', address);
    localStorage.setItem(STORAGE_KEY_CONNECTION_SOURCE, 'phantom-deeplink');
    return address;
  }

  /**
   * WalletConnect fallback: current SignClient-based flow.
   * TODO: Replace with WalletConnect modal / AppKit for better UX (QR + universal link).
   */
  private async connectWalletConnect(): Promise<string | null> {
    if (!this.signClient) {
      await this.initializeSignClient();
      if (!this.signClient) {
        this.updateState({ isConnecting: false, error: 'Failed to initialize WalletConnect client' });
        return null;
      }
    }

    if (this.session?.namespaces?.solana?.accounts?.[0]) {
      const account = this.session.namespaces.solana.accounts[0];
      const address = account.split(':').length >= 3 ? account.split(':')[2] : account;
      this.connectionSource = 'walletconnect';
      this.updateState({ address, isConnected: true, isConnecting: false, error: null });
      localStorage.setItem('solana_wallet_address', address);
      localStorage.setItem(STORAGE_KEY_CONNECTION_SOURCE, 'walletconnect');
      return address;
    }

    const { uri, approval } = await this.signClient.connect({
      requiredNamespaces: {
        solana: {
          chains: [SOLANA_CAIP2_CHAIN_ID],
          methods: [
            'solana_getAccounts',
            'solana_requestAccounts',
            'solana_signTransaction',
            'solana_signMessage',
            'solana_signAllTransactions',
            'solana_signAndSendTransaction',
          ],
          events: [],
        },
      },
    });

    if (!uri) {
      throw new Error('WalletConnect did not return a pairing URI. Please try again.');
    }

    this.updateState({ uri });

    const session = await new Promise<SessionTypes.Struct>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Connection timeout. Please scan the QR code within 2 minutes.')), 120000);
      approval()
        .then((s) => { clearTimeout(timer); resolve(s); })
        .catch((e) => { clearTimeout(timer); reject(e); });
    });

    this.session = session;
    const solanaNamespace = session.namespaces.solana;
    if (!solanaNamespace?.accounts?.length) throw new Error('No Solana account in session.');
    const account = solanaNamespace.accounts[0];
    const address = account.split(':').length >= 3 ? account.split(':')[2] : account;

    this.connectionSource = 'walletconnect';
    this.updateState({ address, isConnected: true, isConnecting: false, error: null, uri: undefined });
    localStorage.setItem('solana_wallet_address', address);
    localStorage.setItem(STORAGE_KEY_CONNECTION_SOURCE, 'walletconnect');
    return address;
  }

  async connect(): Promise<string | null> {
    if (this.state.isConnecting) return null;
    this.updateState({ isConnecting: true, error: null, uri: undefined });

    try {
      const mobile = isMobileDevice();
      const inPhantomBrowser = isInPhantomInAppBrowser();
      const hasInjected = hasInjectedPhantom();

      // Desktop: Phantom injected only, then WalletConnect
      if (!mobile) {
        if (hasInjected) {
          const address = await this.connectPhantomInjected();
          this.updateState({ isConnecting: false });
          return address;
        }
        const address = await this.connectWalletConnect();
        this.updateState({ isConnecting: false });
        return address;
      }

      // Mobile: in-app -> injected; else deeplink first, then WalletConnect fallback
      if (inPhantomBrowser && hasInjected) {
        const address = await this.connectPhantomInjected();
        this.updateState({ isConnecting: false });
        return address;
      }

      try {
        const address = await this.connectPhantomDeeplink();
        this.updateState({ isConnecting: false });
        return address;
      } catch (deeplinkError: any) {
        const msg = deeplinkError?.message ?? '';
        const userReject = msg.includes('reject') || msg.includes('cancel') || deeplinkError?.code === 4001;
        if (userReject) {
          this.updateState({ isConnecting: false, error: null });
          return null;
        }
        console.warn('[SolanaWallet] Phantom deeplink failed, falling back to WalletConnect:', deeplinkError);
      }

      const address = await this.connectWalletConnect();
      this.updateState({ isConnecting: false });
      return address;
    } catch (error: any) {
      const message = error?.message || 'Failed to connect wallet';
      const userReject = error?.code === 4001 ||
        /user rejected|user cancelled/i.test(message);
      if (userReject) {
        this.updateState({ isConnecting: false, error: null, uri: undefined });
        return null;
      }
      this.updateState({
        isConnecting: false,
        error: message.includes('timeout') ? 'Connection timeout. Please try again.' : message,
        uri: undefined,
      });
      return null;
    }
  }

  async disconnect() {
    try {
      if (this.signClient && this.session) {
        await this.signClient.disconnect({
          topic: this.session.topic,
          reason: { code: 6000, message: 'User disconnected' },
        });
      }
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
    if (this.connectionSource === 'phantom-deeplink' && this.phantomSdk) {
      try {
        if (typeof (this.phantomSdk as any).disconnect === 'function') {
          (this.phantomSdk as any).disconnect();
        }
      } catch (_) {}
    }
    this.connectionSource = null;
    this.session = null;
    this.updateState({ address: null, isConnected: false, error: null, uri: undefined });
    localStorage.removeItem('solana_wallet_address');
    localStorage.removeItem(STORAGE_KEY_CONNECTION_SOURCE);
  }

  async signAndSendTransaction(transaction: Transaction): Promise<string> {
    if (this.connectionSource === 'phantom-deeplink' && this.phantomSdk) {
      const result = await this.phantomSdk.solana.signAndSendTransaction(transaction);
      const sig = (result as any)?.signature ?? result;
      if (typeof sig === 'string') return sig;
      if (sig && typeof sig === 'object' && 'signature' in sig) return (sig as { signature: string }).signature;
      throw new Error('No transaction signature from Phantom.');
    }

    const provider = this.getPhantomProvider();
    if (provider?.isConnected && provider.publicKey) {
      let result: any;
      if (typeof (provider as any).signAndSendTransaction === 'function') {
        result = await (provider as any).signAndSendTransaction(transaction, { preflightCommitment: 'confirmed', skipPreflight: false });
      } else {
        const serialized = transaction.serialize({ requireAllSignatures: false, verifySignatures: false });
        result = await (provider as any).request({ method: 'signAndSendTransaction', params: { message: uint8ArrayToBase64(serialized), options: { preflightCommitment: 'confirmed' } } });
      }
      const sig = result?.signature ?? result;
      if (typeof sig === 'string') return sig;
      if (sig && typeof sig === 'object' && 'signature' in sig) return (sig as { signature: string }).signature;
      throw new Error('No transaction signature returned');
    }

    if (this.signClient && this.session) {
      const serialized = transaction.serialize({ requireAllSignatures: false, verifySignatures: false });
      const base64 = uint8ArrayToBase64(serialized);
      const result = await this.signClient.request({
        topic: this.session.topic,
        chainId: SOLANA_CAIP2_CHAIN_ID,
        request: { method: 'solana_signAndSendTransaction', params: { transaction: base64 } },
      });
      const sig = result as string | { signature: string } | undefined;
      if (typeof sig === 'string') return sig;
      if (sig && typeof sig === 'object' && 'signature' in sig) return (sig as { signature: string }).signature;
      throw new Error('No transaction signature returned');
    }

    throw new Error('Wallet not connected. Connect Phantom or WalletConnect first.');
  }

  async getTokenBalance(address?: string): Promise<{
    balance: number;
    decimals: number;
    symbol?: string;
    name?: string;
  } | null> {
    const walletAddress = address || this.state.address;
    if (!walletAddress) return null;

    let connection = this.connection;
    const provider = this.getPhantomProvider();
    if (provider?.isConnected && (provider as any).rpcEndpoint) {
      try {
        connection = new Connection((provider as any).rpcEndpoint, 'confirmed');
      } catch (_) {}
    }
    if (!connection) connection = new Connection(SOLANA_RPC_URL, 'confirmed');

    try {
      const publicKey = new PublicKey(walletAddress);
      const mintPublicKey = new PublicKey(TOKEN_MINT_ADDRESS);
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, { mint: mintPublicKey });
      if (tokenAccounts.value.length === 0) {
        return { balance: 0, decimals: 9 };
      }
      const parsedInfo = tokenAccounts.value[0].account.data.parsed.info;
      const balance = parsedInfo.tokenAmount.uiAmount || 0;
      const decimals = parsedInfo.tokenAmount.decimals;
      let symbol: string | undefined;
      let name: string | undefined;
      try {
        const metadata = await connection.getParsedAccountInfo(mintPublicKey);
        const parsed = (metadata.value?.data as any)?.parsed?.info;
        if (parsed) { symbol = parsed.symbol; name = parsed.name; }
      } catch (_) {}
      return { balance, decimals, symbol, name };
    } catch (error: any) {
      if (error?.message?.includes('403') || error?.message?.includes('Forbidden')) {
        for (const fallbackUrl of SOLANA_RPC_FALLBACKS) {
          try {
            const fallbackConnection = new Connection(fallbackUrl, 'confirmed');
            const tokenAccounts = await fallbackConnection.getParsedTokenAccountsByOwner(new PublicKey(walletAddress), { mint: new PublicKey(TOKEN_MINT_ADDRESS) });
            if (tokenAccounts.value.length === 0) return { balance: 0, decimals: 9 };
            const parsedInfo = tokenAccounts.value[0].account.data.parsed.info;
            return { balance: parsedInfo.tokenAmount.uiAmount || 0, decimals: parsedInfo.tokenAmount.decimals };
          } catch (_) { continue; }
        }
      }
      return null;
    }
  }

  setManualAddress(address: string) {
    this.connectionSource = null;
    this.updateState({ address, isConnected: true, isConnecting: false, error: null, uri: undefined });
    localStorage.setItem('solana_wallet_address', address);
    localStorage.removeItem(STORAGE_KEY_CONNECTION_SOURCE);
  }

  /**
   * Apply Phantom redirect callback params (e.g. from /wallet-callback?public_key=...).
   * Call this when user returns from Phantom app via redirect_link.
   */
  applyPhantomRedirect(publicKey: string) {
    if (!publicKey?.trim()) return;
    this.connectionSource = 'phantom-deeplink';
    this.updateState({
      address: publicKey.trim(),
      isConnected: true,
      isConnecting: false,
      error: null,
      uri: undefined,
    });
    localStorage.setItem('solana_wallet_address', publicKey.trim());
    localStorage.setItem(STORAGE_KEY_CONNECTION_SOURCE, 'phantom-deeplink');
  }

  getState(): SolanaWalletState {
    return { ...this.state };
  }

  /**
   * Restore connection from: Phantom injected, Phantom SDK (deeplink session), or WalletConnect session.
   * Safe to call on mount; reconciles localStorage with live provider/session.
   */
  checkExistingConnection() {
    if (typeof window === 'undefined') return;
    const storedAddress = localStorage.getItem('solana_wallet_address');
    const storedSource = localStorage.getItem(STORAGE_KEY_CONNECTION_SOURCE) as ConnectionSource | null;

    const provider = this.getPhantomProvider();
    if (provider?.isConnected && provider.publicKey) {
      const address = provider.publicKey.toString();
      if (!storedAddress || address === storedAddress) {
        this.connectionSource = 'phantom-injected';
        this.updateState({ address, isConnected: true });
        localStorage.setItem('solana_wallet_address', address);
        localStorage.setItem(STORAGE_KEY_CONNECTION_SOURCE, 'phantom-injected');
        return;
      }
    }

    const sdk = this.getPhantomSdk();
    if (sdk && typeof (sdk as any).isConnected === 'function' && (sdk as any).isConnected()) {
      const tryRestoreDeeplink = (addrs: unknown) => {
        const address = SolanaWalletManager.extractSolanaAddressFromPhantomAddresses(addrs);
        if (address && (!storedAddress || address === storedAddress)) {
          this.connectionSource = 'phantom-deeplink';
          this.phantomSdk = sdk;
          this.updateState({ address, isConnected: true });
          localStorage.setItem('solana_wallet_address', address);
          localStorage.setItem(STORAGE_KEY_CONNECTION_SOURCE, 'phantom-deeplink');
        }
      };
      try {
        const addrs = (sdk as any).getAddresses?.() ?? (sdk as any).addresses;
        if (addrs && typeof (addrs as Promise<unknown>)?.then === 'function') {
          (addrs as Promise<unknown>).then(tryRestoreDeeplink).catch(() => {});
        } else {
          tryRestoreDeeplink(addrs);
        }
      } catch (_) {}
    }

    if (this.signClient) {
      const sessions = this.signClient.session.getAll();
      if (sessions.length > 0) {
        const session = sessions[0];
        const account = session.namespaces?.solana?.accounts?.[0];
        if (account) {
          const address = account.split(':').length >= 3 ? account.split(':')[2] : account;
          if (!storedAddress || address === storedAddress) {
            this.session = session;
            this.connectionSource = 'walletconnect';
            this.updateState({ address, isConnected: true });
            localStorage.setItem('solana_wallet_address', address);
            localStorage.setItem(STORAGE_KEY_CONNECTION_SOURCE, 'walletconnect');
            return;
          }
        }
      }
    }

    if (storedAddress && !this.state.isConnected) {
      localStorage.removeItem('solana_wallet_address');
      localStorage.removeItem(STORAGE_KEY_CONNECTION_SOURCE);
    }
  }
}

export const solanaWalletManager = new SolanaWalletManager();

export const useSolanaWallet = () => {
  const [state, setState] = React.useState<SolanaWalletState>(solanaWalletManager.getState());

  React.useEffect(() => {
    solanaWalletManager.checkExistingConnection();
    setState(solanaWalletManager.getState());
    const unsubscribe = solanaWalletManager.subscribe(setState);
    return () => { unsubscribe(); };
  }, []);

  return {
    ...state,
    connect: () => solanaWalletManager.connect(),
    disconnect: () => solanaWalletManager.disconnect(),
    getTokenBalance: (address?: string) => solanaWalletManager.getTokenBalance(address),
    setManualAddress: (address: string) => solanaWalletManager.setManualAddress(address),
    signAndSendTransaction: (tx: Transaction) => solanaWalletManager.signAndSendTransaction(tx),
  };
};
