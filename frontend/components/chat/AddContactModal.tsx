"use client";

import { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import Modal from "@/components/Modal";
import { api, ApiError } from "@/lib/api";
import { useApp } from "@/lib/store";
import type { User } from "@/lib/types";

interface Props {
  onClose: () => void;
  onMessage: (conversationId: string) => void;
}

export default function AddContactModal({ onClose, onMessage }: Props) {
  const { contacts, addContact, createDirect, pushToast } = useApp();
  const [phone, setPhone] = useState("+91");
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const contactIds = new Set(contacts.map((c) => c.user.id));

  useEffect(() => {
    if (!query.trim()) return;
    const t = setTimeout(async () => {
      try {
        setResults(await api.searchUsers(query.trim()));
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  async function handleAddByPhone(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    setAdding(true);
    try {
      const contact = await addContact({ phone_number: phone.trim() });
      pushToast(`${contact.user.display_name} added`, "Saved to your contacts");
      setPhone("+91");
    } catch (err) {
      pushToast("Couldn't add contact", err instanceof ApiError ? err.message : "No one found with that number");
    } finally {
      setAdding(false);
    }
  }

  async function handleAddUser(u: User) {
    setBusyId(u.id);
    try {
      await addContact({ username: u.username });
      pushToast(`${u.display_name} added`, "Saved to your contacts");
    } catch (err) {
      pushToast("Couldn't add contact", err instanceof ApiError ? err.message : undefined);
    } finally {
      setBusyId(null);
    }
  }

  async function handleMessage(u: User) {
    setBusyId(u.id);
    try {
      addContact({ username: u.username }).catch(() => {});
      const conv = await createDirect(u.id);
      onMessage(conv.id);
      onClose();
    } catch (err) {
      pushToast("Couldn't start chat", err instanceof ApiError ? err.message : undefined);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Modal title="Add a new contact" onClose={onClose}>
      <form onSubmit={handleAddByPhone} className="mb-5">
        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
          Add by phone number
        </label>
        <div className="flex gap-2">
          <input
            autoFocus
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            className="flex-1 rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2.5 text-sm outline-none focus:border-[var(--color-signal-blue)] transition"
          />
          <button
            type="submit"
            disabled={adding || !phone.trim()}
            className="rounded-lg bg-[var(--color-signal-blue)] text-white text-sm font-medium px-4 hover:bg-[var(--color-signal-blue-dark)] transition disabled:opacity-50"
          >
            {adding ? "Adding…" : "Add"}
          </button>
        </div>
        <p className="text-xs text-[var(--color-text-secondary)] mt-1.5">
          They need to already have a Signam account — this demo has no SMS invites.
        </p>
      </form>

      <div className="border-t border-[var(--color-border)] pt-4">
        <div className="flex items-center gap-2 bg-[var(--color-bg-tertiary)] rounded-lg px-3 py-2 mb-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-text-secondary)] shrink-0">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Or search by name / username"
            className="bg-transparent text-sm outline-none flex-1 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]"
          />
        </div>

        <div className="flex flex-col gap-0.5 max-h-64 overflow-y-auto">
          {query.trim() && results.length === 0 && (
            <p className="text-sm text-[var(--color-text-secondary)] px-1 py-3 text-center">No one found.</p>
          )}
          {results.map((u) => (
            <div key={u.id} className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition">
              <Avatar name={u.display_name} color={u.avatar_color} emoji={u.avatar_emoji} size={40} showPresence online={u.is_online} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{u.display_name}</p>
                <p className="text-xs text-[var(--color-text-secondary)] truncate">@{u.username}</p>
              </div>
              {contactIds.has(u.id) ? (
                <button
                  onClick={() => handleMessage(u)}
                  disabled={busyId === u.id}
                  className="text-xs text-[var(--color-signal-blue)] font-medium disabled:opacity-50 shrink-0"
                >
                  Message
                </button>
              ) : (
                <button
                  onClick={() => handleAddUser(u)}
                  disabled={busyId === u.id}
                  className="text-xs text-[var(--color-signal-blue)] font-medium disabled:opacity-50 shrink-0"
                >
                  Add
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
