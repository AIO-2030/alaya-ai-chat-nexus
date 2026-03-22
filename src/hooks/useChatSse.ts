import { useEffect, useRef } from 'react';
import { EventSourcePolyfill } from 'event-source-polyfill';
import { buildChatAuthHeaders } from '@/lib/icpChatCredentials';
import type { MessageItem } from '@/services/api/univoiceChatApi';

const SSE_BASE =
  (import.meta.env.VITE_UNIVOICE_CHAT_SSE_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://localhost:3001';

const CHAT_SSE_LOG = '[chat-sse]';

function principalPreview(principalId: string): string {
  if (principalId.length <= 16) return principalId;
  return `${principalId.slice(0, 12)}…`;
}

/** SSE payload shape (aligned with chat-sse; fields are best-effort). */
export interface SseEventEnvelope {
  sessionId?: string;
  userId?: string;
  payload?: { message?: MessageItem };
}

/**
 * Uses `event-source-polyfill` `EventSourcePolyfill` with custom `headers` so we can send
 * `Authorization: Basic ...` and `X-ICP-Principal-Id` (native EventSource cannot set headers).
 */
export function useChatSse(
  principalId: string | null,
  sessionId: string | null,
  onMessageNew: (message: MessageItem) => void,
  onSyncHint?: () => void
): void {
  const onMessageRef = useRef(onMessageNew);
  const onSyncRef = useRef(onSyncHint);
  onMessageRef.current = onMessageNew;
  onSyncRef.current = onSyncHint;

  useEffect(() => {
    if (!principalId || !sessionId) return;

    const headers = buildChatAuthHeaders(principalId);
    if (!headers) {
      console.warn(`${CHAT_SSE_LOG} skipped: missing ICP chat credentials`);
      return;
    }

    const url = `${SSE_BASE}/stream`;
    console.log(`${CHAT_SSE_LOG} connecting`, {
      url,
      sessionId,
      principal: principalPreview(principalId),
      sseBase: SSE_BASE,
    });

    const es = new EventSourcePolyfill(url, {
      headers: {
        ...headers,
      },
      heartbeatTimeout: 120_000,
    });

    const onOpen = () => {
      console.log(`${CHAT_SSE_LOG} open`, { sessionId, principal: principalPreview(principalId) });
    };
    (es as EventSource & { onopen?: () => void }).onopen = onOpen;

    const onMessageNewEv = (ev: MessageEvent) => {
      try {
        const envelope = JSON.parse(ev.data as string) as SseEventEnvelope;
        if (envelope.sessionId !== sessionId) {
          console.log(`${CHAT_SSE_LOG} message.new ignored (other session)`, {
            envelopeSessionId: envelope.sessionId,
            currentSessionId: sessionId,
          });
          return;
        }
        const msg = envelope.payload?.message;
        if (msg && (msg as MessageItem).id) {
          console.log(`${CHAT_SSE_LOG} message.new`, {
            messageId: (msg as MessageItem).id,
            sessionId,
          });
          onMessageRef.current(msg as MessageItem);
        }
      } catch (e) {
        console.warn(`${CHAT_SSE_LOG} message.new parse failed`, e);
      }
    };

    const onSyncHintEv = () => {
      console.log(`${CHAT_SSE_LOG} sync.hint`, { sessionId });
      onSyncRef.current?.();
    };

    const onReadUpdate = (ev: MessageEvent) => {
      console.log(`${CHAT_SSE_LOG} read.update`, { sessionId, dataLength: String(ev.data || '').length });
    };

    const onTypingUpdate = (ev: MessageEvent) => {
      console.log(`${CHAT_SSE_LOG} typing.update`, { sessionId, dataLength: String(ev.data || '').length });
    };

    const onHeartbeat = () => {
      console.debug(`${CHAT_SSE_LOG} heartbeat`, { sessionId });
    };

    es.addEventListener('message.new', onMessageNewEv as EventListener);
    es.addEventListener('sync.hint', onSyncHintEv as EventListener);
    es.addEventListener('read.update', onReadUpdate as EventListener);
    es.addEventListener('typing.update', onTypingUpdate as EventListener);
    es.addEventListener('heartbeat', onHeartbeat as EventListener);

    es.onerror = (err: Event) => {
      console.warn(`${CHAT_SSE_LOG} EventSource error`, { sessionId, err });
    };

    return () => {
      console.log(`${CHAT_SSE_LOG} closing`, { sessionId, principal: principalPreview(principalId) });
      es.removeEventListener('message.new', onMessageNewEv as EventListener);
      es.removeEventListener('sync.hint', onSyncHintEv as EventListener);
      es.removeEventListener('read.update', onReadUpdate as EventListener);
      es.removeEventListener('typing.update', onTypingUpdate as EventListener);
      es.removeEventListener('heartbeat', onHeartbeat as EventListener);
      es.close();
    };
  }, [principalId, sessionId]);
}

const INBOX_DEBOUNCE_MS = 400;

/**
 * Subscribes to the same `/stream` as {@link useChatSse} but does not filter by session.
 * Use on list views (e.g. Contracts) so `unreadCount` from `GET /dm` stays in sync when peers send messages.
 * Debounced to avoid hammering chat-api when many SSE events arrive.
 */
export function useUnivoiceDmInboxSse(
  principalId: string | null,
  enabled: boolean,
  onRefresh: () => void
): void {
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (!principalId || !enabled) return;

    const headers = buildChatAuthHeaders(principalId);
    if (!headers) {
      console.warn(`${CHAT_SSE_LOG} inbox skipped: missing ICP chat credentials`);
      return;
    }

    const url = `${SSE_BASE}/stream`;
    console.log(`${CHAT_SSE_LOG} inbox connecting`, {
      url,
      principal: principalPreview(principalId),
      sseBase: SSE_BASE,
    });

    const es = new EventSourcePolyfill(url, {
      headers: { ...headers },
      heartbeatTimeout: 120_000,
    });

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        onRefreshRef.current();
      }, INBOX_DEBOUNCE_MS);
    };

    const onMessageNewEv = (ev: MessageEvent) => {
      try {
        JSON.parse(ev.data as string) as SseEventEnvelope;
      } catch {
        // still refresh — server may send non-JSON in edge cases
      }
      scheduleRefresh();
    };

    const onSyncHintEv = () => {
      console.log(`${CHAT_SSE_LOG} inbox sync.hint`);
      scheduleRefresh();
    };

    const onReadUpdate = () => {
      scheduleRefresh();
    };

    es.addEventListener('message.new', onMessageNewEv as EventListener);
    es.addEventListener('sync.hint', onSyncHintEv as EventListener);
    es.addEventListener('read.update', onReadUpdate as EventListener);

    es.onerror = (err: Event) => {
      console.warn(`${CHAT_SSE_LOG} inbox EventSource error`, { err });
    };

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      es.removeEventListener('message.new', onMessageNewEv as EventListener);
      es.removeEventListener('sync.hint', onSyncHintEv as EventListener);
      es.removeEventListener('read.update', onReadUpdate as EventListener);
      es.close();
      console.log(`${CHAT_SSE_LOG} inbox closing`, { principal: principalPreview(principalId) });
    };
  }, [principalId, enabled]);
}
