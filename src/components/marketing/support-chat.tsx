"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";

const POPUP_DELAY_MS = 2500;

export function SupportChatWidget() {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const id = window.setTimeout(() => setVisible(true), POPUP_DELAY_MS);
    return () => window.clearTimeout(id);
  }, []);

  if (!visible) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-white text-[var(--mkt-signal-ink)] shadow-[0_8px_30px_rgba(0,0,0,0.28)] hover:scale-105 transition overflow-hidden animate-[heroFadeUp_0.45s_ease-out]"
        aria-label="Open support chat"
      >
        <Image
          src="/marketing/dominick.png"
          alt=""
          width={48}
          height={48}
          className="h-full w-full object-cover"
        />
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 w-[min(100vw-2rem,340px)] flex flex-col items-end gap-3 animate-[heroFadeUp_0.5s_ease-out]">
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="mr-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/35 text-white/80 hover:bg-black/50 hover:text-white transition"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Message bubble */}
      <div className="relative w-full rounded-[2rem] bg-white px-4 py-3.5 shadow-[0_10px_40px_rgba(0,0,0,0.28)]">
        <div className="flex items-center gap-3">
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full ring-2 ring-white shadow-sm">
            <Image
              src="/marketing/dominick.png"
              alt="Dominick"
              fill
              sizes="44px"
              className="object-cover object-top"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-[var(--mkt-ink)] leading-snug">
              Hi there! How can I help you today?
            </p>
            <p className="mt-1 text-xs text-black/45">
              Dominick from DyluxePro · Just now
            </p>
          </div>
        </div>
      </div>

      {/* Action bubbles — organic cluster */}
      <div className="w-full flex flex-wrap justify-end gap-2">
        <Link
          href="/contact"
          className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-[var(--mkt-signal-ink)] shadow-[0_6px_20px_rgba(0,0,0,0.2)] hover:bg-[var(--mkt-paper)] transition"
        >
          Talk to us
        </Link>
        <Link
          href="/signup"
          className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-[var(--mkt-signal-ink)] shadow-[0_6px_20px_rgba(0,0,0,0.2)] hover:bg-[var(--mkt-paper)] transition"
        >
          Start free
        </Link>
        <Link
          href="/login"
          className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-[var(--mkt-signal-ink)] shadow-[0_6px_20px_rgba(0,0,0,0.2)] hover:bg-[var(--mkt-paper)] transition"
        >
          Sign in (existing accounts)
        </Link>
      </div>
    </div>
  );
}
