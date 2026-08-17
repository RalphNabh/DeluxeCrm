"use client";

import { useEffect, useMemo, useRef } from "react";
import { Info } from "lucide-react";
import {
  formatDayDivider,
  formatMessageTime,
} from "@/lib/messaging/format";

export type ThreadMessage = {
  id: string;
  body: string;
  sender_type: "client" | "contractor";
  message_type?: "text" | "system";
  metadata?: Record<string, unknown>;
  read_at?: string | null;
  created_at?: string;
};

type MessageThreadProps = {
  messages: ThreadMessage[];
  viewerRole: "client" | "contractor";
  emptyMessage?: string;
  className?: string;
};

export default function MessageThread({
  messages,
  viewerRole,
  emptyMessage = "No messages yet.",
  className = "",
}: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const grouped = useMemo(() => {
    const items: Array<
      | { type: "divider"; key: string; label: string }
      | { type: "message"; key: string; message: ThreadMessage }
    > = [];
    let lastDay = "";

    for (const msg of messages) {
      const dayKey = msg.created_at
        ? new Date(msg.created_at).toDateString()
        : "";
      if (dayKey && dayKey !== lastDay) {
        items.push({
          type: "divider",
          key: `d-${dayKey}`,
          label: formatDayDivider(msg.created_at!),
        });
        lastDay = dayKey;
      }
      items.push({ type: "message", key: msg.id, message: msg });
    }
    return items;
  }, [messages]);

  if (!messages.length) {
    return (
      <div className={`text-sm text-gray-500 py-8 text-center ${className}`}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`flex-1 space-y-2 overflow-y-auto min-h-[280px] ${className}`}>
      {grouped.map((item) => {
        if (item.type === "divider") {
          return (
            <div
              key={item.key}
              className="flex items-center gap-3 py-2 text-xs text-gray-500"
            >
              <span className="flex-1 border-t border-gray-200" />
              <span className="whitespace-nowrap">{item.label}</span>
              <span className="flex-1 border-t border-gray-200" />
            </div>
          );
        }

        const m = item.message;
        if (m.message_type === "system") {
          return (
            <div key={item.key} className="flex justify-center py-1">
              <div className="flex items-start gap-1.5 max-w-[90%] rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-400" />
                <div>
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  {m.created_at && (
                    <p className="mt-1 text-[10px] text-slate-400">
                      {formatMessageTime(m.created_at)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        }

        const isOwn =
          (viewerRole === "client" && m.sender_type === "client") ||
          (viewerRole === "contractor" && m.sender_type === "contractor");

        const bubbleClass = isOwn
          ? viewerRole === "client"
            ? "bg-blue-100 ml-auto"
            : "bg-teal-100 ml-auto"
          : "bg-gray-100";

        return (
          <div key={item.key} className={`max-w-[80%] ${isOwn ? "ml-auto" : ""}`}>
            <div
              className={`text-sm p-2.5 rounded-lg whitespace-pre-wrap ${bubbleClass}`}
            >
              {m.body}
            </div>
            {m.created_at && (
              <p
                className={`text-[10px] text-gray-400 mt-0.5 px-1 ${
                  isOwn ? "text-right" : ""
                }`}
                title={new Date(m.created_at).toLocaleString()}
              >
                {formatMessageTime(m.created_at)}
              </p>
            )}
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
