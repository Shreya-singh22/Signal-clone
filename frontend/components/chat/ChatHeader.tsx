"use client";

import { useState } from "react";
import Avatar from "@/components/Avatar";
import { formatLastSeen } from "@/lib/format";
import type { Conversation, User } from "@/lib/types";

interface Props {
  conversation: Conversation;
  currentUser: User;
  isTyping: boolean;
  onOpenInfo: () => void;
  pushToast: (title: string, body?: string) => void;
}

export default function ChatHeader({ conversation, currentUser, isTyping, onOpenInfo, pushToast }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const other =
    conversation.type === "direct"
      ? conversation.participants.find((p) => p.user.id !== currentUser.id)?.user
      : undefined;

  let subtitle: string;
  if (isTyping) {
    subtitle = "typing…";
  } else if (conversation.type === "direct" && other) {
    subtitle = other.is_online ? "Online" : `Last seen ${formatLastSeen(other.last_seen_at)}`;
  } else {
    subtitle = `${conversation.participants.length} members`;
  }

  function comingSoon(feature: string) {
    pushToast(`${feature} coming soon`, "This feature isn't part of the Signam demo yet.");
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
      <button onClick={onOpenInfo} className="flex items-center gap-3 min-w-0 hover:opacity-80 transition">
        <Avatar
          name={conversation.name || "Unknown"}
          color={conversation.avatar_color}
          emoji={conversation.avatar_emoji}
          size={40}
          showPresence={conversation.type === "direct"}
          online={other?.is_online}
        />
        <div className="min-w-0 text-left">
          <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
            {conversation.name || "Unknown"}
          </p>
          <p className={`text-xs truncate ${isTyping ? "text-[var(--color-signal-blue)]" : "text-[var(--color-text-secondary)]"}`}>
            {subtitle}
          </p>
        </div>
      </button>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => comingSoon("Voice calls")}
          className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] transition"
          title="Voice call"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </button>
        <button
          onClick={() => comingSoon("Video calls")}
          className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] transition"
          title="Video call"
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 7l-7 5 7 5V7z" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
        </button>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] transition"
            title="More options"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.8" />
              <circle cx="12" cy="12" r="1.8" />
              <circle cx="12" cy="19" r="1.8" />
            </svg>
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-11 z-20 w-56 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl shadow-lg py-1.5 animate-fade-in-up">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenInfo();
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-bg-tertiary)] transition"
                >
                  {conversation.type === "group" ? "Group info" : "Chat details"}
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    comingSoon("Mute notifications");
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-bg-tertiary)] transition"
                >
                  Mute notifications
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenInfo();
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-bg-tertiary)] transition"
                >
                  Disappearing messages
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
