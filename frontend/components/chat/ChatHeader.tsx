"use client";

import { useState } from "react";
import Avatar from "@/components/Avatar";
import ConfirmDialog from "@/components/ConfirmDialog";
import { formatLastSeen } from "@/lib/format";
import { useApp } from "@/lib/store";
import { useTicker } from "@/lib/useTicker";
import type { Conversation, User } from "@/lib/types";
import AllMediaModal from "./AllMediaModal";

interface Props {
  conversation: Conversation;
  currentUser: User;
  isTyping: boolean;
  onOpenInfo: () => void;
  onArchived: () => void;
  onDeleted: () => void;
  onSelectMessages: () => void;
  onToggleSearch: () => void;
  searchOpen: boolean;
  pushToast: (title: string, body?: string) => void;
}

export default function ChatHeader({
  conversation,
  currentUser,
  isTyping,
  onOpenInfo,
  onArchived,
  onDeleted,
  onSelectMessages,
  onToggleSearch,
  searchOpen,
  pushToast,
}: Props) {
  const {
    contacts,
    archiveConversation,
    muteConversation,
    pinConversation,
    markConversationUnread,
    deleteConversation,
    blockUser,
    unblockUser,
  } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAllMedia, setShowAllMedia] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useTicker();
  const other =
    conversation.type === "direct"
      ? conversation.participants.find((p) => p.user.id !== currentUser.id)?.user
      : undefined;
  const isBlocked = !!other && contacts.find((c) => c.user.id === other.id)?.is_blocked;

  let subtitle: string;
  if (isTyping) {
    subtitle = "typing…";
  } else if (conversation.type === "direct" && other) {
    subtitle = other.is_online ? "Online" : `Last seen ${formatLastSeen(other.last_seen_at)}`;
  } else {
    subtitle = `${conversation.participants.length} members`;
  }

  function comingSoon(feature: string) {
    pushToast(`${feature} coming soon`, "This feature isn't part of the Signal demo yet.");
  }

  async function toggleArchive() {
    const nextArchived = !conversation.archived;
    try {
      await archiveConversation(conversation.id, nextArchived);
      pushToast(nextArchived ? "Chat archived" : "Chat unarchived");
      if (nextArchived) onArchived();
    } catch {
      pushToast("Couldn't update this chat");
    }
  }

  async function toggleMute() {
    const next = !conversation.muted;
    try {
      await muteConversation(conversation.id, next);
      pushToast(next ? "Notifications muted" : "Notifications unmuted");
    } catch {
      pushToast("Couldn't update this chat");
    }
  }

  async function togglePin() {
    const next = !conversation.pinned;
    try {
      await pinConversation(conversation.id, next);
      pushToast(next ? "Chat pinned" : "Chat unpinned");
    } catch {
      pushToast("Couldn't update this chat");
    }
  }

  async function handleMarkUnread() {
    try {
      await markConversationUnread(conversation.id);
      onArchived(); // reuse the "back to list" callback — same behavior we want here
    } catch {
      pushToast("Couldn't mark as unread");
    }
  }

  async function toggleBlock() {
    if (!other) return;
    try {
      if (isBlocked) {
        await unblockUser(other.id);
        pushToast(`Unblocked ${other.display_name}`);
      } else {
        await blockUser(other.id);
        pushToast(`Blocked ${other.display_name}`, "They can no longer message you.");
      }
    } catch {
      pushToast("Couldn't update block status");
    }
  }

  async function handleDelete() {
    await deleteConversation(conversation.id);
    pushToast("Chat deleted");
    onDeleted();
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
          <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate flex items-center gap-1.5">
            {conversation.name || "Unknown"}
            {conversation.pinned && (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="var(--color-text-secondary)" className="shrink-0">
                <path d="M16 3l5 5-5.5 2L13 13l-2 8-2-2 3-8-3.5-3.5L3 10l5-5 3.5 3.5L16 3z" />
              </svg>
            )}
            {conversation.muted && (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" className="shrink-0">
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                <path d="M18.63 13A17.89 17.89 0 0 1 18 8" />
                <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" />
                <path d="M18 8a6 6 0 0 0-9.33-5" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            )}
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
        <button
          onClick={onToggleSearch}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition ${
            searchOpen
              ? "bg-[var(--color-signal-blue)] text-white"
              : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]"
          }`}
          title="Search in conversation"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
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
              <div className="absolute right-0 top-11 z-20 w-60 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl shadow-lg py-1.5 animate-fade-in-up">
                <MenuItem onClick={() => { setMenuOpen(false); onOpenInfo(); }} label="Disappearing messages" />
                <MenuItem onClick={() => { setMenuOpen(false); toggleMute(); }} label={conversation.muted ? "Unmute notifications" : "Mute notifications"} />
                <MenuItem onClick={() => { setMenuOpen(false); onOpenInfo(); }} label="Chat settings" />
                <MenuItem onClick={() => { setMenuOpen(false); setShowAllMedia(true); }} label="All media" />
                <div className="my-1.5 border-t border-[var(--color-border)]" />
                <MenuItem onClick={() => { setMenuOpen(false); onSelectMessages(); }} label="Select messages" />
                <MenuItem onClick={() => { setMenuOpen(false); handleMarkUnread(); }} label="Mark as unread" />
                <MenuItem onClick={() => { setMenuOpen(false); togglePin(); }} label={conversation.pinned ? "Unpin chat" : "Pin chat"} />
                <MenuItem onClick={() => { setMenuOpen(false); toggleArchive(); }} label={conversation.archived ? "Unarchive chat" : "Archive chat"} />
                {conversation.type === "direct" && other && (
                  <MenuItem onClick={() => { setMenuOpen(false); toggleBlock(); }} label={isBlocked ? `Unblock ${other.display_name}` : "Block"} />
                )}
                <div className="my-1.5 border-t border-[var(--color-border)]" />
                <MenuItem onClick={() => { setMenuOpen(false); setConfirmDelete(true); }} label="Delete" danger />
              </div>
            </>
          )}
        </div>
      </div>

      {showAllMedia && <AllMediaModal conversationId={conversation.id} onClose={() => setShowAllMedia(false)} />}
      {confirmDelete && (
        <ConfirmDialog
          title="Delete this chat?"
          message="This deletes the conversation for you only — the other participant(s) keep their copy. This can't be undone."
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}

function MenuItem({ onClick, label, danger }: { onClick: () => void; label: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-bg-tertiary)] transition ${
        danger ? "text-red-500" : ""
      }`}
    >
      {label}
    </button>
  );
}
