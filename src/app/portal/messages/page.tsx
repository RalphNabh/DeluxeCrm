"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PortalMessagesPage() {
  const [conversations, setConversations] = useState<Array<{ id: string; clients?: { name?: string } }>>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ id: string; body: string; sender_type: string }>>([]);
  const [body, setBody] = useState("");

  useEffect(() => {
    fetch("/api/portal/conversations")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setConversations(data);
          if (data[0]) setSelectedId(data[0].id);
        }
      });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    fetch(`/api/portal/conversations/${selectedId}/messages`)
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setMessages(data));
  }, [selectedId]);

  const sendMessage = async () => {
    if (!selectedId || !body.trim()) return;
    const res = await fetch(`/api/portal/conversations/${selectedId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (res.ok) {
      const msg = await res.json();
      setMessages((prev) => [...prev, msg]);
      setBody("");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-4 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Messages</h1>
        <Link href="/portal">
          <Button variant="outline" size="sm">Back</Button>
        </Link>
      </header>
      <main className="flex-1 max-w-2xl mx-auto w-full p-4 flex flex-col gap-4">
        {conversations.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {conversations.map((c) => (
              <Button
                key={c.id}
                size="sm"
                variant={selectedId === c.id ? "default" : "outline"}
                onClick={() => setSelectedId(c.id)}
              >
                {c.clients?.name ?? "Conversation"}
              </Button>
            ))}
          </div>
        )}
        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <CardTitle className="text-base">Conversation</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-3">
            <div className="flex-1 space-y-2 overflow-y-auto min-h-[300px]">
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
              {!messages.length && (
                <p className="text-gray-500 text-sm">No messages yet.</p>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Type a message..."
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />
              <Button onClick={sendMessage}>Send</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
