"use client";

import { useState } from "react";
import Image from "next/image";
import { API_URL } from "@/lib/api";
import { formatTime, REACTION_EMOJIS } from "@/lib/format";
import type { Message } from "@/lib/types";
import MessageStatusTicks from "./MessageStatusTicks";

interface Props {
  message: Message;
  isOwn: boolean;
  showSender: boolean;
  senderName?: string;
  senderColor?: string;
  replyToMessage?: Message | null;
  replyToSenderName?: string;
  onReply: () => void;
  onDelete: () => void;
  onReact: (emoji: string) => void;
  currentUserId: string;
}

function attachmentSrc(url: string) {
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

export default function MessageBubble({
  message,
  isOwn,
  showSender,
  senderName,
  senderColor,
  replyToMessage,
  replyToSenderName,
  onReply,
  onDelete,
  onReact,
  currentUserId,
}: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  if (message.is_system) {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-[var(--color-text-secondary)] bg-[var(--color-bg-tertiary)] px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  const myReaction = message.reactions.find((r) => r.user_id === currentUserId);
  const reactionCounts = message.reactions.reduce<Record<string, number>>((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className={`group flex flex-col ${isOwn ? "items-end" : "items-start"} px-4 sm:px-8 mb-0.5`}>
      {showSender && !isOwn && (
        <span className="text-xs font-semibold ml-1 mb-0.5" style={{ color: senderColor }}>
          {senderName}
        </span>
      )}
      <div className={`flex items-center gap-1.5 max-w-[75%] ${isOwn ? "flex-row-reverse" : ""}`}>
        <div className="relative">
          <div
            onDoubleClick={() => onReact("❤️")}
            className={`relative rounded-2xl px-3.5 py-2 ${
              isOwn
                ? "bg-[var(--color-bubble-out)] text-white rounded-br-md"
                : "bg-[var(--color-bubble-in)] text-[var(--color-text-primary)] rounded-bl-md"
            }`}
          >
            {message.is_deleted ? (
              <p className="text-sm italic opacity-70 flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                </svg>
                This message was deleted
              </p>
            ) : (
              <>
                {replyToMessage && (
                  <div
                    className={`mb-1.5 rounded-lg px-2.5 py-1.5 border-l-2 text-xs ${
                      isOwn
                        ? "bg-white/15 border-white/60"
                        : "bg-black/5 dark:bg-white/10 border-[var(--color-signal-blue)]"
                    }`}
                  >
                    <p className="font-semibold opacity-90">{replyToSenderName}</p>
                    <p className="opacity-75 truncate">
                      {replyToMessage.is_deleted
                        ? "This message was deleted"
                        : replyToMessage.content || (replyToMessage.attachment_url ? "📎 Attachment" : "")}
                    </p>
                  </div>
                )}
                {message.attachment_url && message.attachment_type === "image" && (
                  <a href={attachmentSrc(message.attachment_url)} target="_blank" rel="noreferrer">
                    <Image
                      src={attachmentSrc(message.attachment_url)}
                      alt={message.attachment_name || "attachment"}
                      width={280}
                      height={200}
                      unoptimized
                      className="rounded-lg mb-1.5 max-w-full h-auto object-cover"
                    />
                  </a>
                )}
                {message.attachment_url && message.attachment_type !== "image" && (
                  <a
                    href={attachmentSrc(message.attachment_url)}
                    target="_blank"
                    rel="noreferrer"
                    className={`flex items-center gap-2 mb-1.5 rounded-lg px-2.5 py-2 text-xs ${
                      isOwn ? "bg-white/15" : "bg-black/5 dark:bg-white/10"
                    }`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                      <path d="M13 2v7h7" />
                    </svg>
                    <span className="truncate">{message.attachment_name || "Attachment"}</span>
                  </a>
                )}
                {message.content && (
                  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                )}
              </>
            )}
            <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? "justify-end" : "justify-end"}`}>
              <span className={`text-[10px] ${isOwn ? "text-white/70" : "text-[var(--color-text-secondary)]"}`}>
                {formatTime(message.created_at)}
              </span>
              {isOwn && <MessageStatusTicks status={message.status} />}
            </div>
          </div>

          {Object.keys(reactionCounts).length > 0 && (
            <div className={`flex gap-0.5 -mt-2 ${isOwn ? "justify-end mr-1" : "ml-1"}`}>
              <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-full px-1.5 py-0.5 text-[11px] flex items-center gap-0.5 shadow-sm">
                {Object.entries(reactionCounts).map(([emoji, count]) => (
                  <span key={emoji}>
                    {emoji}
                    {count > 1 ? count : ""}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {!message.is_deleted && (
          <div className="opacity-0 group-hover:opacity-100 transition flex items-center gap-0.5 relative">
            <button
              onClick={() => setShowPicker((s) => !s)}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]"
              title="React"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
            </button>
            <button
              onClick={onReply}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]"
              title="Reply"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 17 4 12 9 7" />
                <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
              </svg>
            </button>
            {isOwn && (
              <button
                onClick={() => setShowMenu((s) => !s)}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]"
                title="More"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="5" cy="12" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="19" cy="12" r="1.5" />
                </svg>
              </button>
            )}

            {showPicker && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowPicker(false)} />
                <div
                  className={`absolute bottom-9 z-20 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-full shadow-lg px-2 py-1.5 flex gap-1 animate-fade-in-up ${
                    isOwn ? "right-0" : "left-0"
                  }`}
                >
                  {REACTION_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        onReact(emoji);
                        setShowPicker(false);
                      }}
                      className={`text-lg hover:scale-125 transition ${myReaction?.emoji === emoji ? "scale-125" : ""}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </>
            )}

            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div
                  className={`absolute bottom-9 z-20 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl shadow-lg py-1 w-36 animate-fade-in-up ${
                    isOwn ? "right-0" : "left-0"
                  }`}
                >
                  <button
                    onClick={() => {
                      onDelete();
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-sm text-red-500 hover:bg-[var(--color-bg-tertiary)]"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
