"use client";

import { useEffect, useState } from "react";
import { api, API_URL } from "@/lib/api";
import Modal from "@/components/Modal";
import type { Message } from "@/lib/types";

interface Props {
  conversationId: string;
  onClose: () => void;
}

function attachmentSrc(url: string) {
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

export default function AllMediaModal({ conversationId, onClose }: Props) {
  const [media, setMedia] = useState<Message[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .conversationMedia(conversationId)
      .then((res) => {
        if (!cancelled) setMedia(res);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  const images = media?.filter((m) => m.attachment_type === "image") || [];
  const files = media?.filter((m) => m.attachment_type && m.attachment_type !== "image") || [];

  return (
    <Modal title="All media" onClose={onClose} width={440}>
      {error && <p className="text-sm text-[var(--color-text-secondary)]">Couldn&apos;t load media.</p>}
      {!media && !error && <p className="text-sm text-[var(--color-text-secondary)]">Loading…</p>}
      {media && media.length === 0 && (
        <p className="text-sm text-[var(--color-text-secondary)] text-center py-6">
          No photos or files shared yet.
        </p>
      )}

      {images.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">
            Photos
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {images.map((m) => (
              <a
                key={m.id}
                href={attachmentSrc(m.attachment_url!)}
                target="_blank"
                rel="noreferrer"
                className="aspect-square rounded-lg overflow-hidden bg-[var(--color-bg-tertiary)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- thumbnail grid of arbitrary uploaded/GIF sources */}
                <img
                  src={attachmentSrc(m.attachment_url!)}
                  alt={m.attachment_name || "Photo"}
                  className="w-full h-full object-cover"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">
            Files
          </p>
          <div className="flex flex-col gap-1">
            {files.map((m) => (
              <a
                key={m.id}
                href={attachmentSrc(m.attachment_url!)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm hover:bg-[var(--color-bg-tertiary)] transition"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[var(--color-text-secondary)]">
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                  <path d="M13 2v7h7" />
                </svg>
                <span className="truncate">{m.attachment_name || "Attachment"}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
