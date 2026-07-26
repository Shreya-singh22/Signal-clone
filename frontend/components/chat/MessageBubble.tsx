"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { API_URL } from "@/lib/api";
import { formatTime, REACTION_EMOJIS } from "@/lib/format";
import type { Message } from "@/lib/types";
import MessageStatusTicks from "./MessageStatusTicks";

const pickerVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 6 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 320, damping: 28, mass: 1, staggerChildren: 0.025 },
  },
  exit: { opacity: 0, scale: 0.95, y: 4, transition: { duration: 0.1 } },
};

const emojiItemVariants = {
  hidden: { opacity: 0, scale: 0.3, y: 4 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 500, damping: 15 } },
};

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
  onEdit: () => void;
  onForward: () => void;
  onPin: () => void;
  onInfo: () => void;
  onEnterSelectMode: () => void;
  onJumpToReplied: (messageId: string) => void;
  currentUserId: string;
  selectMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
}

function attachmentSrc(url: string) {
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

const EMOJI_ONLY_REGEX = /^(\p{Extended_Pictographic}(\u{FE0F})?|\u{200D})+$/u;

function isStickerContent(content?: string | null): boolean {
  if (!content) return false;
  const trimmed = content.trim();
  if (!trimmed || !EMOJI_ONLY_REGEX.test(trimmed)) return false;
  return [...trimmed].length <= 6;
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
  onEdit,
  onForward,
  onPin,
  onInfo,
  onEnterSelectMode,
  onJumpToReplied,
  currentUserId,
  selectMode,
  isSelected,
  onToggleSelect,
}: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [justReacted, setJustReacted] = useState(false);
  const [justDissolved, setJustDissolved] = useState(false);
  const prevDeletedRef = useRef(message.is_deleted);

  // Plays a collapse+fade once when a message transitions to deleted — whether from
  // a manual delete or a disappearing-message timer expiring while the chat is open.
  useEffect(() => {
    if (!prevDeletedRef.current && message.is_deleted) {
      setJustDissolved(true);
      const t = window.setTimeout(() => setJustDissolved(false), 500);
      prevDeletedRef.current = message.is_deleted;
      return () => window.clearTimeout(t);
    }
    prevDeletedRef.current = message.is_deleted;
  }, [message.is_deleted]);

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
  const hasReactions = Object.keys(reactionCounts).length > 0;
  const isPinned = !!message.pinned_at;
  // A message that's just one-or-a-few emoji (a "sticker" pick, or any lone
  // emoji someone sends) renders big with no bubble chrome — same convention
  // Signal/WhatsApp/iMessage use, and how our sticker picker's sends read as
  // stickers rather than plain text bubbles.
  const isSticker =
    !message.is_deleted &&
    !message.attachment_url &&
    !replyToMessage &&
    !message.is_forwarded &&
    isStickerContent(message.content);

  async function copyText() {
    if (message.content) {
      try {
        await navigator.clipboard.writeText(message.content);
      } catch {
        // clipboard permission denied — nothing more we can do here
      }
    }
  }

  function handleBubbleClick() {
    if (selectMode) onToggleSelect();
  }

  function handleDoubleClick() {
    if (selectMode) return;
    onReact("❤️");
    setJustReacted(true);
    window.setTimeout(() => setJustReacted(false), 220);
  }

  return (
    <div
      className={`${justDissolved ? "animate-dissolve-out" : "animate-message-in"} group flex flex-col ${
        isOwn ? "items-end" : "items-start"
      } px-4 sm:px-8 ${hasReactions ? "mb-3" : "mb-0.5"}`}
    >
      {showSender && !isOwn && (
        <span className="text-xs font-semibold ml-1 mb-0.5" style={{ color: senderColor }}>
          {senderName}
        </span>
      )}
      <div className={`flex items-center gap-1.5 max-w-[75%] ${isOwn ? "flex-row-reverse" : ""}`}>
        {selectMode && !message.is_deleted && (
          <button
            onClick={onToggleSelect}
            className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition ${
              isSelected ? "bg-[var(--color-signal-blue)] border-[var(--color-signal-blue)]" : "border-[var(--color-border)]"
            }`}
          >
            {isSelected && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
        )}
        <div className="relative">
          <div
            onDoubleClick={handleDoubleClick}
            onClick={handleBubbleClick}
            className={`relative ${isSticker ? "px-1 py-1 bg-transparent" : "rounded-2xl px-3.5 py-2"} ${
              selectMode ? "cursor-pointer" : ""
            } ${justReacted ? "animate-bubble-pop" : ""} ${message.status === "failed" ? "animate-shake" : ""} ${
              isSticker
                ? "text-[var(--color-text-primary)]"
                : isOwn
                  ? "bg-[var(--color-bubble-out)] text-white rounded-br-md"
                  : "bg-[var(--color-bubble-in)] text-[var(--color-text-primary)] rounded-bl-md"
            } ${isSelected ? "ring-2 ring-[var(--color-signal-blue)]" : ""}`}
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
                {message.is_forwarded && (
                  <p
                    className={`flex items-center gap-1 text-xs italic mb-1 ${
                      isOwn ? "text-white/70" : "text-[var(--color-text-secondary)]"
                    }`}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="15 17 20 12 15 7" />
                      <path d="M4 18v-2a4 4 0 0 1 4-4h12" />
                    </svg>
                    Forwarded
                  </p>
                )}
                {replyToMessage && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onJumpToReplied(replyToMessage.id);
                    }}
                    className={`block w-full text-left mb-1.5 rounded-lg px-2.5 py-1.5 border-l-2 text-xs transition hover:brightness-95 ${
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
                  </button>
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
                  <p
                    className={
                      isSticker
                        ? "text-6xl leading-none py-1"
                        : "text-sm whitespace-pre-wrap break-words"
                    }
                  >
                    {message.content}
                  </p>
                )}
              </>
            )}
            <div className={`flex items-center gap-1 mt-0.5 justify-end ${isSticker ? "pr-1" : ""}`}>
              {isPinned && (
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className={isOwn && !isSticker ? "text-white/70" : "text-[var(--color-text-secondary)]"}
                >
                  <path d="M16 3l5 5-5.5 2L13 13l-2 8-2-2 3-8-3.5-3.5L3 10l5-5 3.5 3.5L16 3z" />
                </svg>
              )}
              {message.is_edited && !message.is_deleted && (
                <span
                  className={`text-[10px] italic ${
                    isOwn && !isSticker ? "text-white/70" : "text-[var(--color-text-secondary)]"
                  }`}
                >
                  edited
                </span>
              )}
              <span
                className={`text-[10px] ${isOwn && !isSticker ? "text-white/70" : "text-[var(--color-text-secondary)]"}`}
              >
                {formatTime(message.created_at)}
              </span>
              {isOwn && <MessageStatusTicks status={message.status} />}
            </div>
          </div>

          {Object.keys(reactionCounts).length > 0 && (
            <div
              className={`animate-reaction-pop absolute -bottom-2 flex items-center gap-0.5 bg-[var(--color-bg-secondary)] rounded-full pl-1 pr-1 py-0.5 shadow-md ${
                isOwn ? "right-1" : "left-1"
              }`}
            >
              {Object.entries(reactionCounts).map(([emoji, count]) => (
                <span key={emoji} className="flex items-center gap-0.5 leading-none">
                  <span className="text-xs leading-none">{emoji}</span>
                  {count > 1 && (
                    <span className="text-[9px] font-medium leading-none text-[var(--color-text-secondary)]">
                      {count}
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>

        {!message.is_deleted && !selectMode && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 ease-out flex items-center gap-0.5 relative">
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

            <AnimatePresence>
              {showPicker && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowPicker(false)} />
                  <motion.div
                    variants={pickerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className={`absolute bottom-9 z-20 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-full shadow-lg px-2 py-1.5 flex gap-1 ${
                      isOwn ? "right-0" : "left-0"
                    }`}
                  >
                    {REACTION_EMOJIS.map((emoji) => (
                      <motion.button
                        key={emoji}
                        variants={emojiItemVariants}
                        whileHover={{ scale: 1.25 }}
                        whileTap={{ scale: 1.45 }}
                        onClick={() => {
                          onReact(emoji);
                          setShowPicker(false);
                        }}
                        className={`text-lg ${myReaction?.emoji === emoji ? "scale-125" : ""}`}
                      >
                        {emoji}
                      </motion.button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div
                  className={`absolute bottom-9 z-20 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl shadow-lg py-1.5 w-44 animate-fade-in-up ${
                    isOwn ? "right-0" : "left-0"
                  }`}
                >
                  <MenuItem
                    onClick={() => {
                      onForward();
                      setShowMenu(false);
                    }}
                    label="Forward"
                    icon={
                      <>
                        <polyline points="15 17 20 12 15 7" />
                        <path d="M4 18v-2a4 4 0 0 1 4-4h12" />
                      </>
                    }
                  />
                  {isOwn && !message.attachment_url && (
                    <MenuItem
                      onClick={() => {
                        onEdit();
                        setShowMenu(false);
                      }}
                      label="Edit"
                      icon={
                        <>
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
                        </>
                      }
                    />
                  )}
                  <MenuItem
                    onClick={() => {
                      onEnterSelectMode();
                      setShowMenu(false);
                    }}
                    label="Select"
                    icon={
                      <>
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="8 12 11 15 16 9" />
                      </>
                    }
                  />
                  {message.content && (
                    <MenuItem
                      onClick={() => {
                        copyText();
                        setShowMenu(false);
                      }}
                      label="Copy text"
                      icon={
                        <>
                          <rect x="9" y="9" width="11" height="11" rx="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </>
                      }
                    />
                  )}
                  <MenuItem
                    onClick={() => {
                      onPin();
                      setShowMenu(false);
                    }}
                    label={isPinned ? "Unpin" : "Pin"}
                    icon={<path d="M16 3l5 5-5.5 2L13 13l-2 8-2-2 3-8-3.5-3.5L3 10l5-5 3.5 3.5L16 3z" />}
                  />
                  <MenuItem
                    onClick={() => {
                      onInfo();
                      setShowMenu(false);
                    }}
                    label="Info"
                    icon={
                      <>
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 16v-4" />
                        <path d="M12 8h.01" />
                      </>
                    }
                  />
                  {isOwn && (
                    <MenuItem
                      onClick={() => {
                        onDelete();
                        setShowMenu(false);
                      }}
                      label="Delete"
                      danger
                      icon={
                        <>
                          <path d="M3 6h18" />
                          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                        </>
                      }
                    />
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MenuItem({
  onClick,
  label,
  icon,
  danger,
}: {
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 text-left px-3.5 py-1.5 text-sm hover:bg-[var(--color-bg-tertiary)] transition ${
        danger ? "text-red-500" : "text-[var(--color-text-primary)]"
      }`}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        {icon}
      </svg>
      {label}
    </button>
  );
}
