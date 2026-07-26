"use client";

import { useState } from "react";
import Avatar from "@/components/Avatar";
import Modal from "@/components/Modal";
import { ApiError, useApp } from "@/lib/store";
import { DISAPPEARING_OPTIONS, formatDisappearingDuration, formatLastSeen } from "@/lib/format";
import type { Conversation } from "@/lib/types";

interface Props {
  conversation: Conversation;
  onClose: () => void;
  onAddMembers: () => void;
  onLeftOrClosed: () => void;
}

export default function ChatInfoModal({ conversation, onClose, onAddMembers, onLeftOrClosed }: Props) {
  const { user, updateConversation, removeMember, pushToast } = useApp();
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(conversation.name || "");
  const [busy, setBusy] = useState(false);

  if (!user) return null;
  const me = conversation.participants.find((p) => p.user.id === user.id);
  const isAdmin = !!me?.is_admin;
  const other =
    conversation.type === "direct"
      ? conversation.participants.find((p) => p.user.id !== user.id)?.user
      : undefined;

  async function saveName() {
    if (!nameDraft.trim() || nameDraft === conversation.name) {
      setEditingName(false);
      return;
    }
    try {
      await updateConversation(conversation.id, { name: nameDraft.trim() });
      setEditingName(false);
    } catch (err) {
      pushToast("Couldn't rename group", err instanceof ApiError ? err.message : undefined);
    }
  }

  async function setDisappearing(seconds: number) {
    try {
      await updateConversation(conversation.id, { disappearing_seconds: seconds });
      pushToast("Disappearing messages updated", formatDisappearingDuration(seconds));
    } catch (err) {
      pushToast("Couldn't update setting", err instanceof ApiError ? err.message : undefined);
    }
  }

  async function handleRemove(userId: string, isSelf: boolean) {
    setBusy(true);
    try {
      await removeMember(conversation.id, userId);
      if (isSelf) onLeftOrClosed();
    } catch (err) {
      pushToast("Action failed", err instanceof ApiError ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={conversation.type === "group" ? "Group info" : "Chat details"} onClose={onClose} width={440}>
      <div className="flex flex-col items-center text-center mb-5">
        <Avatar
          name={conversation.name || "Unknown"}
          color={conversation.avatar_color}
          emoji={conversation.avatar_emoji}
          size={80}
        />
        {conversation.type === "group" ? (
          editingName ? (
            <div className="flex items-center gap-2 mt-3">
              <input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveName()}
                className="text-sm rounded-lg border border-[var(--color-border)] bg-transparent px-2 py-1 outline-none focus:border-[var(--color-signal-blue)]"
              />
              <button onClick={saveName} className="text-xs text-[var(--color-signal-blue)] font-medium">
                Save
              </button>
            </div>
          ) : (
            <button
              onClick={() => isAdmin && setEditingName(true)}
              className="mt-3 text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5"
            >
              {conversation.name}
              {isAdmin && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-text-secondary)]">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
                </svg>
              )}
            </button>
          )
        ) : (
          <>
            <h3 className="mt-3 text-lg font-semibold text-[var(--color-text-primary)]">{other?.display_name}</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">@{other?.username}</p>
            {other?.phone_number && (
              <p className="text-sm text-[var(--color-text-secondary)]">{other.phone_number}</p>
            )}
          </>
        )}
        {conversation.type === "direct" && (
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            {other?.is_online ? "Online" : `Last seen ${other ? formatLastSeen(other.last_seen_at) : ""}`}
          </p>
        )}
        {conversation.type === "direct" && other?.about && (
          <p className="text-sm text-[var(--color-text-secondary)] mt-3 italic">&ldquo;{other.about}&rdquo;</p>
        )}
      </div>

      <div className="border-t border-[var(--color-border)] pt-4 mb-4">
        <p className="text-sm font-medium text-[var(--color-text-primary)] mb-2">Disappearing messages</p>
        <select
          value={conversation.disappearing_seconds}
          onChange={(e) => setDisappearing(Number(e.target.value))}
          disabled={conversation.type === "group" && !isAdmin}
          className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none disabled:opacity-60"
        >
          {DISAPPEARING_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {conversation.type === "group" && (
        <div className="border-t border-[var(--color-border)] pt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-[var(--color-text-primary)]">
              {conversation.participants.length} members
            </p>
            {isAdmin && (
              <button onClick={onAddMembers} className="text-xs text-[var(--color-signal-blue)] font-medium">
                + Add members
              </button>
            )}
          </div>
          <div className="flex flex-col gap-0.5 max-h-52 overflow-y-auto">
            {conversation.participants.map((p) => (
              <div key={p.user.id} className="flex items-center gap-3 px-1 py-1.5">
                <Avatar name={p.user.display_name} color={p.user.avatar_color} emoji={p.user.avatar_emoji} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[var(--color-text-primary)] truncate">
                    {p.user.display_name} {p.user.id === user.id && <span className="text-[var(--color-text-secondary)]">(You)</span>}
                  </p>
                  {p.is_admin && <p className="text-xs text-[var(--color-text-secondary)]">Admin</p>}
                </div>
                {isAdmin && p.user.id !== user.id && (
                  <button
                    disabled={busy}
                    onClick={() => handleRemove(p.user.id, false)}
                    className="text-xs text-red-500 hover:underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            disabled={busy}
            onClick={() => handleRemove(user.id, true)}
            className="w-full mt-4 rounded-lg border border-red-500/30 text-red-500 text-sm font-medium py-2.5 hover:bg-red-500/10 transition disabled:opacity-50"
          >
            Leave group
          </button>
        </div>
      )}
    </Modal>
  );
}
