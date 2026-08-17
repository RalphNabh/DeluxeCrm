"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/layout/page-header";

type Conversation = {
  id: string;
  client_id: string;
  last_message_at?: string | null;
  clients?: { id?: string; name?: string; email?: string } | null;
};

type HubMessage = { id: string; body: string; sender_type: string; created_at?: string };

function ContractorMessages() {
  const searchParams = useSearchParams();
  const clientIdFilter = searchParams.get("clientId");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<HubMessage[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/conversations")
      .then(async (r) => {
        const data = await r.json().catch(() => []);
        if (!r.ok) {
          setError(data.error || "Could not load messages.");
          return [];
        }
        return Array.isArray(data) ? (data as Conversation[]) : [];
      })
      .then((list) => {
        setConversations(list);
        const match = clientIdFilter
          ? list.find((c) => c.client_id === clientIdFilter)
          : list[0];
        setSelectedId(match?.id ?? list[0]?.id ?? null);
      })
      .finally(() => setLoading(false));
  }, [clientIdFilter]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    fetch(`/api/conversations/${selectedId}/messages`)
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setMessages(data));
  }, [selectedId]);

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId),
    [conversations, selectedId],
  );

  const sendMessage = async () => {
    if (!selectedId || !body.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/conversations/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      const msg = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(msg.error || "Could not send message.");
        return;
      }
      setMessages((prev) => [...prev, msg]);
      setBody("");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Messages"
        description="Reply to Client Hub conversations."
      />
      <main className="flex-1 p-4 md:p-6 grid gap-4 md:grid-cols-[240px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clients</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {loading && <p className="text-sm text-gray-500">Loading…</p>}
            {!loading && !conversations.length && (
              <p className="text-sm text-gray-500">
                No Hub messages yet. They appear when a client writes you or requests estimate changes.
              </p>
            )}
            {conversations.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={`w-full text-left rounded-md px-3 py-2 text-sm ${
                  selectedId === c.id ? "bg-teal-50 text-teal-900" : "hover:bg-gray-50"
                }`}
              >
                <div className="font-medium truncate">
                  {c.clients?.name || "Client"}
                </div>
                {c.last_message_at && (
                  <div className="text-xs text-gray-500">
                    {new Date(c.last_message_at).toLocaleString()}
                  </div>
                )}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-base">
              {selected?.clients?.name || "Conversation"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-3">
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex-1 space-y-2 overflow-y-auto min-h-[320px]">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`text-sm p-2 rounded-lg max-w-[80%] whitespace-pre-wrap ${
                    m.sender_type === "contractor"
                      ? "bg-teal-100 ml-auto"
                      : "bg-gray-100"
                  }`}
                >
                  {m.body}
                </div>
              ))}
              {selectedId && !messages.length && (
                <p className="text-sm text-gray-500">No messages yet.</p>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Reply to your client…"
                disabled={!selectedId || sending}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />
              <Button
                onClick={sendMessage}
                disabled={!selectedId || sending || !body.trim()}
              >
                {sending ? "Sending…" : "Send"}
              </Button>
            </div>
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
