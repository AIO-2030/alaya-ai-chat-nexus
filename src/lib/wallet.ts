import i18n from '../i18n';

type Plug = {
  isConnected: () => Promise<boolean>;
  requestConnect: (opts: { whitelist?: string[]; host?: string; timeout?: number }) => Promise<boolean>;
  createAgent: (opts: { whitelist?: string[]; host?: string }) => Promise<void>;
  agent?: { getPrincipal?: () => Promise<any> };
  getPrincipal?: () => Promise<any>;
};

export const getPlug = (): Plug | undefined => {
  const plug = (window as any).ic?.plug as Plug | undefined;
  return plug;
};

export const getPlugEnv = () => {
  const host =
    (import.meta as any).env?.VITE_IC_HOST ||
    (window.location.port === '4943' ? 'http://127.0.0.1:4943' : 'https://ic0.app');
  const whitelist: string[] = (import.meta as any).env?.VITE_PLUG_WHITELIST
    ? (import.meta as any).env.VITE_PLUG_WHITELIST.split(',').map((s: string) => s.trim()).filter(Boolean)
    : [];
  return { host, whitelist } as const;
};

export const connectPlugAndGetPrincipal = async (options?: { redirectIfMissing?: boolean }): Promise<string> => {
  const plug = getPlug();
  if (!plug) {
    if (options?.redirectIfMissing) {
      window.location.href = 'https://plugwallet.ooo/';
    }
    throw new Error(i18n.t('common.plugNotDetected'));
  }

  const { host, whitelist } = getPlugEnv();

  const connected = await plug.isConnected();
  if (!connected) {
    const ok = await plug.requestConnect({ whitelist, host, timeout: 60_000 });
    if (!ok) {
      throw new Error(i18n.t('common.plugConnectionCancelled'));
    }
  }

  await plug.createAgent({ whitelist, host });

  let principalText: string | null = null;
  if (plug.agent?.getPrincipal) {
    const p = await plug.agent.getPrincipal();
    principalText = typeof (p as any)?.toText === 'function' ? (p as any).toText() : String(p);
  } else if (plug.getPrincipal) {
    const p = await plug.getPrincipal();
    principalText = typeof (p as any)?.toText === 'function' ? (p as any).toText() : String(p);
  }

  if (!principalText) {
    throw new Error(i18n.t('common.plugPrincipalFailed'));
  }

  return principalText;
};

