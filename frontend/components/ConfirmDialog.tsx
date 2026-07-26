"use client";

import { useState } from "react";
import Modal from "./Modal";

interface Props {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

export default function ConfirmDialog({ title, message, confirmLabel, danger, onConfirm, onClose }: Props) {
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose} width={360}>
      <p className="text-sm text-[var(--color-text-secondary)] mb-5">{message}</p>
      <div className="flex gap-2">
        <button
          onClick={onClose}
          disabled={busy}
          className="flex-1 rounded-lg border border-[var(--color-border)] text-sm font-medium py-2.5 hover:bg-[var(--color-bg-tertiary)] transition disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={busy}
          className={`flex-1 rounded-lg text-sm font-medium py-2.5 transition disabled:opacity-50 ${
            danger
              ? "bg-red-500 text-white hover:bg-red-600"
              : "bg-[var(--color-signal-blue)] text-white hover:bg-[var(--color-signal-blue-dark)]"
          }`}
        >
          {busy ? "…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
