"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/layout/page-header";
import ConversationList, {
  type ConversationListItem,
} from "@/components/messaging/conversation-list";
import MessageThread from "@/components/messaging/message-thread";
import MessageComposer from "@/components/messaging/message-composer";
import { useConversationMessages } from "@/hooks/use-conversation-messages";

function ContractorMessages() {
  const searchParams = useSearchParams();
  const clientIdFilter = searchParams.get("clientId");
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(true);

  const refreshList = useCallback(async () => {
    const res = await fetch("/api/conversations");
    const data = await res.json().catch(() => []);
    if (!res.ok) {
      setListError(data.error || "Could not load messages.");
      return [];
    }
    return Array.isArray(data) ? (data as ConversationListItem[]) : [];
  }, []);

  useEffect(() => {
    void refreshList()
      .then((list) => {
        setConversations(list);
        const match = clientIdFilter
          ? list.find((c) => c.client_id === clientIdFilter)
          : list[0];
        setSelectedId(match?.id ?? list[0]?.id ?? null);
      })
      .finally(() => setLoadingList(false));
  }, [clientIdFilter, refreshList]);

  // Keep conversation list fresh while on this page.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      void refreshList().then(setConversations);
    };
    const interval = window.setInterval(tick, 5_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refreshList]);

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId),
    [conversations, selectedId],
  );

  const {
    messages,
    loading: loadingMessages,
    error: threadError,
    setError: setThreadError,
    appendOptimistic,
  } = useConversationMessages({
    conversationId: selectedId,
    apiBase: "crm",
    onMarkRead: () => {
      void refreshList().then(setConversations);
    },
  });

  const sendMessage = async (body: string) => {
    if (!selectedId) return;
    setThreadError(null);
    const res = await fetch(`/api/conversations/${selectedId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const msg = await res.json().catch(() => ({}));
    if (!res.ok) {
      setThreadError(msg.error || "Could not send message.");
      return;
    }
    appendOptimistic(msg);
    const list = await refreshList();
    setConversations(list);
  };

  const error = listError || threadError;

  return (
    <>
      <PageHeader
        title="Messages"
        description="Reply to Client Hub conversations."
      />
      <main className="flex-1 p-4 md:p-6 grid gap-4 md:grid-cols-[260px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <ConversationList
              conversations={conversations}
              selectedId={selectedId}
              onSelect={setSelectedId}
              loading={loadingList}
              emptyMessage="No Hub messages yet. They appear when a client writes you or submits a request."
            />
          </CardContent>
        </Card>

        <Card className="flex flex-col min-h-[420px]">
          <CardHeader>
            <CardTitle className="text-base">
              {selected?.clients?.name || "Conversation"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-3">
            {error && <p className="text-sm text-red-600">{error}</p>}
            {loadingMessages && !messages.length && (
              <p className="text-sm text-gray-500">Loading messages…</p>
            )}
            <MessageThread
              messages={messages}
              viewerRole="contractor"
              emptyMessage={
                selectedId ? "No messages yet." : "Select a conversation."
              }
            />
            <MessageComposer
              onSend={sendMessage}
              disabled={!selectedId}
              placeholder="Reply to your client…"
            />
          </CardContent>
        </Card>
      </main>
    </>
  );
}

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-gray-500">Loading messages…</div>
      }
    >
      <ContractorMessages />
    </Suspense>
  );
}
