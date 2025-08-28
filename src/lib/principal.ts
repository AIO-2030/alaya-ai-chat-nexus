import { connectPlugAndGetPrincipal } from './wallet';

let cachedPrincipal: string | null = null;

export const getPrincipalId = (): string | null => {
  if (cachedPrincipal) return cachedPrincipal;
  try {
    const saved = sessionStorage.getItem('plug_principal_id');
    if (saved) {
      cachedPrincipal = saved;
      return cachedPrincipal;
    }
  } catch {
    // ignore storage errors
  }
  return null;
};

export const setPrincipalId = (principal: string): void => {
  cachedPrincipal = principal;
  try {
    sessionStorage.setItem('plug_principal_id', principal);
  } catch {
    // ignore storage errors
  }
};

export const clearPrincipalId = (): void => {
  cachedPrincipal = null;
  try {
    sessionStorage.removeItem('plug_principal_id');
  } catch {
    // ignore storage errors
  }
};

export const ensurePrincipalId = async (opts?: { autoConnect?: boolean; redirectIfMissing?: boolean }): Promise<string> => {
  const existing = getPrincipalId();
  if (existing) return existing;
  if (!opts?.autoConnect) {
    throw new Error('Principal is missing');
  }
  const principal = await connectPlugAndGetPrincipal({ redirectIfMissing: opts?.redirectIfMissing });
  setPrincipalId(principal);
  return principal;
};

