"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import NavRail from "@/components/chat/NavRail";
import ConversationListPanel from "@/components/chat/ConversationListPanel";
import ChatPane from "@/components/chat/ChatPane";
import EmptyState from "@/components/chat/EmptyState";
import NewChatModal from "@/components/chat/NewChatModal";
import NewGroupModal from "@/components/chat/NewGroupModal";
import ChatInfoModal from "@/components/chat/ChatInfoModal";
import AddMembersModal from "@/components/chat/AddMembersModal";
import AddContactModal from "@/components/chat/AddContactModal";
import SettingsPage, { type SettingsPageHandle } from "@/components/chat/SettingsPage";

type ModalState =
  | { type: "none" }
  | { type: "newChat" }
  | { type: "newGroup" }
  | { type: "chatInfo" }
  | { type: "addMembers" }
  | { type: "addContact" };

export default function ChatShell() {
  const { user, authLoading, conversations } = useApp();
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [navTab, setNavTab] = useState<"chats" | "calls" | "stories">("chats");
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [showSettings, setShowSettings] = useState(false);
  const [mobileListVisible, setMobileListVisible] = useState(true);
  const settingsRef = useRef<SettingsPageHandle>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  // Keyboard shortcuts: Cmd/Ctrl+K for a new chat, Cmd/Ctrl+, for settings —
  // matching the conventions of Slack/Discord/most chat apps.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        setModal({ type: "newChat" });
      } else if (e.key === ",") {
        e.preventDefault();
        setShowSettings(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (authLoading || !user) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--color-bg)]">
        <p className="text-sm text-[var(--color-text-secondary)]">Loading…</p>
      </div>
    );
  }

  const selectedConversation = conversations.find((c) => c.id === selectedId) || null;

  function selectConversation(id: string) {
    setSelectedId(id);
    setMobileListVisible(false);
  }

  return (
    <div className="h-full flex">
      <NavRail
        active={navTab}
        onSelect={(t) => {
          if (showSettings) {
            settingsRef.current?.requestLeave(() => {
              setShowSettings(false);
              setNavTab(t);
            });
          } else {
            setNavTab(t);
          }
        }}
        onOpenSettings={() => {
          if (showSettings) {
            settingsRef.current?.requestLeave(() => setShowSettings(false));
          } else {
            setShowSettings(true);
          }
        }}
      />

      {showSettings ? (
        <SettingsPage ref={settingsRef} onClose={() => setShowSettings(false)} />
      ) : navTab !== "chats" ? (
        <div className="flex-1 flex items-center justify-center bg-[var(--color-bg-secondary)] text-center px-6">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] capitalize">{navTab}</h2>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              {navTab === "calls" ? "Voice and video calls are" : "Stories are"} coming soon to Signal.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className={`${mobileListVisible ? "flex" : "hidden"} sm:flex`}>
            <ConversationListPanel
              selectedId={selectedId}
              onSelect={selectConversation}
              onNewChat={() => setModal({ type: "newChat" })}
              onNewGroup={() => setModal({ type: "newGroup" })}
              onAddContact={() => setModal({ type: "addContact" })}
            />
          </div>

          <div className={`${mobileListVisible ? "hidden" : "flex"} sm:flex flex-1 min-w-0`}>
            {selectedConversation ? (
              <div className="flex flex-col flex-1 min-w-0">
                <button
                  onClick={() => setMobileListVisible(true)}
                  className="sm:hidden flex items-center gap-1 text-sm text-[var(--color-signal-blue)] px-4 py-2 border-b border-[var(--color-border)]"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  Chats
                </button>
                <ChatPane
                  key={selectedConversation.id}
                  conversationId={selectedConversation.id}
                  onOpenInfo={() => setModal({ type: "chatInfo" })}
                  onArchived={() => {
                    setSelectedId(null);
                    setMobileListVisible(true);
                  }}
                />
              </div>
            ) : (
              <EmptyState />
            )}
          </div>
        </>
      )}

      {modal.type === "newChat" && (
        <NewChatModal onClose={() => setModal({ type: "none" })} onStarted={selectConversation} />
      )}
      {modal.type === "newGroup" && (
        <NewGroupModal onClose={() => setModal({ type: "none" })} onCreated={selectConversation} />
      )}
      {modal.type === "chatInfo" && selectedConversation && (
        <ChatInfoModal
          conversation={selectedConversation}
          onClose={() => setModal({ type: "none" })}
          onAddMembers={() => setModal({ type: "addMembers" })}
          onLeftOrClosed={() => {
            setModal({ type: "none" });
            setSelectedId(null);
            setMobileListVisible(true);
          }}
        />
      )}
      {modal.type === "addMembers" && selectedConversation && (
        <AddMembersModal conversation={selectedConversation} onClose={() => setModal({ type: "chatInfo" })} />
      )}
      {modal.type === "addContact" && (
        <AddContactModal onClose={() => setModal({ type: "none" })} onMessage={selectConversation} />
      )}
    </div>
  );
}
