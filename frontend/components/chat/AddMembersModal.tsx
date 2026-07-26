"use client";

import { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import Modal from "@/components/Modal";
import { api, ApiError } from "@/lib/api";
import { useApp } from "@/lib/store";
import type { Conversation, User } from "@/lib/types";

interface Props {
  conversation: Conversation;
  onClose: () => void;
}

export default function AddMembersModal({ conversation, onClose }: Props) {
  const { contacts, addMember, pushToast } = useApp();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const existingIds = new Set(conversation.participants.map((p) => p.user.id));

  useEffect(() => {
    if (!query.trim()) {
      return;
    }
    const t = setTimeout(async () => {
      try {
        setResults(await api.searchUsers(query.trim()));
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  async function handleAdd(u: User) {
    setBusyId(u.id);
    try {
      await addMember(conversation.id, u.id);
      pushToast(`${u.display_name} added`, `Now in ${conversation.name}`);
    } catch (err) {
      pushToast("Couldn't add member", err instanceof ApiError ? err.message : undefined);
    } finally {
      setBusyId(null);
    }
  }

  const pool = (query.trim() ? results : contacts.map((c) => c.user)).filter((u) => !existingIds.has(u.id));

  return (
    <Modal title="Add members" onClose={onClose}>
      <div className="flex items-center gap-2 bg-[var(--color-bg-tertiary)] rounded-lg px-3 py-2 mb-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-text-secondary)] shrink-0">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people to add"
          className="bg-transparent text-sm outline-none flex-1 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]"
        />
      </div>
      <div className="flex flex-col gap-0.5 max-h-80 overflow-y-auto">
        {pool.length === 0 && (
          <p className="text-sm text-[var(--color-text-secondary)] px-1 py-4 text-center">No one to add.</p>
        )}
        {pool.map((u) => (
          <div key={u.id} className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition">
            <Avatar name={u.display_name} color={u.avatar_color} emoji={u.avatar_emoji} size={40} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{u.display_name}</p>
              <p className="text-xs text-[var(--color-text-secondary)] truncate">@{u.username}</p>
            </div>
            <button
              onClick={() => handleAdd(u)}
              disabled={busyId === u.id}
              className="text-xs text-[var(--color-signal-blue)] font-medium disabled:opacity-50"
            >
              Add
            </button>
          </div>
        ))}
      </div>
    </Modal>
  );
}
