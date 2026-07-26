"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { formatDayDivider } from "@/lib/format";
import type { Message } from "@/lib/types";
import ChatHeader from "./ChatHeader";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import Composer from "./Composer";

interface Props {
  conversationId: string;
  onOpenInfo: () => void;
}

export default function ChatPane({ conversationId, onOpenInfo }: Props) {
  const {
    user,
    conversations,
    messages,
    typing,
    loadMessages,
    sendMessage,
    deleteMessage,
    react,
    markRead,
    sendTyping,
    sendStopTyping,
    pushToast,
  } = useApp();
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const conversation = conversations.find((c) => c.id === conversationId);
  const convMessages = useMemo(() => messages[conversationId] || [], [messages, conversationId]);

  useEffect(() => {
    loadMessages(conversationId).catch(() => {});
    markRead(conversationId).catch(() => {});
  }, [conversationId, loadMessages, markRead]);

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

  if (!conversation || !user) return null;

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

  return (
    <div className="flex flex-col h-full min-w-0 flex-1 bg-[var(--color-bg)]">
      <ChatHeader
        conversation={conversation}
        currentUser={user}
        isTyping={typingUserIds.length > 0}
        onOpenInfo={onOpenInfo}
        pushToast={pushToast}
      />

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
            <div key={message.id}>
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
                currentUserId={user.id}
              />
            </div>
          );
        })}
        {typingUserIds.length > 0 && (
          <TypingIndicator label={conversation.type === "group" ? typingLabel || undefined : undefined} />
        )}
        <div ref={bottomRef} />
      </div>

      <Composer
        replyTo={replyTo}
        replyToSenderName={replyTo ? participantName(replyTo.sender_id) : undefined}
        onCancelReply={() => setReplyTo(null)}
        onSend={(content, opts) => {
          sendMessage(conversationId, content, { reply_to_id: replyTo?.id, ...opts });
          setReplyTo(null);
        }}
        onTyping={() => sendTyping(conversationId)}
        onStopTyping={() => sendStopTyping(conversationId)}
        pushToast={pushToast}
      />
    </div>
  );
}
