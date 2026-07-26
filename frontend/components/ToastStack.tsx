"use client";

import { useApp } from "@/lib/store";

export default function ToastStack() {
  const { toasts, dismissToast } = useApp();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          onClick={() => dismissToast(toast.id)}
          className="animate-fade-in-up text-left rounded-xl bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] shadow-lg px-4 py-3 hover:opacity-90 transition"
        >
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">{toast.title}</p>
          {toast.body && (
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 line-clamp-2">{toast.body}</p>
          )}
        </button>
      ))}
    </div>
  );
}
