"use client";

import MessageThread, { type ThreadMessage } from "@/components/messaging/message-thread";
import MessageComposer from "@/components/messaging/message-composer";

type MessageChatPanelProps = {
  title: React.ReactNode;
  messages: ThreadMessage[];
  viewerRole: "client" | "contractor";
  onSend: (body: string) => Promise<void>;
  error?: string | null;
  loading?: boolean;
  emptyMessage?: string;
  composerDisabled?: boolean;
  composerPlaceholder?: string;
  className?: string;
};

export default function MessageChatPanel({
  title,
  messages,
  viewerRole,
  onSend,
  error,
  loading = false,
  emptyMessage,
  composerDisabled = false,
  composerPlaceholder,
  className = "",
}: MessageChatPanelProps) {
  return (
    <div
      className={`flex min-h-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}
    >
      <div className="shrink-0 border-b border-gray-200 px-4 py-3">
        <div className="text-base font-semibold text-gray-900">{title}</div>
      </div>

      {(error || (loading && !messages.length)) && (
        <div className="shrink-0 space-y-1 px-4 pt-3">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {loading && !messages.length && (
            <p className="text-sm text-gray-500">Loading messages…</p>
          )}
        </div>
      )}

      <MessageThread
        messages={messages}
        viewerRole={viewerRole}
        emptyMessage={emptyMessage}
        className="min-h-0 flex-1"
      />

      <div className="shrink-0 border-t border-gray-200 bg-white p-3">
        <MessageComposer
          onSend={onSend}
          disabled={composerDisabled}
          placeholder={composerPlaceholder}
        />
      </div>
    </div>
  );
}
