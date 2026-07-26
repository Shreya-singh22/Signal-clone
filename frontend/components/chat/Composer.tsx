"use client";

import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { REACTION_EMOJIS } from "@/lib/format";
import type { Message } from "@/lib/types";

interface PendingAttachment {
  file: File;
  previewUrl: string | null;
  isImage: boolean;
}

const QUICK_EMOJIS = ["😀", "😂", "😍", "👍", "🙏", "🎉", "😢", "😮", "🔥", "❤️", ...REACTION_EMOJIS].filter(
  (v, i, arr) => arr.indexOf(v) === i
);

interface Props {
  replyTo: Message | null;
  replyToSenderName?: string;
  onCancelReply: () => void;
  editingMessage: Message | null;
  onCancelEdit: () => void;
  onSaveEdit: (content: string) => void;
  onSend: (
    content: string,
    opts?: { attachment_url?: string; attachment_type?: string; attachment_name?: string }
  ) => void;
  onTyping: () => void;
  onStopTyping: () => void;
  pushToast: (title: string, body?: string) => void;
}

export default function Composer({
  replyTo,
  replyToSenderName,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  onSaveEdit,
  onSend,
  onTyping,
  onStopTyping,
  pushToast,
}: Props) {
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [lastEditingId, setLastEditingId] = useState<string | null>(null);
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditing = !!editingMessage;

  useEffect(() => {
    return () => {
      if (pendingAttachment?.previewUrl) URL.revokeObjectURL(pendingAttachment.previewUrl);
    };
  }, [pendingAttachment]);

  // Adjust the draft text when a *different* message enters edit mode — done during
  // render (React's recommended pattern for this) rather than in an effect, since
  // Composer stays mounted across edits instead of remounting per message.
  if (editingMessage && editingMessage.id !== lastEditingId) {
    setLastEditingId(editingMessage.id);
    setText(editingMessage.content || "");
  } else if (!editingMessage && lastEditingId !== null) {
    setLastEditingId(null);
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = text.trim();

    if (isEditing) {
      if (!trimmed) return;
      onSaveEdit(trimmed);
      setText("");
      onStopTyping();
      return;
    }

    if (pendingAttachment) {
      setUploading(true);
      try {
        const res = await api.upload(pendingAttachment.file);
        onSend(trimmed, { attachment_url: res.url, attachment_type: res.type, attachment_name: res.name });
        if (pendingAttachment.previewUrl) URL.revokeObjectURL(pendingAttachment.previewUrl);
        setPendingAttachment(null);
        setText("");
        onStopTyping();
      } catch (err) {
        pushToast("Upload failed", err instanceof ApiError ? err.message : "Please try a different file");
      } finally {
        setUploading(false);
      }
      return;
    }

    if (!trimmed) return;
    onSend(trimmed);
    setText("");
    onStopTyping();
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    setPendingAttachment({
      file,
      previewUrl: isImage ? URL.createObjectURL(file) : null,
      isImage,
    });
  }

  function cancelAttachment() {
    if (pendingAttachment?.previewUrl) URL.revokeObjectURL(pendingAttachment.previewUrl);
    setPendingAttachment(null);
  }

  return (
    <div className="border-t border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
      {isEditing && (
        <div className="flex items-center justify-between bg-[var(--color-bg-tertiary)] rounded-lg px-3 py-2 mb-2">
          <div className="min-w-0 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-signal-blue)" strokeWidth="2" className="shrink-0">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
            </svg>
            <p className="text-xs font-semibold text-[var(--color-signal-blue)]">Editing message</p>
          </div>
          <button
            onClick={() => {
              onCancelEdit();
              setText("");
            }}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] shrink-0 ml-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      {!isEditing && replyTo && (
        <div className="flex items-center justify-between bg-[var(--color-bg-tertiary)] rounded-lg px-3 py-2 mb-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[var(--color-signal-blue)]">
              Replying to {replyToSenderName}
            </p>
            <p className="text-xs text-[var(--color-text-secondary)] truncate">
              {replyTo.content || (replyTo.attachment_url ? "📎 Attachment" : "")}
            </p>
          </div>
          <button
            onClick={onCancelReply}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] shrink-0 ml-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      {!isEditing && pendingAttachment && (
        <div className="flex items-center justify-between bg-[var(--color-bg-tertiary)] rounded-lg px-3 py-2 mb-2">
          <div className="min-w-0 flex items-center gap-3">
            {pendingAttachment.isImage && pendingAttachment.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- local blob preview, no next/image loader needed
              <img
                src={pendingAttachment.previewUrl}
                alt="Attachment preview"
                className="w-12 h-12 rounded-lg object-cover shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-black/10 dark:bg-white/10 flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                  <path d="M13 2v7h7" />
                </svg>
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--color-signal-blue)]">Ready to send</p>
              <p className="text-xs text-[var(--color-text-secondary)] truncate">{pendingAttachment.file.name}</p>
            </div>
          </div>
          <button
            onClick={cancelAttachment}
            disabled={uploading}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] shrink-0 ml-2 disabled:opacity-40"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFile} />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || isEditing || !!pendingAttachment}
          title="Attach file"
          className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] transition disabled:opacity-30"
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>

        <div className="relative flex-1">
          <div className="flex items-end gap-1 bg-[var(--color-bg-tertiary)] rounded-2xl px-3 py-1.5">
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (e.target.value.trim()) onTyping();
                else onStopTyping();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              rows={1}
              placeholder={uploading ? "Uploading…" : pendingAttachment ? "Add a caption…" : "Type a message"}
              disabled={uploading}
              className="flex-1 resize-none bg-transparent text-sm outline-none py-1.5 max-h-32 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]"
              style={{ minHeight: "22px" }}
            />
            <button
              type="button"
              onClick={() => setShowEmoji((s) => !s)}
              className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-black/5 dark:hover:bg-white/10 transition mb-0.5"
              title="Emoji"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
            </button>
          </div>
          {showEmoji && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowEmoji(false)} />
              <div className="absolute bottom-12 right-0 z-20 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl shadow-lg p-2 grid grid-cols-6 gap-1 w-56 animate-fade-in-up">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      setText((t) => t + emoji);
                      setShowEmoji(false);
                    }}
                    className="text-xl hover:bg-[var(--color-bg-tertiary)] rounded-lg p-1"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          type="submit"
          disabled={uploading || (!text.trim() && !pendingAttachment)}
          className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-[var(--color-signal-blue)] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--color-signal-blue-dark)] transition"
          title={isEditing ? "Save" : "Send"}
        >
          {isEditing ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
}
