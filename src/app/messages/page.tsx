"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/layout/page-header";
import ConversationList, {
  type ConversationListItem,
} from "@/components/messaging/conversation-list";
import MessageChatPanel from "@/components/messaging/message-chat-panel";
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
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden md:h-dvh">
      <PageHeader
        title="Messages"
        description="Reply to Client Hub conversations."
      />
      <main className="grid min-h-0 flex-1 gap-4 overflow-hidden p-4 md:grid-cols-[260px_1fr] md:p-6">
        <Card className="flex min-h-0 flex-col overflow-hidden">
          <CardHeader className="shrink-0 pb-3">
            <CardTitle className="text-base">Clients</CardTitle>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-0">
            <ConversationList
              conversations={conversations}
              selectedId={selectedId}
              onSelect={setSelectedId}
              loading={loadingList}
              emptyMessage="No Hub messages yet. They appear when a client writes you or submits a request."
            />
          </CardContent>
        </Card>

        <MessageChatPanel
          className="min-h-0 h-full"
          title={selected?.clients?.name || "Conversation"}
          messages={messages}
          viewerRole="contractor"
          onSend={sendMessage}
          error={error}
          loading={loadingMessages}
          emptyMessage={
            selectedId ? "No messages yet." : "Select a conversation."
          }
          composerDisabled={!selectedId}
          composerPlaceholder="Reply to your client…"
        />
      </main>
    </div>
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
