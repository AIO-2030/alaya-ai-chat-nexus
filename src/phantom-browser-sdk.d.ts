/**
 * Minimal type declarations for @phantom/browser-sdk.
 * If the package ships its own types, they may take precedence.
 */
declare module '@phantom/browser-sdk' {
  export enum AddressType {
    solana = 'solana',
    ethereum = 'ethereum',
  }

  export interface PhantomAddressItem {
    address: string;
    type?: string;
  }

  export interface BrowserSDKConfig {
    appId: string;
    providers: Array<'injected' | 'deeplink' | 'google' | 'apple' | 'phantom' | 'jwt'>;
    addressTypes: AddressType[];
    authOptions?: { authUrl?: string; redirectUrl?: string };
    autoConnect?: boolean;
  }

  export interface ConnectResult {
    addresses: PhantomAddressItem[];
  }

  export class BrowserSDK {
    constructor(config: BrowserSDKConfig);
    connect(options: { provider: string; jwtToken?: string }): Promise<ConnectResult>;
    isPhantomInstalled?(): Promise<boolean>;
    isConnected?(): boolean;
    getAddresses?(): PhantomAddressItem[] | Promise<PhantomAddressItem[]>;
    disconnect?(): void;
    solana: {
      signMessage(message: string): Promise<unknown>;
      signTransaction(transaction: unknown): Promise<unknown>;
      signAndSendTransaction(transaction: unknown): Promise<{ signature?: string } | string>;
      getPublicKey?(): Promise<unknown>;
      isConnected?: boolean;
    };
  }
}
