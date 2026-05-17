import { buildChatAuthHeaders, getIcpChatCredentials } from '@/lib/icpChatCredentials';
import type { ChatMessageInfo, GifInfo } from './chatApi';

const API_BASE =
  (import.meta.env.VITE_UNIVOICE_CHAT_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://localhost:3000';
const MEMORY_CORE_BASE =
  (import.meta.env.VITE_MEMORY_RELATIONSHIP_CORE_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  '';

const CHAT_API_LOG = '[chat-api]';

function pathForLog(fullUrl: string): string {
  try {
    const u = new URL(fullUrl);
    return u.pathname + u.search;
  } catch {
    return fullUrl;
  }
}

function principalPreview(principalId: string): string {
  if (principalId.length <= 16) return principalId;
  return `${principalId.slice(0, 12)}…`;
}

/** Logs each chat-api HTTP call (no secrets / no body). */
async function chatApiFetch(
  url: string,
  init: RequestInit | undefined,
  principalId: string
): Promise<Response> {
  const method = (init?.method || 'GET').toUpperCase();
  const path = pathForLog(url);
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  console.log(`${CHAT_API_LOG} ${method} ${path}`, { principal: principalPreview(principalId) });
  try {
    const res = await fetch(url, init);
    const ms = Math.round(
      (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0
    );
    if (res.ok) {
      console.log(`${CHAT_API_LOG} ${method} ${path} -> ${res.status} ${ms}ms`);
    } else {
      console.warn(`${CHAT_API_LOG} ${method} ${path} -> ${res.status} ${ms}ms`);
    }
    return res;
  } catch (e) {
    const ms = Math.round(
      (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0
    );
    console.error(`${CHAT_API_LOG} ${method} ${path} network error ${ms}ms`, e);
    throw e;
  }
}

function authHeaders(principalId: string): Record<string, string> {
  const h = buildChatAuthHeaders(principalId);
  if (!h) {
    throw new Error('Missing ICP chat credentials. Please sign in with email/password.');
  }
  return { ...h, 'Content-Type': 'application/json' };
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('Invalid JSON from chat-api');
  }
}

function pick<T>(obj: Record<string, unknown>, ...keys: string[]): T | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null) return v as T;
  }
  return undefined;
}

export interface DmSessionSummary {
  sessionId: string;
  peerUserUid: string;
  /** Peer display name from chat-api (if provided). */
  peerDisplayName?: string;
  peerNickname?: string;
  peerUsername?: string;
  unreadCount?: number;
  updatedAt?: string;
}

/** Optional fields for POST /dm (Create DM). Extend as chat-api DTO evolves. */
export interface CreateDmOptions {
  /** Nickname shown for the peer (e.g. from add-contact form). */
  peerNickname?: string;
  /** Current user display name from auth context (recommended for server-side labeling). */
  userNickname?: string;
}

export interface MessageItem {
  id: string;
  sessionId?: string;
  senderId?: string;
  senderUserUid: string;
  clientMsgId?: string;
  messageType: string;
  contentJson: { text?: string; [key: string]: unknown };
  createdAt: string;
}

function normalizeDmRow(raw: Record<string, unknown>): DmSessionSummary {
  const sessionId = pick<string>(raw, 'sessionId', 'session_id') ?? '';
  const peerUserUid =
    pick<string>(raw, 'peerUserUid', 'peer_user_uid', 'peerUserId', 'peer_user_id') ?? '';
  const peerDisplayName = pick<string>(
    raw,
    'peerDisplayName',
    'peer_display_name',
    'peerName',
    'peer_name'
  )?.trim();
  const peerNickname = pick<string>(raw, 'peerNickname', 'peer_nickname', 'peerNick', 'peer_nick')?.trim();
  const peerUsername = pick<string>(raw, 'peerUsername', 'peer_username', 'peerUserName')?.trim();
  const unreadCount = pick<number>(raw, 'unreadCount', 'unread_count');
  const updatedAt = pick<string>(raw, 'updatedAt', 'updated_at');
  return {
    sessionId,
    peerUserUid,
    peerDisplayName,
    peerNickname,
    peerUsername,
    unreadCount,
    updatedAt,
  };
}

/** Prefer API-provided peer label; otherwise shorten principal id for UI (never show full uid as title). */
export function peerSessionDisplayName(s: DmSessionSummary): string {
  const fromApi = (s.peerDisplayName || s.peerNickname || s.peerUsername || '').trim();
  if (fromApi) return fromApi;
  return shortenPrincipalForUi(s.peerUserUid);
}

function shortenPrincipalForUi(uid: string): string {
  if (!uid) return '—';
  const head = uid.split('-')[0] || uid;
  if (head.length >= 3) return `${head.slice(0, 3)}…`;
  return uid.length > 14 ? `${uid.slice(0, 10)}…` : uid;
}

export function avatarInitialsFromDisplay(display: string): string {
  const alnum = display.replace(/[^a-zA-Z0-9]/g, '');
  if (alnum.length >= 2) return alnum.slice(0, 2).toUpperCase();
  const t = display.trim();
  if (t.length >= 2) return t.slice(0, 2).toUpperCase();
  return t.slice(0, 1).toUpperCase() || '?';
}

function normalizeMessage(raw: Record<string, unknown>): MessageItem {
  const id = String(pick<string>(raw, 'id') ?? '');
  const sessionId = pick<string>(raw, 'sessionId', 'session_id');
  const senderId = pick<string>(raw, 'senderId', 'sender_id');
  const senderUserUid = pick<string>(raw, 'senderUserUid', 'sender_user_uid') ?? '';
  const messageType = pick<string>(raw, 'messageType', 'message_type') ?? 'text';
  const contentJson =
    (pick<Record<string, unknown>>(raw, 'contentJson', 'content_json', 'content') as {
      text?: string;
    }) ?? {};
  const createdAt = pick<string>(raw, 'createdAt', 'created_at') ?? new Date().toISOString();
  const clientMsgId = pick<string>(raw, 'clientMsgId', 'client_msg_id');
  return { id, sessionId, senderId, senderUserUid, clientMsgId, messageType, contentJson, createdAt };
}

export interface ListMessagesResult {
  items: MessageItem[];
  nextCursor: string | null;
}

export async function listDmSessions(principalId: string): Promise<DmSessionSummary[]> {
  const res = await chatApiFetch(`${API_BASE}/dm`, { headers: authHeaders(principalId) }, principalId);
  const data = await parseJson<unknown>(res);
  if (Array.isArray(data)) {
    return (data as Record<string, unknown>[]).map((r) => normalizeDmRow(r));
  }
  const list = pick<unknown[]>(data as Record<string, unknown>, 'sessions', 'items', 'data');
  if (Array.isArray(list)) {
    return (list as Record<string, unknown>[]).map((r) => normalizeDmRow(r));
  }
  return [];
}

export async function createOrGetDmSession(
  principalId: string,
  peerUserUid: string,
  options?: CreateDmOptions
): Promise<DmSessionSummary> {
  /** Matches chat-api `CreateDmBodyDto.peerUserId` (peer principal / userUid). */
  const body: Record<string, unknown> = { peerUserId: peerUserUid };
  const peerNick = options?.peerNickname?.trim();
  if (peerNick) {
    body.peerNickname = peerNick;
  }
  const userNick = options?.userNickname?.trim();
  if (userNick) {
    body.userNickname = userNick;
  }
  const res = await chatApiFetch(
    `${API_BASE}/dm`,
    {
      method: 'POST',
      headers: authHeaders(principalId),
      body: JSON.stringify(body),
    },
    principalId
  );
  const raw = await parseJson<Record<string, unknown>>(res);
  return normalizeDmRow(raw);
}

export async function listMessages(
  principalId: string,
  sessionId: string,
  cursor?: string,
  limit?: number
): Promise<ListMessagesResult> {
  const q = new URLSearchParams();
  if (cursor) q.set('cursor', cursor);
  if (limit != null) q.set('limit', String(limit));
  const qs = q.toString();
  const url = `${API_BASE}/dm/${encodeURIComponent(sessionId)}/messages${qs ? `?${qs}` : ''}`;
  const res = await chatApiFetch(url, { headers: authHeaders(principalId) }, principalId);
  const data = await parseJson<unknown>(res);
  let rows: Record<string, unknown>[];
  let nextCursor: string | null = null;
  if (Array.isArray(data)) {
    rows = data as Record<string, unknown>[];
  } else {
    const obj = data as Record<string, unknown>;
    const list = pick<unknown[]>(obj, 'messages', 'items', 'data');
    rows = Array.isArray(list) ? (list as Record<string, unknown>[]) : [];
    const nc = pick<string | null>(obj, 'nextCursor', 'next_cursor');
    nextCursor = nc === undefined || nc === null ? null : String(nc);
  }
  return {
    items: rows.map((r) => normalizeMessage(r)),
    nextCursor,
  };
}

export interface PresignUploadResult {
  uploadUrl: string;
  objectKey: string;
  publicUrl: string;
}

/** Presigned PUT + public read URL (after upload) for S3/MinIO attachments. */
export async function presignUpload(
  principalId: string,
  fileName: string,
  contentType: string
): Promise<PresignUploadResult> {
  const res = await chatApiFetch(
    `${API_BASE}/attachments/presign`,
    {
      method: 'POST',
      headers: authHeaders(principalId),
      body: JSON.stringify({ fileName, contentType }),
    },
    principalId
  );
  const raw = await parseJson<Record<string, unknown>>(res);
  return {
    uploadUrl: String(raw.uploadUrl ?? raw.upload_url ?? ''),
    objectKey: String(raw.objectKey ?? raw.object_key ?? ''),
    publicUrl: String(raw.publicUrl ?? raw.public_url ?? ''),
  };
}

export async function putToPresignedUrl(
  uploadUrl: string,
  blob: Blob,
  contentType: string
): Promise<void> {
  const r = await fetch(uploadUrl, {
    method: 'PUT',
    body: blob,
    headers: { 'Content-Type': contentType },
  });
  if (!r.ok) {
    throw new Error(`Attachment upload failed: HTTP ${r.status}`);
  }
}

async function blobFromGifSource(gif: GifInfo): Promise<{ blob: Blob; contentType: string }> {
  const u = gif.gifUrl;
  if (!u) throw new Error('GIF has no image URL');
  const res = await fetch(u);
  if (!res.ok) throw new Error(`Failed to read GIF: HTTP ${res.status}`);
  const blob = await res.blob();
  return { blob, contentType: blob.type || 'image/gif' };
}

/** Drop huge pixel payloads so Prisma JSON stays reasonable. */
function capGifContentForDb(content: Record<string, unknown>): Record<string, unknown> {
  if (JSON.stringify(content).length <= 450_000) return content;
  const { pixels, palette, ...rest } = content;
  return { ...rest };
}

/** Upload GIF bytes to chat-api S3, then POST /messages with type `gif`. */
export async function sendGifMessageDm(
  principalId: string,
  sessionId: string,
  clientMsgId: string,
  gif: GifInfo
): Promise<ChatMessageInfo> {
  const { blob, contentType } = await blobFromGifSource(gif);
  const mime = contentType || 'image/gif';
  const ext = mime.includes('webp')
    ? 'webp'
    : mime.includes('png')
      ? 'png'
      : mime.includes('jpeg')
        ? 'jpg'
        : 'gif';
  const main = await presignUpload(principalId, `chat.${ext}`, mime);
  await putToPresignedUrl(main.uploadUrl, blob, mime);

  let thumbUrl = main.publicUrl;
  if (gif.thumbnailUrl && gif.thumbnailUrl !== gif.gifUrl) {
    try {
      const tr = await fetch(gif.thumbnailUrl);
      if (tr.ok) {
        const tb = await tr.blob();
        const tm = tb.type || 'image/png';
        const e2 = tm.includes('png') ? 'png' : tm.includes('webp') ? 'webp' : 'jpg';
        const thumb = await presignUpload(principalId, `thumb.${e2}`, tm);
        await putToPresignedUrl(thumb.uploadUrl, tb, tm);
        thumbUrl = thumb.publicUrl;
      }
    } catch {
      thumbUrl = main.publicUrl;
    }
  }

  const content: Record<string, unknown> = {
    text: '',
    gif_url: main.publicUrl,
    thumbnail_url: thumbUrl,
    title: gif.title,
    duration: gif.duration,
    width: gif.width,
    height: gif.height,
    source_type: gif.sourceType || 'gif',
    source_id: gif.sourceId,
  };
  if (gif.palette?.length) content.palette = gif.palette;
  if (gif.pixels?.length) content.pixels = gif.pixels;

  return postDmMessage(principalId, sessionId, clientMsgId, 'gif', capGifContentForDb(content));
}

async function postDmMessage(
  principalId: string,
  sessionId: string,
  clientMsgId: string,
  messageType: string,
  content: Record<string, unknown>
): Promise<ChatMessageInfo> {
  const body = { sessionId, clientMsgId, messageType, content };
  const res = await chatApiFetch(
    `${API_BASE}/messages`,
    {
      method: 'POST',
      headers: authHeaders(principalId),
      body: JSON.stringify(body),
    },
    principalId
  );
  const raw = await parseJson<Record<string, unknown>>(res);
  return messageItemToChatMessageInfo(normalizeMessage(raw));
}

export async function sendTextMessage(
  principalId: string,
  sessionId: string,
  clientMsgId: string,
  text: string
): Promise<void> {
  await postDmMessage(principalId, sessionId, clientMsgId, 'text', { text });
}

export interface MemoryContextSummary {
  entityId: string;
  memories: Array<{ id: string; summary: string; memoryType: string }>;
  relationships: Array<{
    id: string;
    relationshipType: string;
    targetEntityId: string;
    confidence: number;
    strength: number;
  }>;
}

/** Weak dependency: returns null when memory-core is unavailable or disabled. */
export async function getMemoryContextWeak(
  entityId: string,
  options?: { peerEntityId?: string; queryText?: string; timeoutMs?: number }
): Promise<MemoryContextSummary | null> {
  if (!MEMORY_CORE_BASE || !entityId) {
    return null;
  }
  const q = new URLSearchParams();
  if (options?.peerEntityId) q.set('peer_entity_id', options.peerEntityId);
  if (options?.queryText) q.set('query_text', options.queryText);
  const qs = q.toString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options?.timeoutMs ?? 1500);
  try {
    const res = await fetch(
      `${MEMORY_CORE_BASE}/v1/context/${encodeURIComponent(entityId)}${qs ? `?${qs}` : ''}`,
      {
        method: 'GET',
        signal: controller.signal,
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    const memoriesRaw = Array.isArray(data.memories) ? (data.memories as Record<string, unknown>[]) : [];
    const relationshipsRaw = Array.isArray(data.relationships)
      ? (data.relationships as Record<string, unknown>[])
      : [];
    return {
      entityId,
      memories: memoriesRaw.map((item) => ({
        id: String(item.id ?? ''),
        summary: String(item.summary ?? item.content ?? ''),
        memoryType: String(item.memory_type ?? item.memoryType ?? ''),
      })),
      relationships: relationshipsRaw.map((item) => ({
        id: String(item.id ?? ''),
        relationshipType: String(item.relationship_type ?? item.relationshipType ?? ''),
        targetEntityId: String(item.target_entity_id ?? item.targetEntityId ?? ''),
        confidence: Number(item.confidence ?? 0),
        strength: Number(item.strength ?? 0),
      })),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function markRead(
  principalId: string,
  sessionId: string,
  lastReadMessageId: string
): Promise<void> {
  const body = { sessionId, lastReadMessageId };
  const res = await chatApiFetch(
    `${API_BASE}/read`,
    {
      method: 'POST',
      headers: authHeaders(principalId),
      body: JSON.stringify(body),
    },
    principalId
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `HTTP ${res.status}`);
  }
}

function parseGifInfoFromContentJson(c: Record<string, unknown>): GifInfo | undefined {
  const gifUrl =
    (c.gif_url as string | undefined) ||
    (c.gifUrl as string | undefined) ||
    (c.chat_format as string | undefined) ||
    (c.chatFormat as string | undefined);
  if (!gifUrl) return undefined;
  return {
    gifUrl,
    thumbnailUrl:
      (c.thumbnail_url as string | undefined) ||
      (c.thumbnailUrl as string | undefined) ||
      gifUrl,
    title: (c.title as string | undefined) || (c.source_type as string | undefined) || 'GIF',
    duration: Number(c.duration) || 100,
    width: Number(c.width) || 0,
    height: Number(c.height) || 0,
    sourceType: (c.source_type as string | undefined) || (c.sourceType as string | undefined) || 'gif',
    sourceId: (c.source_id as string | undefined) || (c.sourceId as string | undefined),
    palette: Array.isArray(c.palette) ? (c.palette as string[]) : undefined,
    pixels: Array.isArray(c.pixels) ? (c.pixels as number[][]) : undefined,
  };
}

export function messageItemToChatMessageInfo(m: MessageItem): ChatMessageInfo {
  const ts = Date.parse(m.createdAt);
  const sendBy = m.senderUserUid || m.senderId || '';
  const t = (m.messageType || '').toLowerCase();
  const cj = (m.contentJson || {}) as Record<string, unknown>;

  if (t === 'gif' || t === 'image' || t === 'pixel_art' || t === 'pixelart' || t === 'emoji') {
    const gifInfo = parseGifInfoFromContentJson(cj);
    if (gifInfo) {
      return {
        sendBy,
        content: JSON.stringify(cj),
        mode: 'Gif',
        timestamp: Number.isFinite(ts) ? ts : Date.now(),
        gifInfo,
        serverMessageId: m.id,
        clientMsgId: m.clientMsgId,
      };
    }
  }

  const text = (cj.text as string | undefined) ?? '';
  return {
    sendBy,
    content: text,
    mode: 'Text',
    timestamp: Number.isFinite(ts) ? ts : Date.now(),
    serverMessageId: m.id,
    clientMsgId: m.clientMsgId,
  };
}

export function hasUnivoiceChatAuth(): boolean {
  return !!getIcpChatCredentials();
}

/** GET /device-pairings/check — 无需 ICP；用于查询某设备是否已与另一设备建立亲密配对 */
export type DevicePairingCheckResult =
  | { matched: false }
  | {
      matched: true;
      pairingUid: string;
      self: { productId: string; deviceName: string; deviceType: string };
      peer: { productId: string; deviceName: string; deviceType: string };
    };

export async function checkDevicePairing(
  productId: string,
  deviceName: string
): Promise<DevicePairingCheckResult> {
  const q = new URLSearchParams({
    productId: productId.trim(),
    deviceName: deviceName.trim(),
  });
  const res = await fetch(`${API_BASE}/device-pairings/check?${q}`);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (!text) return { matched: false };
  return JSON.parse(text) as DevicePairingCheckResult;
}

export interface CreateDevicePairingPayload {
  leftProductId: string;
  leftDeviceName: string;
  leftDeviceType: string;
  rightProductId: string;
  rightDeviceName: string;
  rightDeviceType: string;
}

/** POST /device-pairings — 需 Basic + X-ICP-Principal-Id，与 e2e-device-integration.mjs 一致 */
export async function createDevicePairing(
  principalId: string,
  payload: CreateDevicePairingPayload
): Promise<Record<string, unknown>> {
  const res = await chatApiFetch(
    `${API_BASE}/device-pairings`,
    {
      method: 'POST',
      headers: authHeaders(principalId),
      body: JSON.stringify(payload),
    },
    principalId
  );
  return parseJson<Record<string, unknown>>(res);
}

export { API_BASE as UNIVOICE_CHAT_API_BASE };
