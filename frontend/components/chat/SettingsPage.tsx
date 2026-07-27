"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import Modal from "@/components/Modal";
import { SettingsGearIcon } from "@/components/chat/NavRail";
import { api } from "@/lib/api";
import { useApp } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import type { Conversation, Message, User } from "@/lib/types";

// The backend's default page size for GET .../messages (see
// backend/app/routers/messages.py) — a page shorter than this means there's
// nothing older left to fetch.
const MESSAGES_PAGE_SIZE = 50;

async function fetchAllMessages(conversationId: string): Promise<Message[]> {
  let all: Message[] = [];
  let before: string | undefined;
  for (;;) {
    const page = await api.listMessages(conversationId, before);
    all = [...page, ...all];
    if (page.length < MESSAGES_PAGE_SIZE) break;
    before = page[0].id;
  }
  return all;
}

/** Calls `onChange` whenever `value` changes (by reference/primitive equality),
 * evaluated during render rather than in a useEffect so the reset is visible
 * on the same paint — the standard React pattern for resetting local draft
 * state when the external value it was seeded from changes underneath it. */
function useSyncedValue<T>(value: T, onChange: (value: T) => void) {
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    onChange(value);
  }
}

function useLocalPref<T>(key: string, defaultValue: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return defaultValue;
    try {
      const raw = window.localStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  function set(v: T) {
    setValue(v);
    try {
      window.localStorage.setItem(key, JSON.stringify(v));
    } catch {
      // ignore quota/availability errors — the pref just won't persist
    }
  }

  return [value, set];
}

const AVATAR_COLORS = ["#2C6BED", "#3AA3E3", "#D0895F", "#6C63C7", "#4CAF7D", "#E0A030", "#E35D6A", "#8854D0"];
const AVATAR_EMOJIS = ["🙂", "😎", "🌟", "🚀", "🎧", "📚", "🌿", "🎨", "🧑‍💻", "🐱", "☕", "⚡"];

type Tab =
  | "profile"
  | "general"
  | "appearance"
  | "chats"
  | "calls"
  | "notifications"
  | "privacy"
  | "data"
  | "backups"
  | "donate";

const NAV_ITEMS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: "general",
    label: "General",
    icon: <SettingsGearIcon size={18} />,
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
    ),
  },
  {
    id: "chats",
    label: "Chats",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    ),
  },
  {
    id: "calls",
    label: "Calls",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    ),
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  {
    id: "privacy",
    label: "Privacy",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="10" width="16" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </svg>
    ),
  },
  {
    id: "data",
    label: "Data usage",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3a9 9 0 0 1 0 18" />
      </svg>
    ),
  },
  {
    id: "backups",
    label: "Backups",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
  },
  {
    id: "donate",
    label: "Donate to Signal",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  // Redundant on mobile, where the back-bar above already names the section.
  return <h2 className="hidden md:block text-center text-sm font-semibold text-[var(--color-text-primary)] mb-6">{children}</h2>;
}

function ComingSoon({ description }: { description: string }) {
  return (
    <div className="flex flex-col items-center text-center py-8 px-4">
      <div className="w-12 h-12 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center mb-3">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-text-secondary)]">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      </div>
      <p className="text-sm text-[var(--color-text-secondary)] mt-1 max-w-xs">{description}</p>
    </div>
  );
}

function SubsectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">{children}</p>;
}

function Divider() {
  return <div className="h-px bg-[var(--color-border)] my-5" />;
}

function CheckboxRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 py-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 shrink-0 accent-[var(--color-signal-blue)]"
      />
      <div>
        <p className="text-sm text-[var(--color-text-primary)]">{label}</p>
        {description && <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{description}</p>}
      </div>
    </label>
  );
}

/** Shell for a settings row with a label/description on the left and a
 * single trailing control on the right — shared by SelectRow, ActionRow, and
 * ToggleRow, which differ only in which control they render. */
function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm text-[var(--color-text-primary)]">{label}</p>
        {description && <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function SelectRow({
  label,
  description,
  value,
  options,
  onChange,
}: {
  label: string;
  description?: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <SettingRow label={label} description={description}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="shrink-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-signal-blue)]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </SettingRow>
  );
}

function ActionRow({
  label,
  description,
  buttonLabel,
  onClick,
  busy,
}: {
  label: string;
  description?: string;
  buttonLabel: string;
  onClick: () => void;
  busy?: boolean;
}) {
  return (
    <SettingRow label={label} description={description}>
      <button
        onClick={onClick}
        disabled={busy}
        className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-full bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-border)] transition disabled:opacity-60"
      >
        {busy ? "Working…" : buttonLabel}
      </button>
    </SettingRow>
  );
}

interface ProfileDraft {
  display_name: string;
  about: string;
  avatar_color: string;
  avatar_emoji: string;
}

function draftFromUser(user: User): ProfileDraft {
  return {
    display_name: user.display_name,
    about: user.about ?? "",
    avatar_color: user.avatar_color,
    avatar_emoji: user.avatar_emoji,
  };
}

function UnsavedChangesDialog({
  onSave,
  onDiscard,
  onCancel,
  saving,
}: {
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <Modal title="Unsaved changes" onClose={onCancel} width={360}>
      <p className="text-sm text-[var(--color-text-secondary)] mb-5">
        You&apos;ve made changes to your profile that haven&apos;t been saved. Do you want to save them?
      </p>
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="text-sm font-medium px-3 py-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] transition"
        >
          Cancel
        </button>
        <button
          onClick={onDiscard}
          className="text-sm font-medium px-3 py-2 rounded-lg text-red-500 hover:bg-red-500/10 transition"
        >
          Discard
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="text-sm font-medium px-4 py-2 rounded-lg bg-[var(--color-signal-blue)] text-white hover:bg-[var(--color-signal-blue-dark)] transition disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </Modal>
  );
}

export interface SettingsPageHandle {
  /** Ask Settings whether it's safe to navigate away. Calls `proceed` immediately
   * if there's nothing unsaved, otherwise prompts and calls it only after the
   * user resolves the prompt (Save or Discard) — never on Cancel. */
  requestLeave: (proceed: () => void) => void;
}

const SettingsPage = forwardRef<SettingsPageHandle, { onClose: () => void }>(function SettingsPage(
  { onClose },
  ref
) {
  const { user, contacts, conversations, updateProfile, updateSettings, unblockUser, logout, pushToast } = useApp();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("profile");
  // Below the tablet breakpoint the nav list and the active section collapse into a
  // single pane (mirroring the chat list/chat-pane pattern) — this tracks which one
  // is showing. Irrelevant at md+, where both panes are always visible side by side.
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [pendingResume, setPendingResume] = useState<(() => void) | null>(null);
  const [saving, setSaving] = useState(false);

  const [draft, setDraft] = useState<ProfileDraft | null>(user ? draftFromUser(user) : null);
  useSyncedValue(user, (u) => setDraft(u ? draftFromUser(u) : null));

  const isDirty =
    tab === "profile" &&
    !!draft &&
    !!user &&
    (draft.display_name !== user.display_name ||
      draft.about !== (user.about ?? "") ||
      draft.avatar_color !== user.avatar_color ||
      draft.avatar_emoji !== user.avatar_emoji);

  useImperativeHandle(ref, () => ({
    requestLeave(proceed: () => void) {
      if (isDirty) {
        setPendingResume(() => proceed);
      } else {
        proceed();
      }
    },
  }));

  if (!user || !draft) return null;

  function requestTabChange(next: Tab) {
    if (isDirty && next !== "profile") {
      setPendingResume(() => () => {
        setTab(next);
        setMobileShowDetail(true);
      });
    } else {
      setTab(next);
      setMobileShowDetail(true);
    }
  }

  async function doLogout() {
    await logout();
    onClose();
    router.replace("/login");
  }

  function handleLogoutClick() {
    if (isDirty) {
      setPendingResume(() => doLogout);
    } else {
      doLogout();
    }
  }

  async function handleSavePending() {
    if (!draft) return;
    setSaving(true);
    try {
      await updateProfile(draft);
      pushToast("Profile updated");
      pendingResume?.();
      setPendingResume(null);
    } catch {
      pushToast("Couldn't save profile");
    } finally {
      setSaving(false);
    }
  }

  function handleDiscardPending() {
    if (!user) return;
    setDraft(draftFromUser(user));
    pendingResume?.();
    setPendingResume(null);
  }

  return (
    <div className="flex-1 flex min-w-0 bg-[var(--color-bg)]">
      {pendingResume && (
        <UnsavedChangesDialog
          saving={saving}
          onSave={handleSavePending}
          onDiscard={handleDiscardPending}
          onCancel={() => setPendingResume(null)}
        />
      )}

      <div
        className={`${mobileShowDetail ? "hidden" : "flex"} md:flex w-full md:w-[300px] shrink-0 flex-col border-r border-[var(--color-border)] overflow-y-auto py-4 min-h-0`}
      >
        <div className="flex items-center gap-2 px-4 mb-3">
          <button
            onClick={onClose}
            className="md:hidden w-11 h-11 -ml-2 shrink-0 flex items-center justify-center rounded-full hover:bg-[var(--color-bg-tertiary)] text-[var(--color-signal-blue)]"
            title="Close settings"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Settings</h1>
        </div>

        <button
          onClick={() => requestTabChange("profile")}
          className={`flex w-[calc(100%-16px)] mx-2 items-center gap-3 rounded-lg px-3 py-3 mb-2 text-left transition ${
            tab === "profile" ? "bg-[var(--color-bg-tertiary)]" : "hover:bg-[var(--color-bg-tertiary)]/60"
          }`}
        >
          <Avatar name={draft.display_name} color={draft.avatar_color} emoji={draft.avatar_emoji} size={40} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">{draft.display_name}</p>
            <p className="text-xs text-[var(--color-text-secondary)] truncate">{user.phone_number}</p>
          </div>
        </button>

        <div className="flex flex-col gap-0.5 px-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => requestTabChange(item.id)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 md:py-2.5 min-h-11 text-sm transition ${
                tab === item.id
                  ? "bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]/60"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}

          <div className="h-px bg-[var(--color-border)] my-2 mx-1" />

          <button
            onClick={handleLogoutClick}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 min-h-11 text-sm text-red-500 hover:bg-red-500/10 transition"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Log out
          </button>
        </div>
      </div>

      <div className={`${mobileShowDetail ? "flex" : "hidden"} md:flex flex-1 flex-col overflow-y-auto min-h-0 min-w-0`}>
        <div className="md:hidden flex items-center gap-2 px-4 py-2.5 border-b border-[var(--color-border)] sticky top-0 bg-[var(--color-bg)] z-10 shrink-0">
          <button
            onClick={() => setMobileShowDetail(false)}
            className="w-11 h-11 -ml-2 shrink-0 flex items-center justify-center rounded-full hover:bg-[var(--color-bg-tertiary)] text-[var(--color-signal-blue)]"
            title="Back to settings"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className="text-base font-semibold text-[var(--color-text-primary)] capitalize">
            {tab === "profile" ? "Profile" : NAV_ITEMS.find((i) => i.id === tab)?.label ?? tab}
          </span>
        </div>
        <div className="max-w-[560px] mx-auto px-4 sm:px-8 py-8 w-full">
          {tab === "profile" && (
            <ProfilePane user={user} draft={draft} onChangeDraft={(patch) => setDraft({ ...draft, ...patch })} />
          )}

          {tab === "general" && (
            <>
              <SectionTitle>General</SectionTitle>
              <ComingSoon description="General settings are coming soon." />
            </>
          )}

          {tab === "appearance" && (
            <>
              <SectionTitle>Appearance</SectionTitle>
              <div className="flex flex-col gap-3">
                <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">Theme</p>
                {(["light", "dark", "system"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition ${
                      theme === t
                        ? "border-[var(--color-signal-blue)] bg-[var(--color-signal-blue)]/10"
                        : "border-[var(--color-border)] hover:bg-[var(--color-bg-tertiary)]"
                    }`}
                  >
                    <span className="capitalize">{t}</span>
                    {theme === t && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-signal-blue)" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}

          {tab === "chats" && (
            <>
              <SectionTitle>Chats</SectionTitle>
              <ChatsTab conversations={conversations} pushToast={pushToast} />
            </>
          )}

          {tab === "calls" && (
            <>
              <SectionTitle>Calls</SectionTitle>
              <ComingSoon description="Voice and video call settings are coming soon." />
            </>
          )}

          {tab === "notifications" && (
            <>
              <SectionTitle>Notifications</SectionTitle>
              <NotificationsTab user={user} updateSettings={updateSettings} pushToast={pushToast} />
            </>
          )}

          {tab === "privacy" && (
            <>
              <SectionTitle>Privacy</SectionTitle>
              <PrivacyTab
                user={user}
                blockedContacts={contacts.filter((c) => c.is_blocked)}
                updateSettings={updateSettings}
                unblockUser={unblockUser}
                pushToast={pushToast}
              />
            </>
          )}

          {tab === "data" && (
            <>
              <SectionTitle>Data usage</SectionTitle>
              <DataUsageTab />
            </>
          )}

          {tab === "backups" && (
            <>
              <SectionTitle>Backups</SectionTitle>
              <ComingSoon description="Chat backups are coming soon." />
            </>
          )}

          {tab === "donate" && (
            <>
              <SectionTitle>Donate to Signal</SectionTitle>
              <ComingSoon description="This is a demo project, not the real Signal — but if you'd like to support the actual Signal Foundation, visit signal.org/donate." />
            </>
          )}
        </div>
      </div>
    </div>
  );
});

export default SettingsPage;

type SettingsPayload = Partial<
  Pick<
    User,
    | "read_receipts_enabled"
    | "typing_indicators_enabled"
    | "notifications_enabled"
    | "notification_preview_enabled"
    | "notification_sound_enabled"
  >
>;

/** Toggles one boolean user setting, reporting a toast on failure — shared by
 * every tab that flips a single `SettingsPayload` field (Privacy, Notifications). */
function makeSettingsToggle(
  updateSettings: (payload: SettingsPayload) => Promise<void>,
  pushToast: (title: string, body?: string) => void
) {
  return async function toggle(field: keyof SettingsPayload, value: boolean) {
    try {
      await updateSettings({ [field]: value });
    } catch {
      pushToast("Couldn't update setting");
    }
  };
}

function EditableRow({
  icon,
  value,
  placeholder,
  onSave,
}: {
  icon: React.ReactNode;
  value: string;
  placeholder: string;
  onSave: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useSyncedValue(value, setDraft);

  function commit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== value) onSave(trimmed);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") inputRef.current?.blur();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className="w-full flex items-center gap-3 rounded-lg px-3 py-3 text-sm bg-[var(--color-bg-tertiary)] outline-none border border-[var(--color-signal-blue)]"
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-left hover:bg-[var(--color-bg-tertiary)] transition"
    >
      <span className="text-[var(--color-text-secondary)] shrink-0">{icon}</span>
      <span className={value ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]"}>
        {value || placeholder}
      </span>
    </button>
  );
}

function ProfilePane({
  user,
  draft,
  onChangeDraft,
}: {
  user: User;
  draft: ProfileDraft;
  onChangeDraft: (patch: Partial<ProfileDraft>) => void;
}) {
  const [editingPhoto, setEditingPhoto] = useState(false);

  return (
    <div>
      <SectionTitle>Profile</SectionTitle>

      <div className="flex flex-col items-center mb-2">
        <button onClick={() => setEditingPhoto((v) => !v)} className="mb-3">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
            style={{ backgroundColor: draft.avatar_color }}
          >
            {draft.avatar_emoji}
          </div>
        </button>
        <button
          onClick={() => setEditingPhoto((v) => !v)}
          className="text-xs font-medium px-3 py-1.5 rounded-full bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-border)] transition"
        >
          Edit photo
        </button>

        {editingPhoto && (
          <div className="flex flex-col items-center gap-2 mt-4">
            <div className="flex justify-center gap-1.5 flex-wrap">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => onChangeDraft({ avatar_color: c })}
                  className={`w-6 h-6 rounded-full ${draft.avatar_color === c ? "ring-2 ring-offset-2 ring-[var(--color-signal-blue)] ring-offset-[var(--color-bg)]" : ""}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex justify-center gap-1.5 flex-wrap max-w-[280px]">
              {AVATAR_EMOJIS.map((em) => (
                <button
                  key={em}
                  onClick={() => onChangeDraft({ avatar_emoji: em })}
                  className={`w-8 h-8 rounded-full text-base flex items-center justify-center hover:bg-[var(--color-bg-tertiary)] ${draft.avatar_emoji === em ? "bg-[var(--color-bg-tertiary)]" : ""}`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6">
        <EditableRow
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          }
          value={draft.display_name}
          placeholder="Your name"
          onSave={(v) => onChangeDraft({ display_name: v })}
        />
        <EditableRow
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            </svg>
          }
          value={draft.about}
          placeholder="About"
          onSave={(v) => onChangeDraft({ about: v })}
        />
      </div>

      <p className="text-xs text-[var(--color-text-secondary)] px-3 mt-2">
        Your profile and changes to it will be visible to people you message, contacts and groups.
      </p>

      <div className="h-px bg-[var(--color-border)] my-5" />

      <div className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm">
        <span className="text-[var(--color-text-secondary)] shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" />
          </svg>
        </span>
        <span className="text-[var(--color-text-primary)]">@{user.username}</span>
      </div>
      <p className="text-xs text-[var(--color-text-secondary)] px-3 mt-2">
        People can now message you using your optional username so you don&apos;t have to give out your phone number.
      </p>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <SettingRow label={label} description={description}>
      <button
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-10 h-6 rounded-full transition ${
          checked ? "bg-[var(--color-signal-blue)]" : "bg-[var(--color-bg-tertiary)]"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </SettingRow>
  );
}

function PrivacyTab({
  user,
  blockedContacts,
  updateSettings,
  unblockUser,
  pushToast,
}: {
  user: User;
  blockedContacts: { id: string; user: User }[];
  updateSettings: (payload: SettingsPayload) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  pushToast: (title: string, body?: string) => void;
}) {
  const toggle = makeSettingsToggle(updateSettings, pushToast);

  return (
    <div className="flex flex-col">
      <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1">
        Messaging
      </p>
      <div className="divide-y divide-[var(--color-border)]">
        <ToggleRow
          label="Read receipts"
          description="See and share when messages have been read. If off, you won't send or see read receipts."
          checked={user.read_receipts_enabled}
          onChange={(v) => toggle("read_receipts_enabled", v)}
        />
        <ToggleRow
          label="Typing indicators"
          description="See and share when you're typing a message."
          checked={user.typing_indicators_enabled}
          onChange={(v) => toggle("typing_indicators_enabled", v)}
        />
      </div>

      <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mt-5 mb-1">
        Blocked contacts
      </p>
      {blockedContacts.length === 0 ? (
        <p className="text-sm text-[var(--color-text-secondary)] py-2">
          No blocked contacts. Block someone from their chat info page.
        </p>
      ) : (
        <div className="flex flex-col gap-0.5">
          {blockedContacts.map((c) => (
            <div key={c.id} className="flex items-center gap-3 py-2">
              <Avatar name={c.user.display_name} color={c.user.avatar_color} emoji={c.user.avatar_emoji} size={36} />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-[var(--color-text-primary)] truncate">{c.user.display_name}</p>
              </div>
              <button
                onClick={async () => {
                  try {
                    await unblockUser(c.user.id);
                    pushToast(`Unblocked ${c.user.display_name}`);
                  } catch {
                    pushToast("Couldn't unblock");
                  }
                }}
                className="text-xs text-[var(--color-signal-blue)] font-medium shrink-0"
              >
                Unblock
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NotificationsTab({
  user,
  updateSettings,
  pushToast,
}: {
  user: User;
  updateSettings: (payload: SettingsPayload) => Promise<void>;
  pushToast: (title: string, body?: string) => void;
}) {
  const [showForCalls, setShowForCalls] = useLocalPref("signal-clone:notif:calls", true);
  const [includeMutedBadge, setIncludeMutedBadge] = useLocalPref("signal-clone:notif:muted-badge", false);
  const [pushSounds, setPushSounds] = useLocalPref("signal-clone:notif:push-sounds", false);
  const toggle = makeSettingsToggle(updateSettings, pushToast);

  return (
    <div>
      <div className="flex flex-col">
        <CheckboxRow
          label="Enable notifications"
          checked={user.notifications_enabled}
          onChange={(v) => toggle("notifications_enabled", v)}
        />
        <CheckboxRow label="Show notifications for calls" checked={showForCalls} onChange={setShowForCalls} />
        <CheckboxRow
          label="Include muted chats in badge count"
          checked={includeMutedBadge}
          onChange={setIncludeMutedBadge}
        />
      </div>

      <Divider />

      <SelectRow
        label="Notification content"
        value={user.notification_preview_enabled ? "full" : "none"}
        options={[
          { value: "full", label: "Name, content, and actions" },
          { value: "none", label: "No name or content" },
        ]}
        onChange={(v) => toggle("notification_preview_enabled", v === "full")}
      />

      <Divider />

      <div className="flex flex-col">
        <CheckboxRow label="Push notification sounds" checked={pushSounds} onChange={setPushSounds} />
        <CheckboxRow
          label="In-chat message sounds"
          description="Hear a notification sound for sent and received messages while in the chat."
          checked={user.notification_sound_enabled}
          onChange={(v) => toggle("notification_sound_enabled", v)}
        />
      </div>

      <Divider />

      <ActionRow
        label="Notification profiles"
        description="Create a profile to receive notifications and calls only from the people and groups you choose"
        buttonLabel="Set up"
        onClick={() => pushToast("Notification profiles are coming soon")}
      />
    </div>
  );
}

const HAND_SKIN_TONES = ["✋", "✋🏻", "✋🏼", "✋🏽", "✋🏾", "✋🏿"];

function ChatsTab({
  conversations,
  pushToast,
}: {
  conversations: Conversation[];
  pushToast: (title: string, body?: string) => void;
}) {
  const [spellCheck, setSpellCheck] = useLocalPref("signal-clone:chats:spellcheck", true);
  const [formatPopover, setFormatPopover] = useLocalPref("signal-clone:chats:format-popover", true);
  const [linkPreviews, setLinkPreviews] = useLocalPref("signal-clone:chats:link-previews", true);
  const [addressBookPhotos, setAddressBookPhotos] = useLocalPref("signal-clone:chats:address-book-photos", false);
  const [emoticonsToEmoji, setEmoticonsToEmoji] = useLocalPref("signal-clone:chats:emoticons-to-emoji", true);
  const [keepMutedArchived, setKeepMutedArchived] = useLocalPref("signal-clone:chats:keep-muted-archived", false);
  const [skinTone, setSkinTone] = useLocalPref("signal-clone:chats:skin-tone", 0);
  const [exporting, setExporting] = useState(false);
  const [lastImport, setLastImport] = useLocalPref<string | null>("signal-clone:chats:last-import", null);

  async function exportChatHistory() {
    setExporting(true);
    try {
      const withMessages = await Promise.all(
        conversations.map(async (c) => ({
          id: c.id,
          name: c.name ?? c.participants.map((p) => p.user.display_name).join(", "),
          type: c.type,
          participants: c.participants.map((p) => p.user.username),
          messages: (await fetchAllMessages(c.id)).map((m) => ({
            sender: m.sender_id,
            content: m.is_deleted ? null : m.content,
            sent_at: m.created_at,
          })),
        }))
      );
      const blob = new Blob(
        [JSON.stringify({ exported_at: new Date().toISOString(), conversations: withMessages }, null, 2)],
        { type: "application/json" }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `signal-chat-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      pushToast("Chat history exported");
    } catch {
      pushToast("Couldn't export chat history");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <SubsectionTitle>Chats</SubsectionTitle>
      <div className="flex flex-col">
        <CheckboxRow
          label="Spell check text entered in message composition box"
          checked={spellCheck}
          onChange={setSpellCheck}
        />
        <CheckboxRow
          label="Show text formatting popover when text is selected"
          checked={formatPopover}
          onChange={setFormatPopover}
        />
        <CheckboxRow
          label="Generate link previews"
          description="Retrieve link previews directly from websites for messages you send."
          checked={linkPreviews}
          onChange={setLinkPreviews}
        />
        <CheckboxRow
          label="Use address book photos"
          description="Display contact photos from your address book if available."
          checked={addressBookPhotos}
          onChange={setAddressBookPhotos}
        />
        <CheckboxRow
          label="Convert typed emoticons to emoji"
          description="For example, :-) will be converted to 🙂"
          checked={emoticonsToEmoji}
          onChange={setEmoticonsToEmoji}
        />
        <CheckboxRow
          label="Keep muted chats archived"
          description="Muted chats that are archived will remain archived when a new message arrives."
          checked={keepMutedArchived}
          onChange={setKeepMutedArchived}
        />
      </div>

      <div className="flex items-center justify-between gap-4 py-3">
        <p className="text-sm text-[var(--color-text-primary)]">Emoji skin tone</p>
        <div className="flex gap-1.5">
          {HAND_SKIN_TONES.map((hand, i) => (
            <button
              key={hand}
              onClick={() => setSkinTone(i)}
              className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition ${
                skinTone === i ? "bg-[var(--color-bg-tertiary)] ring-1 ring-[var(--color-signal-blue)]" : "hover:bg-[var(--color-bg-tertiary)]/60"
              }`}
            >
              {hand}
            </button>
          ))}
        </div>
      </div>

      <Divider />

      <SubsectionTitle>Chat folders</SubsectionTitle>
      <ActionRow
        label="Add a chat folder"
        description="Organize your chats into folders and quickly switch between them on your chat list."
        buttonLabel="Set up"
        onClick={() => pushToast("Chat folders are coming soon")}
      />

      <Divider />

      <ActionRow
        label="Export chat history"
        description="Export a machine-readable JSON copy of all your chats. Disappearing messages will not be exported."
        buttonLabel="Export"
        busy={exporting}
        onClick={exportChatHistory}
      />

      <Divider />

      <ActionRow
        label="Import contacts"
        description={
          lastImport
            ? `Import all Signal groups and contacts from your mobile device. Last import at ${new Date(lastImport).toLocaleString()}.`
            : "Import all Signal groups and contacts from your mobile device."
        }
        buttonLabel="Import now"
        onClick={() => {
          pushToast("Contact import isn't available in this demo");
          setLastImport(new Date().toISOString());
        }}
      />
    </div>
  );
}

function DataUsageTab() {
  const [photos, setPhotos] = useLocalPref("signal-clone:data:photos", true);
  const [videos, setVideos] = useLocalPref("signal-clone:data:videos", true);
  const [audio, setAudio] = useLocalPref("signal-clone:data:audio", true);
  const [documents, setDocuments] = useLocalPref("signal-clone:data:documents", true);
  const [mediaQuality, setMediaQuality] = useLocalPref("signal-clone:data:media-quality", "standard");

  return (
    <div>
      <SubsectionTitle>Media auto-download</SubsectionTitle>
      <div className="flex flex-col">
        <CheckboxRow label="Photos" checked={photos} onChange={setPhotos} />
        <CheckboxRow label="Videos" checked={videos} onChange={setVideos} />
        <CheckboxRow label="Audio" checked={audio} onChange={setAudio} />
        <CheckboxRow label="Documents" checked={documents} onChange={setDocuments} />
      </div>
      <p className="text-xs text-[var(--color-text-secondary)] mt-1">
        Voice messages and stickers are always auto-downloaded.
      </p>

      <Divider />

      <SelectRow
        label="Sent media quality"
        description="Sending high quality media will use more data."
        value={mediaQuality}
        options={[
          { value: "standard", label: "Standard" },
          { value: "high", label: "High" },
        ]}
        onChange={setMediaQuality}
      />
    </div>
  );
}
