"use client";

interface Props {
  query: string;
  onQueryChange: (q: string) => void;
  matchCount: number;
  activeIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

export default function MessageSearchBar({
  query,
  onQueryChange,
  matchCount,
  activeIndex,
  onNext,
  onPrev,
  onClose,
}: Props) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-text-secondary)] shrink-0">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        autoFocus
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (e.shiftKey) onPrev();
            else onNext();
          } else if (e.key === "Escape") {
            onClose();
          }
        }}
        placeholder="Search in this conversation"
        className="flex-1 bg-transparent text-sm outline-none text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]"
      />
      {query.trim() && (
        <span className="text-xs text-[var(--color-text-secondary)] shrink-0 tabular-nums">
          {matchCount > 0 ? `${activeIndex + 1} of ${matchCount}` : "No results"}
        </span>
      )}
      <button
        onClick={onPrev}
        disabled={matchCount === 0}
        title="Previous match"
        className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] transition disabled:opacity-30 shrink-0"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>
      <button
        onClick={onNext}
        disabled={matchCount === 0}
        title="Next match"
        className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] transition disabled:opacity-30 shrink-0"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <button
        onClick={onClose}
        title="Close search"
        className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] transition shrink-0"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6 6 18" />
          <path d="M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
