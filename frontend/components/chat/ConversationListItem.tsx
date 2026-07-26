import Avatar from "@/components/Avatar";
import { formatListTimestamp } from "@/lib/format";
import type { Conversation, User } from "@/lib/types";

interface Props {
  conversation: Conversation;
  currentUser: User;
  active: boolean;
  onClick: () => void;
}

function conversationSubtitle(conversation: Conversation, currentUserId: string): string {
  const msg = conversation.last_message;
  if (!msg) return conversation.type === "group" ? "No messages yet" : "Say hi 👋";
  if (msg.is_system) return msg.content || "";
  const prefix = msg.sender_id === currentUserId ? "You: " : "";
  if (msg.is_deleted) return `${prefix}This message was deleted`;
  if (msg.attachment_url && !msg.content) {
    return `${prefix}📎 ${msg.attachment_type === "image" ? "Photo" : msg.attachment_name || "Attachment"}`;
  }
  return `${prefix}${msg.content || ""}`;
}

export default function ConversationListItem({ conversation, currentUser, active, onClick }: Props) {
  const other =
    conversation.type === "direct"
      ? conversation.participants.find((p) => p.user.id !== currentUser.id)?.user
      : undefined;
  const isOnline = other?.is_online;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${
        active ? "bg-[var(--color-signal-blue)]/10" : "hover:bg-[var(--color-bg-tertiary)]"
      }`}
    >
      <Avatar
        name={conversation.name || "Unknown"}
        color={conversation.avatar_color}
        emoji={conversation.avatar_emoji}
        size={48}
        showPresence={conversation.type === "direct"}
        online={isOnline}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate flex items-center gap-1">
            <span className="truncate">{conversation.name || "Unknown"}</span>
            {conversation.pinned && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="var(--color-text-secondary)" className="shrink-0">
                <path d="M16 3l5 5-5.5 2L13 13l-2 8-2-2 3-8-3.5-3.5L3 10l5-5 3.5 3.5L16 3z" />
              </svg>
            )}
            {conversation.muted && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" className="shrink-0">
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                <path d="M18.63 13A17.89 17.89 0 0 1 18 8" />
                <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" />
                <path d="M18 8a6 6 0 0 0-9.33-5" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            )}
          </p>
          {conversation.last_message && (
            <span className="text-[11px] text-[var(--color-text-secondary)] shrink-0">
              {formatListTimestamp(conversation.last_message.created_at)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p
            className={`text-xs truncate ${
              conversation.unread_count > 0 || conversation.marked_unread
                ? "text-[var(--color-text-primary)] font-medium"
                : "text-[var(--color-text-secondary)]"
            }`}
          >
            {conversationSubtitle(conversation, currentUser.id)}
          </p>
          {conversation.unread_count > 0 ? (
            <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-signal-blue)] text-white text-[10px] font-semibold flex items-center justify-center">
              {conversation.unread_count > 99 ? "99+" : conversation.unread_count}
            </span>
          ) : (
            conversation.marked_unread && (
              <span className="shrink-0 w-2.5 h-2.5 rounded-full bg-[var(--color-signal-blue)]" />
            )
          )}
        </div>
      </div>
    </button>
  );
}
