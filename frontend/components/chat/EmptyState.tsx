export default function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-[var(--color-bg-secondary)] text-center px-6">
      <div className="w-20 h-20 rounded-full bg-[var(--color-signal-blue)]/10 flex items-center justify-center">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--color-signal-blue)" strokeWidth="1.5">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Your messages</h2>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1 max-w-xs">
          Select a conversation from the list, or start a new chat to begin messaging.
        </p>
      </div>
    </div>
  );
}
