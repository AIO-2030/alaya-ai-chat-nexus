import { AuthClient } from '@dfinity/auth-client';
import i18n from '../i18n';

let singletonClient: AuthClient | null = null;

export const getAuthClient = async (): Promise<AuthClient> => {
  if (singletonClient) return singletonClient;
  singletonClient = await AuthClient.create();
  return singletonClient;
};

export const getIIUrl = (): string => {
  const fromEnv = (import.meta as any).env?.VITE_II_URL as string | undefined;
  return fromEnv && fromEnv.length > 0 ? fromEnv : 'https://identity.ic0.app';
};

export const ensureIILogin = async (): Promise<boolean> => {
  const client = await getAuthClient();
  const authed = await client.isAuthenticated();
  if (authed) return true;
  return new Promise<boolean>((resolve) => {
    client.login({
      identityProvider: getIIUrl(),
      onSuccess: () => resolve(true),
      onError: () => resolve(false),
    });
  });
};

export const getPrincipalFromII = async (): Promise<string> => {
  const ok = await ensureIILogin();
  if (!ok) {
    throw new Error(i18n.t('common.iiAuthFailed'));
  }
  const client = await getAuthClient();
  const identity = client.getIdentity();
  const text = identity.getPrincipal().toText();
  if (!text) {
    throw new Error(i18n.t('common.iiPrincipalFailed'));
  }
  return text;
};

export const logoutII = async (): Promise<void> => {
  const client = await getAuthClient();
  await client.logout();
};

