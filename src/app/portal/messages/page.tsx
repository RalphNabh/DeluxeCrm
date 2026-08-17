"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PortalShell from "@/components/portal/portal-shell";
import MessageThread from "@/components/messaging/message-thread";
import MessageComposer from "@/components/messaging/message-composer";
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
      <main className="max-w-3xl mx-auto w-full p-4 flex flex-col gap-4">
        <Card className="flex-1 flex flex-col min-h-[420px]">
          <CardHeader>
            <CardTitle className="text-base">Conversation</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-3">
            {error && <p className="text-sm text-red-600">{error}</p>}
            {(loading || loadingMessages) && !messages.length && (
              <p className="text-gray-500 text-sm">Loading messages…</p>
            )}
            <MessageThread
              messages={messages}
              viewerRole="client"
              emptyMessage="No messages yet. Say hello to your contractor."
            />
            <MessageComposer
              onSend={sendMessage}
              disabled={!conversationId || loading}
              placeholder="Type a message..."
            />
          </CardContent>
        </Card>
      </main>
    </PortalShell>
  );
}
