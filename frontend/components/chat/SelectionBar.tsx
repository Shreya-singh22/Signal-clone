"use client";

interface Props {
  count: number;
  canDelete: boolean;
  onCancel: () => void;
  onDelete: () => void;
  onForward: () => void;
}

export default function SelectionBar({ count, canDelete, onCancel, onDelete, onForward }: Props) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
      <button
        onClick={onCancel}
        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] transition"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6 6 18" />
          <path d="M6 6l12 12" />
        </svg>
      </button>
      <p className="text-sm font-medium text-[var(--color-text-primary)] flex-1">
        {count} selected
      </p>
      <button
        onClick={onForward}
        disabled={count === 0}
        title="Forward"
        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] transition disabled:opacity-40"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 17 20 12 15 7" />
          <path d="M4 18v-2a4 4 0 0 1 4-4h12" />
        </svg>
      </button>
      <button
        onClick={onDelete}
        disabled={count === 0 || !canDelete}
        title={canDelete ? "Delete" : "Can only delete your own messages"}
        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--color-bg-tertiary)] text-red-500 transition disabled:opacity-40"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
        </svg>
      </button>
    </div>
  );
}
