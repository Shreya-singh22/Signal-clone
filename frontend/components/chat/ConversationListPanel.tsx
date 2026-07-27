"use client";

import { useMemo, useState } from "react";
import Avatar from "@/components/Avatar";
import { useApp } from "@/lib/store";
import ConversationListItem from "./ConversationListItem";

interface Props {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onNewGroup: () => void;
  onAddContact: () => void;
}

export default function ConversationListPanel({
  selectedId,
  onSelect,
  onNewChat,
  onNewGroup,
  onAddContact,
}: Props) {
  const { user, conversations, contacts, createDirect, pushToast } = useApp();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [view, setView] = useState<"chats" | "archived">("chats");
  const [startingContactId, setStartingContactId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = conversations.filter((c) => (view === "archived" ? c.archived : !c.archived));
    if (filter === "unread") list = list.filter((c) => c.unread_count > 0 || c.marked_unread);
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
    // Pinned conversations float to the top; the array coming in is already
    // most-recent-first, and Array.prototype.sort is stable, so that order
    // survives within each group.
    return [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned));
  }, [conversations, filter, query, view]);

  // Signal splits the default chat list into a "Pinned" section and a
  // "Chats" section (with headers) whenever there's at least one pinned
  // conversation. Search results and the Archived view stay as one flat
  // list — sectioning only matters for the main, unfiltered list.
  const showSections = view === "chats" && !query.trim() && filtered.some((c) => c.pinned);
  const pinnedItems = showSections ? filtered.filter((c) => c.pinned) : [];
  const restItems = showSections ? filtered.filter((c) => !c.pinned) : filtered;

  // Contacts you haven't started a direct conversation with yet, matching the search —
  // surfaces people from your address book, not just existing chats.
  const matchingContacts = useMemo(() => {
    if (!query.trim() || !user || view !== "chats") return [];
    const q = query.trim().toLowerCase();
    const existingDirectUserIds = new Set(
      conversations
        .filter((c) => c.type === "direct")
        .map((c) => c.participants.find((p) => p.user.id !== user.id)?.user.id)
    );
    return contacts.filter(
      (c) =>
        !existingDirectUserIds.has(c.user.id) &&
        (c.user.display_name.toLowerCase().includes(q) || c.user.username.toLowerCase().includes(q))
    );
  }, [contacts, query, conversations, user, view]);

  async function startChatWithContact(contactUserId: string) {
    setStartingContactId(contactUserId);
    try {
      const conv = await createDirect(contactUserId);
      onSelect(conv.id);
      setQuery("");
    } catch {
      pushToast("Couldn't start chat");
    } finally {
      setStartingContactId(null);
    }
  }

  if (!user) return null;

  return (
    <div className="flex flex-col w-full md:w-[360px] shrink-0 border-r border-[var(--color-border)] bg-[var(--color-bg)] h-full min-h-0">
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
        {view === "archived" ? (
          <button
            onClick={() => setView("chats")}
            className="flex items-center gap-1.5 text-xl font-bold text-[var(--color-text-primary)]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Archived Chats
          </button>
        ) : (
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Chats</h1>
        )}
        <div className="flex items-center gap-1 shrink-0">
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="w-11 h-11 md:w-9 md:h-9 rounded-full flex items-center justify-center hover:bg-[var(--color-bg-tertiary)] transition text-[var(--color-text-secondary)]"
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
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onAddContact();
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-bg-tertiary)] transition"
                  >
                    New contact
                  </button>
                </div>
              </>
            )}
          </div>

          {view === "chats" && (
            <div className="relative">
              <button
                onClick={() => setMoreMenuOpen((o) => !o)}
                className="w-11 h-11 md:w-9 md:h-9 rounded-full flex items-center justify-center hover:bg-[var(--color-bg-tertiary)] transition text-[var(--color-text-secondary)]"
                title="More"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="5" cy="12" r="1.8" />
                  <circle cx="12" cy="12" r="1.8" />
                  <circle cx="19" cy="12" r="1.8" />
                </svg>
              </button>
              {moreMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMoreMenuOpen(false)} />
                  <div className="absolute right-0 top-11 z-20 w-56 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl shadow-lg py-1.5 animate-fade-in-up">
                    <button
                      onClick={() => {
                        setMoreMenuOpen(false);
                        setView("archived");
                      }}
                      className="w-full flex items-center gap-2.5 text-left px-4 py-2 text-sm hover:bg-[var(--color-bg-tertiary)] transition"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="4" width="20" height="5" rx="1" />
                        <path d="M4 9v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9" />
                        <path d="M10 13h4" />
                      </svg>
                      View Archive
                    </button>
                    <button
                      onClick={() => {
                        setMoreMenuOpen(false);
                        pushToast("Chat folders coming soon", "Organize chats into custom folders — not in this demo yet.");
                      }}
                      className="w-full flex items-center gap-2.5 text-left px-4 py-2 text-sm hover:bg-[var(--color-bg-tertiary)] transition"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
                        <path d="M12 11v4" />
                        <path d="M10 13h4" />
                      </svg>
                      Add chat folder
                    </button>
                    <button
                      onClick={() => {
                        setMoreMenuOpen(false);
                        pushToast("Notification profiles coming soon", "Scheduled do-not-disturb profiles aren't in this demo yet.");
                      }}
                      className="w-full flex items-center gap-2.5 text-left px-4 py-2 text-sm hover:bg-[var(--color-bg-tertiary)] transition"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
                      </svg>
                      Notification profile
                    </button>
                  </div>
                </>
              )}
            </div>
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
        {filtered.length === 0 && matchingContacts.length === 0 ? (
          <div className="text-center text-sm text-[var(--color-text-secondary)] mt-10 px-6">
            {view === "archived"
              ? "No archived chats."
              : query
                ? "No chats or contacts match your search."
                : "No conversations yet. Start one!"}
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {showSections ? (
              <>
                <p className="text-sm font-semibold text-[var(--color-text-primary)] px-3 pt-2 pb-1">
                  Pinned
                </p>
                {pinnedItems.map((c) => (
                  <ConversationListItem
                    key={c.id}
                    conversation={c}
                    currentUser={user}
                    active={c.id === selectedId}
                    onClick={() => onSelect(c.id)}
                    inPinnedSection
                  />
                ))}
                {restItems.length > 0 && (
                  <p className="text-sm font-semibold text-[var(--color-text-primary)] px-3 pt-3 pb-1">
                    Chats
                  </p>
                )}
                {restItems.map((c) => (
                  <ConversationListItem
                    key={c.id}
                    conversation={c}
                    currentUser={user}
                    active={c.id === selectedId}
                    onClick={() => onSelect(c.id)}
                  />
                ))}
              </>
            ) : (
              filtered.map((c) => (
                <ConversationListItem
                  key={c.id}
                  conversation={c}
                  currentUser={user}
                  active={c.id === selectedId}
                  onClick={() => onSelect(c.id)}
                />
              ))
            )}

            {matchingContacts.length > 0 && (
              <>
                <p className="text-xs font-medium text-[var(--color-text-secondary)] px-3 pt-3 pb-1">
                  Contacts
                </p>
                {matchingContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => startChatWithContact(contact.user.id)}
                    disabled={startingContactId === contact.user.id}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition hover:bg-[var(--color-bg-tertiary)] disabled:opacity-60"
                  >
                    <Avatar
                      name={contact.user.display_name}
                      color={contact.user.avatar_color}
                      emoji={contact.user.avatar_emoji}
                      size={48}
                      showPresence
                      online={contact.user.is_online}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                        {contact.user.display_name}
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)] truncate">
                        @{contact.user.username}
                      </p>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
