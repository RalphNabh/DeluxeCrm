"use client";

import { formatListTime, truncatePreview } from "@/lib/messaging/format";

export type ConversationListItem = {
  id: string;
  client_id: string;
  last_message_at?: string | null;
  last_message_preview?: string | null;
  unread_count?: number;
  clients?: { id?: string; name?: string; email?: string } | null;
};

type ConversationListProps = {
  conversations: ConversationListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading?: boolean;
  emptyMessage?: string;
};

export default function ConversationList({
  conversations,
  selectedId,
  onSelect,
  loading = false,
  emptyMessage = "No conversations yet.",
}: ConversationListProps) {
  if (loading) {
    return <p className="text-sm text-gray-500 px-3 py-2">Loading…</p>;
  }

  if (!conversations.length) {
    return <p className="text-sm text-gray-500 px-3 py-2">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-1">
      {conversations.map((c) => {
        const selected = c.id === selectedId;
        const unread = (c.unread_count ?? 0) > 0;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            className={`w-full text-left rounded-md px-3 py-2 text-sm ${
              selected ? "bg-teal-50 text-teal-900" : "hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium truncate">
                {c.clients?.name || "Client"}
              </span>
              <span className="flex items-center gap-1.5 shrink-0">
                {c.last_message_at && (
                  <span className="text-xs text-gray-500">
                    {formatListTime(c.last_message_at)}
                  </span>
                )}
                {unread && (
                  <span
                    className="h-2 w-2 rounded-full bg-teal-500"
                    aria-label="Unread messages"
                  />
                )}
              </span>
            </div>
            {c.last_message_preview && (
              <p className="text-xs text-gray-500 truncate mt-0.5">
                {truncatePreview(c.last_message_preview)}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}
