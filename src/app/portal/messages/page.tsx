"use client";

import { useCallback, useEffect, useState } from "react";
import PortalShell from "@/components/portal/portal-shell";
import MessageChatPanel from "@/components/messaging/message-chat-panel";
import { useConversationMessages } from "@/hooks/use-conversation-messages";

export default function PortalMessagesPage() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadError(null);
      const res = await fetch("/api/portal/conversations");
      const data = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok || !Array.isArray(data) || !data[0]?.id) {
        setLoadError(data.error || "Could not open messages.");
        setLoading(false);
        return;
      }
      setConversationId(data[0].id);
      setLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const {
    messages,
    loading: loadingMessages,
    error: threadError,
    setError: setThreadError,
    appendOptimistic,
  } = useConversationMessages({
    conversationId,
    apiBase: "portal",
  });

  const sendMessage = useCallback(
    async (body: string) => {
      if (!conversationId) return;
      setThreadError(null);
      const res = await fetch(
        `/api/portal/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        },
      );
      const msg = await res.json().catch(() => ({}));
      if (!res.ok) {
        setThreadError(msg.error || "Could not send message.");
        return;
      }
      appendOptimistic(msg);
    },
    [appendOptimistic, conversationId, setThreadError],
  );

  const error = loadError || threadError;

  return (
    <PortalShell title="Messages">
      <main className="mx-auto flex h-[calc(100dvh-12rem)] w-full max-w-3xl flex-col overflow-hidden p-4">
        <MessageChatPanel
          className="min-h-0 h-full"
          title="Conversation"
          messages={messages}
          viewerRole="client"
          onSend={sendMessage}
          error={error}
          loading={loading || loadingMessages}
          emptyMessage="No messages yet. Say hello to your contractor."
          composerDisabled={!conversationId || loading}
          composerPlaceholder="Type a message..."
        />
      </main>
    </PortalShell>
  );
}
