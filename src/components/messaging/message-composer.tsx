"use client";

import { useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type MessageComposerProps = {
  onSend: (body: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
};

export default function MessageComposer({
  onSend,
  disabled = false,
  placeholder = "Type a message…",
}: MessageComposerProps) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    const trimmed = body.trim();
    if (!trimmed || sending || disabled) return;
    setSending(true);
    try {
      await onSend(trimmed);
      setBody("");
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className="flex gap-2 items-end">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        disabled={disabled || sending}
        onKeyDown={onKeyDown}
        rows={1}
        className="min-h-[40px] max-h-[120px] resize-none flex-1"
      />
      <Button
        onClick={() => void send()}
        disabled={disabled || sending || !body.trim()}
      >
        {sending ? "Sending…" : "Send"}
      </Button>
    </div>
  );
}
