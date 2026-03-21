/**
 * Stored in sessionStorage after email login; used to build Basic + X-ICP-Principal-Id for chat-api / chat-sse.
 * If missing (e.g. Google/wallet-only session), human chat falls back to the canister (legacy behavior).
 */
const STORAGE_KEY = 'alaya_icp_chat_credentials';

export interface IcpChatCredentials {
  username: string;
  password: string;
}

export function saveIcpChatCredentials(c: IcpChatCredentials): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(c));
}

export function clearIcpChatCredentials(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function getIcpChatCredentials(): IcpChatCredentials | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as unknown;
    if (
      o &&
      typeof o === 'object' &&
      'username' in o &&
      'password' in o &&
      typeof (o as IcpChatCredentials).username === 'string' &&
      typeof (o as IcpChatCredentials).password === 'string'
    ) {
      return o as IcpChatCredentials;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function utf8ToBase64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin);
}

/** Returns null when there is no credential; callers should fall back or prompt for email login. */
export function buildChatAuthHeaders(principalId: string): Record<string, string> | null {
  const c = getIcpChatCredentials();
  if (!c) return null;
  const token = utf8ToBase64(`${c.username}:${c.password}`);
  return {
    Authorization: `Basic ${token}`,
    'X-ICP-Principal-Id': principalId,
  };
}
