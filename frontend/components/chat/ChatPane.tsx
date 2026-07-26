"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { formatDayDivider } from "@/lib/format";
import type { Message } from "@/lib/types";
import ChatHeader from "./ChatHeader";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import Composer from "./Composer";
import PinnedBanner from "./PinnedBanner";
import SelectionBar from "./SelectionBar";
import ForwardMessageModal from "./ForwardMessageModal";
import MessageInfoModal from "./MessageInfoModal";
import MessageSearchBar from "./MessageSearchBar";

interface Props {
  conversationId: string;
  onOpenInfo: () => void;
  onArchived: () => void;
}

export default function ChatPane({ conversationId, onOpenInfo, onArchived }: Props) {
  const {
    user,
    conversations,
    contacts,
    messages,
    typing,
    loadMessages,
    sendMessage,
    deleteMessage,
    editMessage,
    pinMessage,
    react,
    markRead,
    sendTyping,
    sendStopTyping,
    unblockUser,
    pushToast,
  } = useApp();
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [forwardMessageTarget, setForwardMessageTarget] = useState<Message | null>(null);
  const [infoMessageId, setInfoMessageId] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const conversation = conversations.find((c) => c.id === conversationId);
  const convMessages = useMemo(() => messages[conversationId] || [], [messages, conversationId]);

  useEffect(() => {
    loadMessages(conversationId).catch(() => {});
    markRead(conversationId).catch(() => {});
  }, [conversationId, loadMessages, markRead]);

  // Escape backs out of whichever mode is active — select mode first (it's the
  // more "in progress" state), then search — rather than doing nothing.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (selectMode) {
        setSelectMode(false);
        setSelectedIds(new Set());
      } else if (searchOpen) {
        setSearchOpen(false);
        setSearchQuery("");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectMode, searchOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [convMessages.length]);

  const typingUserIds = (typing[conversationId] || []).filter((id) => id !== user?.id);

  const typingLabel = useMemo(() => {
    if (!conversation || typingUserIds.length === 0) return null;
    if (conversation.type === "direct") return null;
    const names = typingUserIds
      .map((id) => conversation.participants.find((p) => p.user.id === id)?.user.display_name)
      .filter(Boolean);
    if (names.length === 0) return null;
    return `${names.join(", ")} typing…`;
  }, [conversation, typingUserIds]);

  const conversationType = conversation?.type;
  const rows = useMemo(() => {
    return convMessages.map((message, idx) => {
      const day = formatDayDivider(message.created_at);
      const prevDay = idx === 0 ? null : formatDayDivider(convMessages[idx - 1].created_at);
      const showDivider = day !== prevDay;
      const prev = convMessages[idx - 1];
      const showSender =
        conversationType === "group" && (!prev || prev.sender_id !== message.sender_id || showDivider);
      return { message, day, showDivider, showSender: !!showSender };
    });
  }, [convMessages, conversationType]);

  const searchMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return convMessages.filter(
      (m) => !m.is_deleted && !m.is_system && m.content && m.content.toLowerCase().includes(q)
    );
  }, [convMessages, searchQuery]);

  function scrollToMessage(id: string) {
    const el = messageRefs.current.get(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedId(id);
    window.setTimeout(() => setHighlightedId((cur) => (cur === id ? null : cur)), 1600);
  }

  useEffect(() => {
    // Resetting the match cursor and jumping to the first hit is a direct response
    // to the query changing, not a render-cascade concern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveMatchIndex(0);
    if (searchMatches.length > 0) scrollToMessage(searchMatches[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  if (!conversation || !user) return null;

  const otherUser =
    conversation.type === "direct"
      ? conversation.participants.find((p) => p.user.id !== user.id)?.user
      : undefined;
  const blockedContact = otherUser ? contacts.find((c) => c.user.id === otherUser.id && c.is_blocked) : undefined;

  function participantName(userId: string) {
    return conversation!.participants.find((p) => p.user.id === userId)?.user.display_name || "Unknown";
  }
  function participantColor(userId: string) {
    return conversation!.participants.find((p) => p.user.id === userId)?.user.avatar_color;
  }

  function findMessage(id?: string | null) {
    if (!id) return null;
    return convMessages.find((m) => m.id === id) || null;
  }

  function goToMatch(index: number) {
    if (searchMatches.length === 0) return;
    const wrapped = (index + searchMatches.length) % searchMatches.length;
    setActiveMatchIndex(wrapped);
    scrollToMessage(searchMatches[wrapped].id);
  }

  function closeSearch() {
    setSearchOpen(false);
    setSearchQuery("");
    setActiveMatchIndex(0);
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  async function deleteSelected() {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      const msg = convMessages.find((m) => m.id === id);
      if (msg && msg.sender_id === user!.id && !msg.is_deleted) {
        await deleteMessage(conversationId, id).catch(() => {});
      }
    }
    exitSelectMode();
  }

  return (
    <div className="flex flex-col h-full min-w-0 flex-1 bg-[var(--color-bg)]">
      <ChatHeader
        conversation={conversation}
        currentUser={user}
        isTyping={typingUserIds.length > 0}
        onOpenInfo={onOpenInfo}
        onArchived={onArchived}
        onToggleSearch={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
        searchOpen={searchOpen}
        pushToast={pushToast}
      />

      {searchOpen && (
        <MessageSearchBar
          query={searchQuery}
          onQueryChange={setSearchQuery}
          matchCount={searchMatches.length}
          activeIndex={activeMatchIndex}
          onNext={() => goToMatch(activeMatchIndex + 1)}
          onPrev={() => goToMatch(activeMatchIndex - 1)}
          onClose={closeSearch}
        />
      )}

      {conversation.pinned_messages.length > 0 && (
        <PinnedBanner
          pinnedMessages={conversation.pinned_messages}
          participantName={participantName}
          onJump={scrollToMessage}
        />
      )}

      {selectMode && (
        <SelectionBar
          count={selectedIds.size}
          onCancel={exitSelectMode}
          onDelete={deleteSelected}
          onForward={() => {
            const first = convMessages.find((m) => selectedIds.has(m.id));
            if (first) setForwardMessageTarget(first);
          }}
          canDelete={Array.from(selectedIds).every((id) => {
            const msg = convMessages.find((m) => m.id === id);
            return msg && msg.sender_id === user.id;
          })}
        />
      )}

      <div
        className="flex-1 overflow-y-auto py-4"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, var(--color-border) 1px, transparent 0)",
          backgroundSize: "24px 24px",
          backgroundColor: "var(--color-bg-secondary)",
        }}
      >
        {convMessages.length === 0 && (
          <div className="h-full flex items-center justify-center text-sm text-[var(--color-text-secondary)]">
            No messages yet. Say hello 👋
          </div>
        )}
        {rows.map(({ message, day, showDivider, showSender }) => {
          const isOwn = message.sender_id === user.id;

          return (
            <div
              key={message.id}
              ref={(el) => {
                if (el) messageRefs.current.set(message.id, el);
                else messageRefs.current.delete(message.id);
              }}
              className={highlightedId === message.id ? "transition-colors duration-500 bg-[var(--color-signal-blue)]/10" : ""}
            >
              {showDivider && (
                <div className="flex justify-center my-3">
                  <span className="text-xs text-[var(--color-text-secondary)] bg-[var(--color-bg-tertiary)] px-3 py-1 rounded-full">
                    {day}
                  </span>
                </div>
              )}
              <MessageBubble
                message={message}
                isOwn={isOwn}
                showSender={showSender}
                senderName={participantName(message.sender_id)}
                senderColor={participantColor(message.sender_id)}
                replyToMessage={findMessage(message.reply_to_id)}
                replyToSenderName={
                  message.reply_to_id ? participantName(findMessage(message.reply_to_id)?.sender_id || "") : undefined
                }
                onReply={() => setReplyTo(message)}
                onDelete={() => deleteMessage(conversationId, message.id)}
                onReact={(emoji) => react(conversationId, message.id, emoji)}
                onEdit={() => setEditingMessage(message)}
                onForward={() => setForwardMessageTarget(message)}
                onPin={() => pinMessage(conversationId, message.id, !message.pinned_at)}
                onInfo={() => setInfoMessageId(message.id)}
                onEnterSelectMode={() => {
                  setSelectMode(true);
                  setSelectedIds(new Set([message.id]));
                }}
                onJumpToReplied={scrollToMessage}
                currentUserId={user.id}
                selectMode={selectMode}
                isSelected={selectedIds.has(message.id)}
                onToggleSelect={() => toggleSelected(message.id)}
              />
            </div>
          );
        })}
        {typingUserIds.length > 0 && (
          <TypingIndicator label={conversation.type === "group" ? typingLabel || undefined : undefined} />
        )}
        <div ref={bottomRef} />
      </div>

      {blockedContact ? (
        <div className="border-t border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-[var(--color-text-secondary)]">
            You blocked {otherUser?.display_name}. Unblock to send messages.
          </p>
          <button
            onClick={async () => {
              try {
                await unblockUser(otherUser!.id);
                pushToast(`Unblocked ${otherUser?.display_name}`);
              } catch {
                pushToast("Couldn't unblock");
              }
            }}
            className="shrink-0 text-sm font-medium text-[var(--color-signal-blue)]"
          >
            Unblock
          </button>
        </div>
      ) : (
        <Composer
          replyTo={replyTo}
          replyToSenderName={replyTo ? participantName(replyTo.sender_id) : undefined}
          onCancelReply={() => setReplyTo(null)}
          editingMessage={editingMessage}
          onCancelEdit={() => setEditingMessage(null)}
          onSaveEdit={(content) => {
            if (editingMessage) editMessage(conversationId, editingMessage.id, content);
            setEditingMessage(null);
          }}
          onSend={(content, opts) => {
            sendMessage(conversationId, content, { reply_to_id: replyTo?.id, ...opts });
            setReplyTo(null);
          }}
          onTyping={() => sendTyping(conversationId)}
          onStopTyping={() => sendStopTyping(conversationId)}
          pushToast={pushToast}
        />
      )}

      {forwardMessageTarget && (
        <ForwardMessageModal
          message={forwardMessageTarget}
          onClose={() => {
            setForwardMessageTarget(null);
            if (selectMode) exitSelectMode();
          }}
        />
      )}
      {infoMessageId && <MessageInfoModal messageId={infoMessageId} onClose={() => setInfoMessageId(null)} />}
    </div>
  );
}
