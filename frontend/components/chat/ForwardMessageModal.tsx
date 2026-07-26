"use client";

import { useMemo, useState } from "react";
import Avatar from "@/components/Avatar";
import Modal from "@/components/Modal";
import { useApp } from "@/lib/store";
import type { Message } from "@/lib/types";

interface Props {
  message: Message;
  onClose: () => void;
}

export default function ForwardMessageModal({ message, onClose }: Props) {
  const { user, conversations, forwardMessage, pushToast } = useApp();
  const [query, setQuery] = useState("");
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!query.trim()) return conversations;
    const q = query.trim().toLowerCase();
    return conversations.filter((c) => {
      if (c.name?.toLowerCase().includes(q)) return true;
      return c.participants.some((p) => p.user.display_name.toLowerCase().includes(q));
    });
  }, [conversations, query]);

  async function handleForward(conversationId: string) {
    setSendingTo(conversationId);
    try {
      await forwardMessage(conversationId, message);
      setSentTo((prev) => new Set(prev).add(conversationId));
      pushToast("Message forwarded");
    } catch {
      pushToast("Couldn't forward message");
    } finally {
      setSendingTo(null);
    }
  }

  if (!user) return null;

  return (
    <Modal title="Forward message" onClose={onClose}>
      <div className="mb-3 rounded-lg bg-[var(--color-bg-tertiary)] px-3 py-2 text-sm text-[var(--color-text-secondary)] truncate">
        {message.content || (message.attachment_url ? "📎 Attachment" : "")}
      </div>

      <div className="flex items-center gap-2 bg-[var(--color-bg-tertiary)] rounded-lg px-3 py-2 mb-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-text-secondary)] shrink-0">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search chats"
          className="bg-transparent text-sm outline-none flex-1 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]"
        />
      </div>

      <div className="flex flex-col gap-0.5 max-h-80 overflow-y-auto">
        {filtered.map((c) => (
          <button
            key={c.id}
            onClick={() => handleForward(c.id)}
            disabled={sendingTo === c.id}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition text-left disabled:opacity-60"
          >
            <Avatar name={c.name || "Unknown"} color={c.avatar_color} emoji={c.avatar_emoji} size={40} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{c.name}</p>
            </div>
            {sentTo.has(c.id) ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-signal-blue)" strokeWidth="2.5" className="shrink-0">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : sendingTo === c.id ? (
              <span className="text-xs text-[var(--color-text-secondary)] shrink-0">Sending…</span>
            ) : null}
          </button>
        ))}
      </div>
    </Modal>
  );
}
