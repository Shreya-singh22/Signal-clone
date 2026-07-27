"use client";

import Avatar from "@/components/Avatar";
import { useApp } from "@/lib/store";

interface NavRailProps {
  active: "chats" | "calls" | "stories";
  onSelect: (tab: "chats" | "calls" | "stories") => void;
  onOpenSettings: () => void;
}

export function SettingsGearIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function NavIcon({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`w-11 h-11 rounded-xl flex items-center justify-center transition shrink-0 ${
        active
          ? "bg-[var(--color-signal-blue)] text-white"
          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]"
      }`}
    >
      {children}
    </button>
  );
}

function MobileTabButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center gap-0.5 transition shrink-0 ${
        active ? "text-[var(--color-signal-blue)]" : "text-[var(--color-text-secondary)]"
      }`}
    >
      {children}
    </button>
  );
}

const ChatsGlyph = (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

const CallsGlyph = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const StoriesGlyph = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

/** Desktop/tablet side rail (≥768px). Renders nothing itself below that
 * breakpoint — {@link MobileNavBar} is the ≥768px equivalent. */
export default function NavRail({ active, onSelect, onOpenSettings }: NavRailProps) {
  const { user } = useApp();
  if (!user) return null;

  return (
    <div className="hidden md:flex w-[72px] shrink-0 flex-col items-center py-4 gap-3 bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)]">
      <button onClick={onOpenSettings} title="Your profile" className="mb-2">
        <Avatar name={user.display_name} color={user.avatar_color} emoji={user.avatar_emoji} size={40} />
      </button>

      <NavIcon label="Chats" active={active === "chats"} onClick={() => onSelect("chats")}>
        {ChatsGlyph}
      </NavIcon>

      <NavIcon label="Calls (coming soon)" active={active === "calls"} onClick={() => onSelect("calls")}>
        {CallsGlyph}
      </NavIcon>

      <NavIcon label="Stories (coming soon)" active={active === "stories"} onClick={() => onSelect("stories")}>
        {StoriesGlyph}
      </NavIcon>
    </div>
  );
}

/** Mobile bottom tab bar (<768px) — keeps Chats/Calls/Stories/Settings reachable
 * once the side rail disappears below the tablet breakpoint. Meant to be placed
 * as a footer within a flex-col wrapper, not alongside {@link NavRail}. */
export function MobileNavBar({ active, onSelect, onOpenSettings }: NavRailProps) {
  const { user } = useApp();
  if (!user) return null;

  return (
    <div
      className="md:hidden flex items-center justify-around shrink-0 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2 py-1"
      style={{ paddingBottom: "max(0.25rem, env(safe-area-inset-bottom))" }}
    >
      <MobileTabButton label="Chats" active={active === "chats"} onClick={() => onSelect("chats")}>
        {ChatsGlyph}
        <span className="text-[10px] font-medium leading-none">Chats</span>
      </MobileTabButton>
      <MobileTabButton label="Calls" active={active === "calls"} onClick={() => onSelect("calls")}>
        {CallsGlyph}
        <span className="text-[10px] font-medium leading-none">Calls</span>
      </MobileTabButton>
      <MobileTabButton label="Stories" active={active === "stories"} onClick={() => onSelect("stories")}>
        {StoriesGlyph}
        <span className="text-[10px] font-medium leading-none">Stories</span>
      </MobileTabButton>
      <button
        onClick={onOpenSettings}
        title="Settings"
        className="w-11 h-11 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[var(--color-text-secondary)] shrink-0"
      >
        <Avatar name={user.display_name} color={user.avatar_color} emoji={user.avatar_emoji} size={20} />
        <span className="text-[10px] font-medium leading-none">You</span>
      </button>
    </div>
  );
}
