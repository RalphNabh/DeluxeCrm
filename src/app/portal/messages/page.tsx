"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PortalShell from "@/components/portal/portal-shell";

type Conversation = { id: string };
type HubMessage = { id: string; body: string; sender_type: string };

export default function PortalMessagesPage() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<HubMessage[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setError(null);
      const res = await fetch("/api/portal/conversations");
      const data = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok || !Array.isArray(data) || !data[0]?.id) {
        setError(data.error || "Could not open messages.");
        setLoading(false);
        return;
      }
      setConversationId(data[0].id);
      const msgRes = await fetch(`/api/portal/conversations/${data[0].id}/messages`);
      const msgs = await msgRes.json().catch(() => []);
      if (cancelled) return;
      if (msgRes.ok && Array.isArray(msgs)) setMessages(msgs);
      setLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const sendMessage = async () => {
    if (!conversationId || !body.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/portal/conversations/${conversationId}/messages`, {
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
    <PortalShell title="Messages">
      <main className="max-w-3xl mx-auto w-full p-4 flex flex-col gap-4">
        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <CardTitle className="text-base">Conversation</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-3">
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            <div className="flex-1 space-y-2 overflow-y-auto min-h-[300px]">
              {loading && (
                <p className="text-gray-500 text-sm">Loading messages…</p>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`text-sm p-2 rounded-lg max-w-[80%] ${
                    m.sender_type === "client" ? "bg-blue-100 ml-auto" : "bg-gray-100"
                  }`}
                >
                  {m.body}
                </div>
              ))}
              {!loading && !messages.length && (
                <p className="text-gray-500 text-sm">
                  No messages yet. Say hello to your contractor.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Type a message..."
                disabled={!conversationId || sending}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />
              <Button
                onClick={sendMessage}
                disabled={!conversationId || sending || !body.trim()}
              >
                {sending ? "Sending…" : "Send"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </PortalShell>
  );
}
