"use client";

import { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import Modal from "@/components/Modal";
import { api, ApiError } from "@/lib/api";
import { useApp } from "@/lib/store";
import type { User } from "@/lib/types";

interface Props {
  onClose: () => void;
  onStarted: (conversationId: string) => void;
}

export default function NewChatModal({ onClose, onStarted }: Props) {
  const { contacts, createDirect, addContact, pushToast } = useApp();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.searchUsers(query.trim());
        setResults(res);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  async function startChat(u: User) {
    setBusyId(u.id);
    try {
      addContact({ username: u.username }).catch(() => {});
      const conv = await createDirect(u.id);
      onStarted(conv.id);
      onClose();
    } catch (err) {
      pushToast("Couldn't start chat", err instanceof ApiError ? err.message : undefined);
    } finally {
      setBusyId(null);
    }
  }

  const contactUsers = contacts.map((c) => c.user);
  const shown = query.trim() ? results : contactUsers;

  return (
    <Modal title="New message" onClose={onClose}>
      <div className="flex items-center gap-2 bg-[var(--color-bg-tertiary)] rounded-lg px-3 py-2 mb-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-text-secondary)] shrink-0">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, username or phone"
          className="bg-transparent text-sm outline-none flex-1 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]"
        />
      </div>

      {!query.trim() && (
        <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 px-1">Your contacts</p>
      )}
      {searching && <p className="text-sm text-[var(--color-text-secondary)] px-1">Searching…</p>}
      {!searching && shown.length === 0 && (
        <p className="text-sm text-[var(--color-text-secondary)] px-1 py-4 text-center">
          {query.trim() ? "No one found." : "No contacts yet — search to find people."}
        </p>
      )}
      <div className="flex flex-col gap-0.5 max-h-80 overflow-y-auto">
        {shown.map((u) => (
          <button
            key={u.id}
            onClick={() => startChat(u)}
            disabled={busyId === u.id}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition text-left disabled:opacity-60"
          >
            <Avatar name={u.display_name} color={u.avatar_color} emoji={u.avatar_emoji} size={40} showPresence online={u.is_online} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{u.display_name}</p>
              <p className="text-xs text-[var(--color-text-secondary)] truncate">@{u.username}</p>
            </div>
          </button>
        ))}
      </div>
    </Modal>
  );
}
