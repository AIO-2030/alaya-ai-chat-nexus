export type LoginMethod = 'wallet' | 'google' | 'ii';
export type LoginStatus = 'authenticated' | 'unauthenticated';

export interface UserInfo {
  userId: string;
  principalId: string;
  // Keep legacy compatibility for components using `name`
  name?: string;
  nickname: string;
  loginMethod: LoginMethod;
  loginStatus: LoginStatus;
  email?: string;
  picture?: string;
  walletAddress?: string;
}

