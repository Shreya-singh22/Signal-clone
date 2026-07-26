"use client";

import { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import Modal from "@/components/Modal";
import { useApp } from "@/lib/store";
import type { MessageInfo } from "@/lib/types";

interface Props {
  messageId: string;
  onClose: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  read: "Read",
  delivered: "Delivered",
  sent: "Sent",
};

export default function MessageInfoModal({ messageId, onClose }: Props) {
  const { messageInfo } = useApp();
  const [info, setInfo] = useState<MessageInfo | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    messageInfo(messageId)
      .then((res) => {
        if (!cancelled) setInfo(res);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [messageId, messageInfo]);

  return (
    <Modal title="Message info" onClose={onClose} width={400}>
      {error && <p className="text-sm text-[var(--color-text-secondary)]">Couldn&apos;t load message info.</p>}
      {!info && !error && <p className="text-sm text-[var(--color-text-secondary)]">Loading…</p>}
      {info && (
        <div className="flex flex-col gap-4">
          <div className="rounded-lg bg-[var(--color-bg-tertiary)] px-3 py-2.5">
            {info.message.is_deleted ? (
              <p className="text-sm italic text-[var(--color-text-secondary)]">This message was deleted</p>
            ) : (
              <p className="text-sm whitespace-pre-wrap break-words">
                {info.message.content || (info.message.attachment_url ? "📎 Attachment" : "")}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--color-text-secondary)]">Sent</span>
            <span>{new Date(info.message.created_at).toLocaleString()}</span>
          </div>
          {info.message.is_edited && info.message.edited_at && (
            <div className="flex items-center justify-between text-sm -mt-2">
              <span className="text-[var(--color-text-secondary)]">Edited</span>
              <span>{new Date(info.message.edited_at).toLocaleString()}</span>
            </div>
          )}

          {info.receipts.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">Delivery</p>
              <div className="flex flex-col gap-2">
                {info.receipts.map((r) => (
                  <div key={r.user.id} className="flex items-center gap-3">
                    <Avatar name={r.user.display_name} color={r.user.avatar_color} emoji={r.user.avatar_emoji} size={32} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{r.user.display_name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-medium">{STATUS_LABEL[r.status] || r.status}</p>
                      <p className="text-[10px] text-[var(--color-text-secondary)]">
                        {new Date(r.updated_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
