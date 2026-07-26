"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import { useApp } from "@/lib/store";
import { useTheme } from "@/lib/theme";

const AVATAR_COLORS = ["#2C6BED", "#3AA3E3", "#D0895F", "#6C63C7", "#4CAF7D", "#E0A030", "#E35D6A", "#8854D0"];
const AVATAR_EMOJIS = ["🙂", "😎", "🌟", "🚀", "🎧", "📚", "🌿", "🎨", "🧑‍💻", "🐱", "☕", "⚡"];

type Tab = "profile" | "appearance" | "privacy" | "notifications" | "devices";

const TABS: { id: Tab; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "appearance", label: "Appearance" },
  { id: "privacy", label: "Privacy" },
  { id: "notifications", label: "Notifications" },
  { id: "devices", label: "Linked devices" },
];

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const { user, updateProfile, logout, pushToast } = useApp();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("profile");
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [about, setAbout] = useState(user?.about || "");
  const [avatarColor, setAvatarColor] = useState(user?.avatar_color || AVATAR_COLORS[0]);
  const [avatarEmoji, setAvatarEmoji] = useState(user?.avatar_emoji || AVATAR_EMOJIS[0]);
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  async function handleSave() {
    setSaving(true);
    try {
      await updateProfile({ display_name: displayName.trim(), about: about.trim(), avatar_color: avatarColor, avatar_emoji: avatarEmoji });
      pushToast("Profile updated");
    } catch {
      pushToast("Couldn't save profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await logout();
    onClose();
    router.replace("/login");
  }

  return (
    <Modal title="Settings" onClose={onClose} width={560}>
      <div className="flex gap-5">
        <div className="w-36 shrink-0 flex flex-col gap-0.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`text-left text-sm px-3 py-2 rounded-lg transition ${
                tab === t.id ? "bg-[var(--color-signal-blue)] text-white" : "hover:bg-[var(--color-bg-tertiary)]"
              }`}
            >
              {t.label}
            </button>
          ))}
          <button
            onClick={handleLogout}
            className="text-left text-sm px-3 py-2 rounded-lg text-red-500 hover:bg-red-500/10 transition mt-3"
          >
            Log out
          </button>
        </div>

        <div className="flex-1 min-w-0">
          {tab === "profile" && (
            <div className="flex flex-col gap-4">
              <div className="flex justify-center">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
                  style={{ backgroundColor: avatarColor }}
                >
                  {avatarEmoji}
                </div>
              </div>
              <div className="flex justify-center gap-1.5 flex-wrap">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setAvatarColor(c)}
                    className={`w-6 h-6 rounded-full ${avatarColor === c ? "ring-2 ring-offset-2 ring-[var(--color-signal-blue)] ring-offset-[var(--color-bg)]" : ""}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex justify-center gap-1.5 flex-wrap">
                {AVATAR_EMOJIS.map((em) => (
                  <button
                    key={em}
                    onClick={() => setAvatarEmoji(em)}
                    className={`w-8 h-8 rounded-full text-base flex items-center justify-center hover:bg-[var(--color-bg-tertiary)] ${avatarEmoji === em ? "bg-[var(--color-bg-tertiary)]" : ""}`}
                  >
                    {em}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
                  Display name
                </label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--color-signal-blue)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">About</label>
                <input
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--color-signal-blue)]"
                />
              </div>
              <div className="text-xs text-[var(--color-text-secondary)]">
                <p>Username: @{user.username}</p>
                <p>Phone: {user.phone_number}</p>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-[var(--color-signal-blue)] text-white text-sm font-medium py-2.5 hover:bg-[var(--color-signal-blue-dark)] transition disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          )}

          {tab === "appearance" && (
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
          )}

          {tab === "privacy" && <ComingSoon label="Privacy settings" description="Blocked contacts, screen lock, and read receipt controls are coming soon." />}
          {tab === "notifications" && <ComingSoon label="Notification settings" description="Fine-grained notification and sound preferences are coming soon." />}
          {tab === "devices" && <ComingSoon label="Linked devices" description="Pair Signam with a tablet or desktop client — coming soon." />}
        </div>
      </div>
    </Modal>
  );
}

function ComingSoon({ label, description }: { label: string; description: string }) {
  return (
    <div className="flex flex-col items-center text-center py-8 px-4">
      <div className="w-12 h-12 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center mb-3">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-text-secondary)]">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      </div>
      <p className="text-sm font-medium text-[var(--color-text-primary)]">{label}</p>
      <p className="text-xs text-[var(--color-text-secondary)] mt-1 max-w-xs">{description}</p>
    </div>
  );
}
