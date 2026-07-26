"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import ConversationListItem from "./ConversationListItem";

interface Props {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onNewGroup: () => void;
}

export default function ConversationListPanel({ selectedId, onSelect, onNewChat, onNewGroup }: Props) {
  const { user, conversations } = useApp();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [menuOpen, setMenuOpen] = useState(false);

  const filtered = useMemo(() => {
    let list = conversations;
    if (filter === "unread") list = list.filter((c) => c.unread_count > 0);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((c) => {
        if (c.name?.toLowerCase().includes(q)) return true;
        return c.participants.some(
          (p) =>
            p.user.display_name.toLowerCase().includes(q) || p.user.username.toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [conversations, filter, query]);

  if (!user) return null;

  return (
    <div className="flex flex-col w-full sm:w-[360px] shrink-0 border-r border-[var(--color-border)] bg-[var(--color-bg)] h-full">
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Chats</h1>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[var(--color-bg-tertiary)] transition text-[var(--color-text-secondary)]"
            title="New chat"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-11 z-20 w-52 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl shadow-lg py-1.5 animate-fade-in-up">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onNewChat();
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-bg-tertiary)] transition"
                >
                  New message
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onNewGroup();
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-bg-tertiary)] transition"
                >
                  New group
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="px-4 pb-2">
        <div className="flex items-center gap-2 bg-[var(--color-bg-tertiary)] rounded-lg px-3 py-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-text-secondary)] shrink-0">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats and contacts"
            className="bg-transparent text-sm outline-none flex-1 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]"
          />
        </div>
      </div>

      <div className="px-4 pb-2 flex gap-2">
        {(["all", "unread"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full transition ${
              filter === f
                ? "bg-[var(--color-signal-blue)] text-white"
                : "bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:opacity-80"
            }`}
          >
            {f === "all" ? "All" : "Unread"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {filtered.length === 0 ? (
          <div className="text-center text-sm text-[var(--color-text-secondary)] mt-10 px-6">
            {query ? "No chats match your search." : "No conversations yet. Start one!"}
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {filtered.map((c) => (
              <ConversationListItem
                key={c.id}
                conversation={c}
                currentUser={user}
                active={c.id === selectedId}
                onClick={() => onSelect(c.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
