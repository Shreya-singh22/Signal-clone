"use client";

import { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import Modal from "@/components/Modal";
import { api, ApiError } from "@/lib/api";
import { useApp } from "@/lib/store";
import type { User } from "@/lib/types";

interface Props {
  onClose: () => void;
  onCreated: (conversationId: string) => void;
}

export default function NewGroupModal({ onClose, onCreated }: Props) {
  const { contacts, createGroup, pushToast } = useApp();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [selected, setSelected] = useState<Map<string, User>>(new Map());
  const [name, setName] = useState("");
  const [step, setStep] = useState<"members" | "name">("members");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await api.searchUsers(query.trim());
        setResults(res);
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  function toggle(u: User) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(u.id)) next.delete(u.id);
      else next.set(u.id, u);
      return next;
    });
  }

  async function handleCreate() {
    if (!name.trim() || selected.size === 0) return;
    setCreating(true);
    try {
      const conv = await createGroup(name.trim(), Array.from(selected.keys()));
      onCreated(conv.id);
      onClose();
    } catch (err) {
      pushToast("Couldn't create group", err instanceof ApiError ? err.message : undefined);
    } finally {
      setCreating(false);
    }
  }

  const contactUsers = contacts.map((c) => c.user);
  const shown = query.trim() ? results : contactUsers;

  if (step === "name") {
    return (
      <Modal title="Name your group" onClose={onClose}>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {Array.from(selected.values()).map((u) => (
            <span
              key={u.id}
              className="flex items-center gap-1.5 bg-[var(--color-bg-tertiary)] rounded-full pl-1 pr-2.5 py-1 text-xs"
            >
              <Avatar name={u.display_name} color={u.avatar_color} emoji={u.avatar_emoji} size={20} />
              {u.display_name}
            </span>
          ))}
        </div>
        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
          Group name
        </label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Weekend Trip"
          className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2.5 text-sm outline-none focus:border-[var(--color-signal-blue)] transition mb-4"
        />
        <div className="flex gap-2">
          <button
            onClick={() => setStep("members")}
            className="flex-1 rounded-lg border border-[var(--color-border)] text-sm font-medium py-2.5 hover:bg-[var(--color-bg-tertiary)] transition"
          >
            Back
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || creating}
            className="flex-1 rounded-lg bg-[var(--color-signal-blue)] text-white text-sm font-medium py-2.5 hover:bg-[var(--color-signal-blue-dark)] transition disabled:opacity-60"
          >
            {creating ? "Creating…" : "Create group"}
          </button>
        </div>
      </Modal>
    );
  }

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

      <div className="flex flex-col gap-0.5 max-h-72 overflow-y-auto mb-3">
        {shown.length === 0 && (
          <p className="text-sm text-[var(--color-text-secondary)] px-1 py-4 text-center">No one found.</p>
        )}
        {shown.map((u) => (
          <button
            key={u.id}
            onClick={() => toggle(u)}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition text-left"
          >
            <Avatar name={u.display_name} color={u.avatar_color} emoji={u.avatar_emoji} size={40} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{u.display_name}</p>
              <p className="text-xs text-[var(--color-text-secondary)] truncate">@{u.username}</p>
            </div>
            <span
              className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                selected.has(u.id) ? "bg-[var(--color-signal-blue)] border-[var(--color-signal-blue)]" : "border-[var(--color-border)]"
              }`}
            >
              {selected.has(u.id) && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </span>
          </button>
        ))}
      </div>

      <button
        onClick={() => setStep("name")}
        disabled={selected.size === 0}
        className="w-full rounded-lg bg-[var(--color-signal-blue)] text-white text-sm font-medium py-2.5 hover:bg-[var(--color-signal-blue-dark)] transition disabled:opacity-40"
      >
        Next ({selected.size} selected)
      </button>
    </Modal>
  );
}
