"use client";

import { useState } from "react";
import type { Message } from "@/lib/types";

interface Props {
  pinnedMessages: Message[];
  participantName: (userId: string) => string;
  onJump: (messageId: string) => void;
}

export default function PinnedBanner({ pinnedMessages, participantName, onJump }: Props) {
  const [index, setIndex] = useState(0);
  const current = pinnedMessages[Math.min(index, pinnedMessages.length - 1)];
  if (!current) return null;

  return (
    <button
      onClick={() => {
        onJump(current.id);
        setIndex((i) => (i + 1) % pinnedMessages.length);
      }}
      className="flex items-center gap-3 px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg)] hover:bg-[var(--color-bg-tertiary)] transition text-left w-full"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--color-signal-blue)" className="shrink-0">
        <path d="M16 3l5 5-5.5 2L13 13l-2 8-2-2 3-8-3.5-3.5L3 10l5-5 3.5 3.5L16 3z" />
      </svg>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-[var(--color-signal-blue)]">
          Pinned message{pinnedMessages.length > 1 ? `s (${pinnedMessages.length})` : ""}
        </p>
        <p className="text-xs text-[var(--color-text-secondary)] truncate">
          {participantName(current.sender_id)}:{" "}
          {current.content || (current.attachment_url ? "📎 Attachment" : "")}
        </p>
      </div>
    </button>
  );
}
