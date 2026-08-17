"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ThreadMessage } from "@/components/messaging/message-thread";

type UseConversationMessagesOptions = {
  conversationId: string | null;
  apiBase: "crm" | "portal";
  enabled?: boolean;
  onMarkRead?: () => void;
  /** Poll interval when Realtime is unavailable (ms). 0 = disabled. */
  pollIntervalMs?: number;
};

type MessagesResponse = {
  messages: ThreadMessage[];
  hasMore: boolean;
};

const DEFAULT_POLL_MS = 4_000;

function messagesUrl(apiBase: "crm" | "portal", conversationId: string, before?: string) {
  const prefix =
    apiBase === "portal"
      ? `/api/portal/conversations/${conversationId}/messages`
      : `/api/conversations/${conversationId}/messages`;
  const params = new URLSearchParams();
  if (before) params.set("before", before);
  const qs = params.toString();
  return qs ? `${prefix}?${qs}` : prefix;
}

function readUrl(apiBase: "crm" | "portal", conversationId: string) {
  return apiBase === "portal"
    ? `/api/portal/conversations/${conversationId}/read`
    : `/api/conversations/${conversationId}/read`;
}

export function useConversationMessages({
  conversationId,
  apiBase,
  enabled = true,
  onMarkRead,
  pollIntervalMs = DEFAULT_POLL_MS,
}: UseConversationMessagesOptions) {
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idsRef = useRef(new Set<string>());
  const realtimeOkRef = useRef(false);

  const mergeMessages = useCallback((incoming: ThreadMessage[]) => {
    setMessages((prev) => {
      const map = new Map<string, ThreadMessage>();
      for (const m of prev) map.set(m.id, m);
      for (const m of incoming) map.set(m.id, m);
      const merged = [...map.values()].sort(
        (a, b) =>
          new Date(a.created_at ?? 0).getTime() -
          new Date(b.created_at ?? 0).getTime(),
      );
      idsRef.current = new Set(merged.map((m) => m.id));
      return merged;
    });
  }, []);

  const markRead = useCallback(async () => {
    if (!conversationId) return;
    try {
      await fetch(readUrl(apiBase, conversationId), { method: "PATCH" });
      onMarkRead?.();
    } catch {
      /* non-fatal */
    }
  }, [apiBase, conversationId, onMarkRead]);

  const applyIncomingRows = useCallback(
    (rows: ThreadMessage[], markAsRead: boolean) => {
      const fresh = rows.filter((row) => !idsRef.current.has(row.id));
      if (fresh.length === 0) return;
      for (const row of fresh) idsRef.current.add(row.id);
      setMessages((prev) =>
        [...prev, ...fresh].sort(
          (a, b) =>
            new Date(a.created_at ?? 0).getTime() -
            new Date(b.created_at ?? 0).getTime(),
        ),
      );
      if (markAsRead) void markRead();
    },
    [markRead],
  );

  const fetchMessages = useCallback(
    async (before?: string, options?: { silent?: boolean; markRead?: boolean }) => {
      if (!conversationId || !enabled) return;
      if (!options?.silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const res = await fetch(messagesUrl(apiBase, conversationId, before));
        const data = (await res.json().catch(() => ({}))) as MessagesResponse & {
          error?: string;
        };
        if (!res.ok) {
          if (!options?.silent) {
            setError(data.error || "Could not load messages.");
          }
          return;
        }
        const list = Array.isArray(data) ? data : (data.messages ?? []);
        const more = Array.isArray(data) ? false : Boolean(data.hasMore);
        if (before) {
          mergeMessages(list);
        } else if (options?.silent) {
          applyIncomingRows(list, options.markRead ?? false);
        } else {
          idsRef.current = new Set(list.map((m) => m.id));
          setMessages(list);
        }
        setHasMore(more);
        if (!before && !options?.silent && (options?.markRead ?? true)) {
          void markRead();
        }
      } finally {
        if (!options?.silent) setLoading(false);
      }
    },
    [apiBase, conversationId, enabled, markRead, mergeMessages, applyIncomingRows],
  );

  useEffect(() => {
    if (!conversationId || !enabled) {
      setMessages([]);
      idsRef.current = new Set();
      return;
    }
    realtimeOkRef.current = false;
    void fetchMessages();
  }, [conversationId, enabled, fetchMessages]);

  // Supabase Realtime: push new messages over WebSocket.
  useEffect(() => {
    if (!conversationId || !enabled) return;

    let cancelled = false;
    const supabase = createClient();

    const subscribe = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;

      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }

      const channel = supabase
        .channel(`messages:${conversationId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            realtimeOkRef.current = true;
            const row = payload.new as ThreadMessage;
            applyIncomingRows([row], true);
          },
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            realtimeOkRef.current = true;
          }
        });

      return channel;
    };

    let channel: Awaited<ReturnType<typeof subscribe>> | undefined;
    void subscribe().then((ch) => {
      channel = ch;
    });

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [conversationId, enabled, applyIncomingRows]);

  // Poll fallback when tab is visible (covers Realtime auth/WS failures).
  useEffect(() => {
    if (!conversationId || !enabled || pollIntervalMs <= 0) return;

    const tick = () => {
      if (document.visibilityState !== "visible") return;
      void fetchMessages(undefined, { silent: true, markRead: true });
    };

    const interval = window.setInterval(tick, pollIntervalMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [conversationId, enabled, pollIntervalMs, fetchMessages]);

  useEffect(() => {
    if (!conversationId || !enabled) return;
    const onFocus = () => void markRead();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [conversationId, enabled, markRead]);

  const appendOptimistic = useCallback((msg: ThreadMessage) => {
    idsRef.current.add(msg.id);
    setMessages((prev) => [...prev, msg]);
  }, []);

  const loadMore = useCallback(() => {
    const first = messages[0];
    if (!first?.created_at) return;
    void fetchMessages(first.created_at);
  }, [fetchMessages, messages]);

  return {
    messages,
    loading,
    hasMore,
    error,
    setError,
    appendOptimistic,
    refresh: () => fetchMessages(),
    loadMore,
    markRead,
  };
}
