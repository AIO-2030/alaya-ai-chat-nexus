import React from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { SignClient } from '@walletconnect/sign-client';
import type { SessionTypes } from '@walletconnect/types';

// WalletConnect Project ID
const WALLETCONNECT_PROJECT_ID = 'c3b0e9fbee1b5d626cbba381b2f3f560';

// Solana RPC endpoints - using Helius as primary and Alchemy as fallback
// API keys are stored in environment variables for security
const HELIUS_API_KEY = import.meta.env.VITE_HELIUS_API_KEY || '22e64403-eb95-4b21-bedc-5d0f360e9037';
const ALCHEMY_RPC_URL = import.meta.env.VITE_ALCHEMY_SOLANA_RPC || 'https://solana-mainnet.g.alchemy.com/v2/Br9B6PkCm4u7NhukuwdGihx6SZnhrLWI';

// Primary RPC: Helius (high performance)
const SOLANA_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

// Fallback RPC endpoints (in order of preference)
const SOLANA_RPC_FALLBACKS = [
  ALCHEMY_RPC_URL, // Alchemy RPC (reliable fallback)
  'https://api.mainnet-beta.solana.com', // Solana official RPC (last resort, may have rate limits)
];

// WalletConnect (CAIP-2) chain id for Solana mainnet (genesis hash truncated)
const SOLANA_CAIP2_CHAIN_ID = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

// Token contract address
const TOKEN_MINT_ADDRESS = 'V8tLkyqHdtzzYCGdsVf5CZ55BsLuvu7F4TchiDhJgem';

interface SolanaWalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  uri?: string; // WalletConnect URI for QR code
}

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

  constructor() {
    this.connection = new Connection(SOLANA_RPC_URL, 'confirmed');
    this.initializeSignClient();
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

      // Listen to session events
      this.signClient.on('session_event', (args: any) => {
        console.log('Session event:', args);
      });

      this.signClient.on('session_update', (args: any) => {
        const { topic, params } = args;
        console.log('[SolanaWallet] Session update event:', topic, params);
        const { namespaces } = params;
        const solanaNamespace = namespaces.solana;
        if (solanaNamespace?.accounts) {
          const account = solanaNamespace.accounts[0];
          const parts = account.split(':');
          const address = parts.length >= 3 ? parts[2] : account; // Extract address from "solana:mainnet:address"
          console.log('[SolanaWallet] Session updated, address:', address);
          this.updateState({
            address,
            isConnected: true,
            isConnecting: false, // Ensure connecting state is cleared
          });
          localStorage.setItem('solana_wallet_address', address);
        }
      });

      this.signClient.on('session_delete', () => {
        console.log('[SolanaWallet] Session deleted event');
        this.updateState({
          address: null,
          isConnected: false,
          isConnecting: false, // Ensure connecting state is cleared
        });
        localStorage.removeItem('solana_wallet_address');
        this.session = null;
      });

      // Check for existing session
      if (this.signClient) {
        const sessions = this.signClient.session.getAll();
        if (sessions.length > 0) {
          this.session = sessions[0];
          const solanaNamespace = this.session.namespaces.solana;
          if (solanaNamespace?.accounts) {
            const account = solanaNamespace.accounts[0];
            const parts = account.split(':');
            const address = parts.length >= 3 ? parts[2] : account;
            this.updateState({
              address,
              isConnected: true,
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to initialize SignClient:', error);
    }
  }

  subscribe(listener: (state: SolanaWalletState) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(listener => listener(this.state));
  }

  private updateState(updates: Partial<SolanaWalletState>) {
    this.state = { ...this.state, ...updates };
    this.notify();
  }

  // Check if Phantom browser extension is installed
  private isPhantomInstalled(): boolean {
    if (typeof window === 'undefined') return false;
    // Check for window.phantom.solana first (recommended by Phantom docs)
    // Then fallback to window.solana for legacy support
    const provider = (window as any).phantom?.solana || (window as any).solana;
    return !!provider?.isPhantom;
  }

  // Get Phantom provider following official docs
  private getPhantomProvider() {
    if (typeof window === 'undefined') return null;
    
    // Official recommendation: check window.phantom.solana first
    if ('phantom' in window) {
      const phantomWindow = window as any;
      const provider = phantomWindow.phantom?.solana;
      
      if (provider?.isPhantom) {
        return provider;
      }
    }
    
    // Fallback to window.solana for legacy integrations
    const solanaWindow = window as any;
    if (solanaWindow.solana?.isPhantom) {
      return solanaWindow.solana;
    }
    
    return null;
  }

  // Connect using Phantom browser extension (PC)
  private async connectPhantomExtension(): Promise<string | null> {
    console.log('[SolanaWallet] connectPhantomExtension() called');
    
    if (!this.isPhantomInstalled()) {
      console.log('[SolanaWallet] Phantom extension not installed');
      return null;
    }

    try {
      // Get provider using official method
      const provider = this.getPhantomProvider();
      
      if (!provider) {
        console.log('[SolanaWallet] Phantom provider not found');
        return null;
      }
      
      console.log('[SolanaWallet] Phantom provider found, checking connection status...');
      
      // Check if already connected
      if (provider.isConnected && provider.publicKey) {
        const address = provider.publicKey.toString();
        console.log('[SolanaWallet] Phantom already connected:', address);
        this.updateState({
          address,
          isConnected: true,
          isConnecting: false,
          error: null,
        });
        localStorage.setItem('solana_wallet_address', address);
        return address;
      }

      console.log('[SolanaWallet] Requesting Phantom connection...');
      
      // Check if Phantom is locked
      const isLocked = provider._isLocked || provider.isLocked;
      console.log('[SolanaWallet] Phantom provider details:', {
        isPhantom: provider.isPhantom,
        isConnected: provider.isConnected,
        publicKey: provider.publicKey?.toString(),
        isLocked: isLocked,
        // Check if provider has connect method
        hasConnect: typeof provider.connect === 'function',
        hasRequest: typeof provider.request === 'function',
        hasDisconnect: typeof provider.disconnect === 'function',
        // Check provider methods
        methods: Object.keys(provider).filter(key => typeof provider[key] === 'function'),
        // Check if we're in a user gesture context
        hasUserGesture: typeof (navigator as any).userActivation !== 'undefined' 
          ? (navigator as any).userActivation?.isActive 
          : 'unknown',
      });
      
      // If Phantom is locked, throw a helpful error immediately
      if (isLocked) {
        throw new Error('Phantom wallet is locked. Please unlock Phantom extension first by clicking its icon in the browser toolbar.');
      }
      
      // Check if provider is ready
      if (!provider.isPhantom) {
        throw new Error('Provider is not Phantom wallet');
      }
      
      // CRITICAL: Phantom requires user gesture to show popup
      // Check if we have user activation
      if (typeof (navigator as any).userActivation !== 'undefined') {
        const isActive = (navigator as any).userActivation?.isActive;
        if (!isActive) {
          console.warn('[SolanaWallet] WARNING: No active user gesture detected. Phantom popup may not appear!');
          console.warn('[SolanaWallet] Connection should be initiated directly from a user click event.');
        } else {
          console.log('[SolanaWallet] User gesture detected, proceeding with connection...');
        }
      }
      
      // Add a helpful message for users
      console.log('[SolanaWallet] 💡 TIP: If no popup appears:');
      console.log('[SolanaWallet] 1. Click the Phantom extension icon in your browser toolbar');
      console.log('[SolanaWallet] 2. Make sure Phantom is unlocked (not asking for password)');
      console.log('[SolanaWallet] 3. Try clicking "Connect" button in this app again');
      
      // Connect to Phantom with timeout
      console.log('[SolanaWallet] Calling provider.connect() - single interactive attempt...');
      
      try {
        // Direct interactive connect (single attempt only)
        // 只允许 provider.connect()（无参数）或 provider.request({ method: 'connect' }) 作为 fallback
        // 避免 Phantom 某些版本对带参数 connect 产生 pending request
        let connectResult: any;
        try {
          console.log('[SolanaWallet] Calling provider.connect() without parameters...');
          connectResult = provider.connect();
        } catch (e: any) {
          console.log('[SolanaWallet] connect() failed, trying provider.request() method:', e);
          if (typeof provider.request === 'function') {
            console.log('[SolanaWallet] Using provider.request() method as fallback...');
            connectResult = provider.request({ method: 'connect' });
          } else {
            throw new Error('No connect method available on provider');
          }
        }
        
        console.log('[SolanaWallet] provider.connect() returned:', {
          type: typeof connectResult,
          isPromise: connectResult && typeof connectResult.then === 'function',
          isNull: connectResult === null,
          isUndefined: connectResult === undefined,
          value: connectResult,
        });
        
        // Create a unified promise that handles both the connect() promise and event
        const connectionPromise = new Promise<string>((resolve, reject) => {
          let resolved = false;
          let checkInterval: ReturnType<typeof setInterval> | null = null;
          let timeoutId: ReturnType<typeof setTimeout> | null = null;
          
          const cleanup = () => {
            if (checkInterval) {
              clearInterval(checkInterval);
              checkInterval = null;
            }
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }
          };
          
          const markResolved = (address: string) => {
            if (resolved) return;
            resolved = true;
            cleanup();
            resolve(address);
          };
          
          const markRejected = (error: Error) => {
            if (resolved) return;
            resolved = true;
            cleanup();
            reject(error);
          };
          
          // Handle the connect() promise if it exists
          if (connectResult && typeof connectResult.then === 'function') {
            console.log('[SolanaWallet] connect() returned a Promise, waiting for it...');
            
            // Add a warning timeout to detect if promise never resolves
            const promiseWarningTimeout = setTimeout(() => {
              if (!resolved) {
                console.warn('[SolanaWallet] Connect promise has not resolved after 25 seconds, will rely on events and state check');
                console.warn('[SolanaWallet] This may indicate that Phantom extension is not responding or user has not approved the connection');
              }
            }, 25000);
            
            connectResult
              .then((response: any) => {
                clearTimeout(promiseWarningTimeout);
                console.log('[SolanaWallet] Connect promise resolved:', response);
                if (resolved) return;
                
                // Check response or provider state
                if (response && response.publicKey) {
                  console.log('[SolanaWallet] Got publicKey from promise response');
                  markResolved(response.publicKey.toString());
                } else if (provider.isConnected && provider.publicKey) {
                  console.log('[SolanaWallet] Got publicKey from provider state after promise');
                  markResolved(provider.publicKey.toString());
                } else {
                  console.log('[SolanaWallet] Promise resolved but no publicKey yet, waiting for state update...');
                  // Wait a moment for state to update
                  setTimeout(() => {
                    if (!resolved) {
                      if (provider.isConnected && provider.publicKey) {
                        console.log('[SolanaWallet] Got publicKey after waiting');
                        markResolved(provider.publicKey.toString());
                      } else {
                        console.warn('[SolanaWallet] Still no publicKey after waiting, will rely on events and state check');
                        // Don't reject here, let events or state check handle it
                        // The promise resolved but didn't provide a key, which is unusual but not necessarily an error
                      }
                    }
                  }, 1000);
                }
              })
              .catch((error: any) => {
                clearTimeout(promiseWarningTimeout);
                console.error('[SolanaWallet] Connect promise rejected:', error);
                if (!resolved) {
                  markRejected(error);
                }
              });
          } else if (connectResult === null || connectResult === undefined) {
            console.log('[SolanaWallet] connect() returned null/undefined, will rely on state check and events');
          } else {
            console.log('[SolanaWallet] connect() did not return a Promise, will rely on state check and events');
          }
          
          // Set up event listener to handle connection
          const eventConnectHandler = () => {
            const pk = provider.publicKey;
            console.log('[SolanaWallet] Connect event fired (reading provider.publicKey):', pk?.toString());
            if (!resolved && pk) {
              markResolved(pk.toString());
            }
          };
          provider.on('connect', eventConnectHandler);
          
          // Also check provider state periodically as fallback
          console.log('[SolanaWallet] Starting periodic state check (every 500ms)...');
          let checkCount = 0;
          checkInterval = setInterval(() => {
            if (resolved) {
              clearInterval(checkInterval!);
              return;
            }
            
            checkCount++;
            const isConnected = provider.isConnected;
            const publicKey = provider.publicKey;
            
            if (checkCount % 10 === 0) {
              // Log every 5 seconds
              console.log('[SolanaWallet] State check #' + checkCount + ':', {
                isConnected,
                publicKey: publicKey?.toString(),
                resolved,
              });
            }
            
            if (isConnected && publicKey) {
              console.log('[SolanaWallet] Connection detected via state check!');
              markResolved(publicKey.toString());
              provider.removeListener('connect', eventConnectHandler);
            }
          }, 500);
          
          // Cleanup on timeout
          timeoutId = setTimeout(() => {
            if (!resolved) {
              console.error('[SolanaWallet] Connection timeout after 30 seconds');
              provider.removeListener('connect', eventConnectHandler);
              markRejected(new Error('Phantom connection timeout. Please open the Phantom extension (top-right) and approve the pending connection request (unlock Phantom if needed). If nothing is pending, disconnect this site in Phantom → Settings → Connected Apps, then retry.'));
            }
          }, 30000);
        });

        console.log('[SolanaWallet] Waiting for Phantom connection response (30s timeout)...');
        console.log('[SolanaWallet] Promise.race started, waiting for either connection or timeout...');
        
        const address = await connectionPromise;
        
        console.log('[SolanaWallet] Phantom connection successful:', address);
        
        // Event listener cleanup is handled in the promise cleanup
        
        this.updateState({
          address,
          isConnected: true,
          isConnecting: false,
          error: null,
        });

        localStorage.setItem('solana_wallet_address', address);
        return address;
        
      } catch (error: any) {
        // Event listener cleanup is handled in the promise cleanup
        throw error;
      }
      
    } catch (error: any) {
      console.error('[SolanaWallet] Failed to connect Phantom extension:', error);
      console.error('[SolanaWallet] Phantom error details:', {
        message: error.message,
        code: error.code,
        name: error.name,
      });
      
      // If user rejected, don't throw error
      if (error.code === 4001 || 
          error.message?.includes('User rejected') || 
          error.message?.includes('User cancelled') ||
          error.message?.toLowerCase().includes('user rejected')) {
        console.log('[SolanaWallet] User rejected Phantom connection');
        this.updateState({
          isConnecting: false,
          error: null,
        });
        return null;
      }
      
      // For timeout errors, 保留错误状态让 UI 显示，不要清 error
      if (error.message?.includes('timeout') || error.message?.includes('blocked')) {
        console.log('[SolanaWallet] Phantom connection timeout or blocked');
        console.log('[SolanaWallet] 💡 This usually means:');
        console.log('[SolanaWallet] 1. Phantom extension is locked - unlock it by clicking the extension icon');
        console.log('[SolanaWallet] 2. Phantom needs to be activated - click the Phantom icon in browser toolbar');
        console.log('[SolanaWallet] 3. Try disabling and re-enabling the Phantom extension');
        // 保留错误信息，不要清 error
        this.updateState({
          isConnecting: false,
          error: error.message || 'Phantom connection timeout. Please open the Phantom extension (top-right) and approve the pending connection request (unlock Phantom if needed). If nothing is pending, disconnect this site in Phantom → Settings → Connected Apps, then retry.',
        });
        return null;
      }
      
      // For other errors, throw to be handled by caller
      console.error('[SolanaWallet] Phantom connection error, will throw:', error);
      throw error;
    }
  }

  async connect(): Promise<string | null> {
    console.log('[SolanaWallet] connect() called, current state:', {
      isConnecting: this.state.isConnecting,
      isConnected: this.state.isConnected,
      address: this.state.address,
    });

    if (this.state.isConnecting) {
      console.warn('[SolanaWallet] Already connecting, ignoring duplicate call');
      return null;
    }

    this.updateState({ isConnecting: true, error: null, uri: undefined });
    console.log('[SolanaWallet] Set isConnecting = true');

    try {
      // Hard constraint: PC端强制只走 Phantom 插件，不走 WalletConnect
      const hasInjectedPhantom = typeof window !== 'undefined' &&
        !!((window as any).phantom?.solana?.isPhantom || (window as any).solana?.isPhantom);
      
      console.log('[SolanaWallet] Injected Phantom check:', { hasInjectedPhantom });
      
      if (hasInjectedPhantom) {
        console.log('[SolanaWallet] PC端检测到 Phantom 插件，强制只使用 Phantom，不走 WalletConnect');
        const address = await this.connectPhantomExtension();
        // 不要清 error，保留错误状态让 UI 显示
        this.updateState({ isConnecting: false });
        return address; // address 可能为 null
      }

      // Strategy 2: Use WalletConnect (only when Phantom not present - Mobile端)
      console.log('[SolanaWallet] Using WalletConnect strategy (Phantom not detected - Mobile端)');
      
      if (!this.signClient) {
        console.log('[SolanaWallet] SignClient not initialized, initializing...');
        await this.initializeSignClient();
        if (!this.signClient) {
          console.error('[SolanaWallet] Failed to initialize SignClient');
          this.updateState({
            isConnecting: false,
            error: 'Failed to initialize WalletConnect client',
          });
          return null;
        }
        console.log('[SolanaWallet] SignClient initialized successfully');
      }

      // Check if already connected via WalletConnect
      if (this.session) {
        console.log('[SolanaWallet] Existing session found:', this.session.topic);
        const solanaNamespace = this.session.namespaces.solana;
        if (solanaNamespace?.accounts) {
          const account = solanaNamespace.accounts[0];
          const parts = account.split(':');
          const address = parts.length >= 3 ? parts[2] : account;
          console.log('[SolanaWallet] Already connected via WalletConnect:', address);
          this.updateState({
            address,
            isConnected: true,
            isConnecting: false,
            error: null,
          });
          localStorage.setItem('solana_wallet_address', address);
          return address;
        }
      }

      // Request connection - 使用 requiredNamespaces 提升移动端批准率
      console.log('[SolanaWallet] Requesting WalletConnect connection...');
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
        console.error('[SolanaWallet] WalletConnect did not return a pairing URI');
        throw new Error('WalletConnect did not return a pairing URI. Make sure a compatible wallet is installed and try again.');
      }

      console.log('[SolanaWallet] WalletConnect URI generated:', uri.substring(0, 50) + '...');
      
      // Store URI for QR code display
      this.updateState({ uri });
      console.log('[SolanaWallet] URI stored in state, waiting for user approval...');

      // Wait for user approval with timeout (120 seconds for QR code scanning)
      const session = await new Promise<SessionTypes.Struct>((resolve, reject) => {
        const setT = typeof window !== 'undefined' ? window.setTimeout : setTimeout;
        const clearT = typeof window !== 'undefined' ? window.clearTimeout : clearTimeout;

        console.log('[SolanaWallet] Setting up approval promise with 120s timeout');
        
        const timer = setT(() => {
          console.error('[SolanaWallet] Connection timeout after 120 seconds');
          reject(new Error('Connection timeout. Please scan the QR code within 2 minutes.'));
        }, 120000);

        approval()
          .then((s) => {
            console.log('[SolanaWallet] User approved connection, session received:', s.topic);
            clearT(timer);
            resolve(s);
          })
          .catch((e) => {
            console.error('[SolanaWallet] Approval promise rejected:', e);
            clearT(timer);
            reject(e);
          });
      });
      
      console.log('[SolanaWallet] Session approved, processing...');
      this.session = session;

      // Extract address from session
      const solanaNamespace = session.namespaces.solana;
      if (!solanaNamespace?.accounts || solanaNamespace.accounts.length === 0) {
        throw new Error('No Solana account found in session');
      }

      const account = solanaNamespace.accounts[0];
      const parts = account.split(':');
      const address = parts.length >= 3 ? parts[2] : account; // Extract from "solana:mainnet:address"

      console.log('[SolanaWallet] Extracted address from session:', address);

      this.updateState({
        address,
        isConnected: true,
        isConnecting: false,
        error: null,
        uri: undefined,
      });

      localStorage.setItem('solana_wallet_address', address);
      console.log('[SolanaWallet] Connection successful, address saved:', address);
      return address;
    } catch (error: any) {
      console.error('[SolanaWallet] Failed to connect Solana wallet:', error);
      console.error('[SolanaWallet] Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });
      
      // Handle different error cases
      let errorMessage = error.message || 'Failed to connect wallet';
      
      // If user rejected the connection, clear error state
      if (error.code === 4001 || 
          errorMessage.includes('User rejected') || 
          errorMessage.includes('User cancelled') ||
          errorMessage.toLowerCase().includes('user rejected')) {
        this.updateState({
          isConnecting: false,
          error: null,
          uri: undefined,
        });
        return null;
      }
      
      // For timeout errors
      if (errorMessage.includes('timeout')) {
        errorMessage = 'Connection timeout. Please try again.';
      }
      
      this.updateState({
        isConnecting: false,
        error: errorMessage,
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
          reason: {
            code: 6000,
            message: 'User disconnected',
          },
        });
      }
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }

    this.updateState({
      address: null,
      isConnected: false,
      error: null,
      uri: undefined,
    });

    this.session = null;
    localStorage.removeItem('solana_wallet_address');
  }

  async getTokenBalance(address?: string): Promise<{
    balance: number;
    decimals: number;
    symbol?: string;
    name?: string;
  } | null> {
    const walletAddress = address || this.state.address;
    if (!walletAddress) {
      return null;
    }

    // Try to use Phantom provider's RPC if available (more reliable)
    const provider = this.getPhantomProvider();
    let connection = this.connection;
    
    // If Phantom is connected, try using its RPC endpoint
    if (provider && provider.isConnected) {
      try {
        // Phantom provider may have its own RPC endpoint
        const phantomRpcUrl = (provider as any).rpcEndpoint || SOLANA_RPC_URL;
        connection = new Connection(phantomRpcUrl, 'confirmed');
        console.log('[SolanaWallet] Using Phantom provider RPC:', phantomRpcUrl);
      } catch (e) {
        console.warn('[SolanaWallet] Failed to use Phantom RPC, using default');
      }
    }
    
    // Fallback to default connection if not set
    if (!connection) {
      connection = new Connection(SOLANA_RPC_URL, 'confirmed');
    }

    try {
      const publicKey = new PublicKey(walletAddress);
      const mintPublicKey = new PublicKey(TOKEN_MINT_ADDRESS);

      // Get token accounts for the wallet
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        { mint: mintPublicKey }
      );

      if (tokenAccounts.value.length === 0) {
        return {
          balance: 0,
          decimals: 9, // Default Solana token decimals
        };
      }

      const tokenAccount = tokenAccounts.value[0];
      const parsedInfo = tokenAccount.account.data.parsed.info;
      const balance = parsedInfo.tokenAmount.uiAmount || 0;
      const decimals = parsedInfo.tokenAmount.decimals;

      // Try to get token metadata
      let symbol: string | undefined;
      let name: string | undefined;

      try {
        const metadata = await connection.getParsedAccountInfo(mintPublicKey);
        if (metadata.value?.data && typeof metadata.value.data === 'object' && 'parsed' in metadata.value.data) {
          const parsed = (metadata.value.data as any).parsed;
          if (parsed?.info) {
            symbol = parsed.info.symbol;
            name = parsed.info.name;
          }
        }
      } catch (e) {
        // Metadata fetch failed, use defaults
        console.warn('Failed to fetch token metadata:', e);
      }

      return {
        balance,
        decimals,
        symbol,
        name,
      };
    } catch (error: any) {
      console.error('Error fetching token balance:', error);
      
      // If 403 Forbidden, try fallback RPCs in sequence
      if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
        console.log('[SolanaWallet] RPC returned 403, trying fallback RPCs...');
        
        const publicKey = new PublicKey(walletAddress);
        const mintPublicKey = new PublicKey(TOKEN_MINT_ADDRESS);
        
        // Try each fallback RPC in sequence
        for (const fallbackUrl of SOLANA_RPC_FALLBACKS) {
          try {
            console.log(`[SolanaWallet] Trying fallback RPC: ${fallbackUrl}`);
            const fallbackConnection = new Connection(fallbackUrl, 'confirmed');
            
            const tokenAccounts = await fallbackConnection.getParsedTokenAccountsByOwner(
              publicKey,
              { mint: mintPublicKey }
            );
            
            if (tokenAccounts.value.length === 0) {
              return {
                balance: 0,
                decimals: 9,
              };
            }
            
            const tokenAccount = tokenAccounts.value[0];
            const parsedInfo = tokenAccount.account.data.parsed.info;
            const balance = parsedInfo.tokenAmount.uiAmount || 0;
            const decimals = parsedInfo.tokenAmount.decimals;
            
            console.log(`[SolanaWallet] Successfully fetched balance using fallback RPC: ${fallbackUrl}`);
            return {
              balance,
              decimals,
            };
          } catch (fallbackError: any) {
            console.warn(`[SolanaWallet] Fallback RPC ${fallbackUrl} failed:`, fallbackError.message);
            // Continue to next fallback
            continue;
          }
        }
        
        console.error('[SolanaWallet] All RPC endpoints failed (403 Forbidden). Consider using a paid RPC service with API key.');
        return null;
      }
      
      return null;
    }
  }

  getState(): SolanaWalletState {
    return { ...this.state };
  }

  // Check if wallet is already connected (from localStorage)
  checkExistingConnection() {
    if (typeof window === 'undefined') return;

    const storedAddress = localStorage.getItem('solana_wallet_address');
    
    // Check Phantom extension first using official method
    const provider = this.getPhantomProvider();
    if (provider && provider.isConnected) {
      const publicKey = provider.publicKey;
      if (publicKey) {
        const address = publicKey.toString();
        if (address === storedAddress || !storedAddress) {
          this.updateState({
            address,
            isConnected: true,
          });
          localStorage.setItem('solana_wallet_address', address);
          return;
        }
      }
    }
    
    // Check WalletConnect session
    if (storedAddress && this.session) {
      const solanaNamespace = this.session.namespaces.solana;
      if (solanaNamespace?.accounts) {
        const account = solanaNamespace.accounts[0];
        const parts = account.split(':');
        const address = parts.length >= 3 ? parts[2] : account;
        if (address === storedAddress) {
          this.updateState({
            address: storedAddress,
            isConnected: true,
          });
        } else {
          localStorage.removeItem('solana_wallet_address');
        }
      }
    } else if (storedAddress && !this.session) {
      // Stored address but no session, clear it
      localStorage.removeItem('solana_wallet_address');
    }
  }
}

// Singleton instance
export const solanaWalletManager = new SolanaWalletManager();

// React hook for using Solana wallet
export const useSolanaWallet = () => {
  const [state, setState] = React.useState<SolanaWalletState>(
    solanaWalletManager.getState()
  );

  React.useEffect(() => {
    // Check for existing connection on mount
    solanaWalletManager.checkExistingConnection();
    setState(solanaWalletManager.getState());

    const unsubscribe = solanaWalletManager.subscribe((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, []);

  return {
    ...state,
    connect: () => solanaWalletManager.connect(),
    disconnect: () => solanaWalletManager.disconnect(),
    getTokenBalance: (address?: string) => solanaWalletManager.getTokenBalance(address),
  };
};
