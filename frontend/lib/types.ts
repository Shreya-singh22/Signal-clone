export interface User {
  id: string;
  username: string;
  display_name: string;
  phone_number?: string | null;
  about?: string | null;
  avatar_color: string;
  avatar_emoji: string;
  is_online: boolean;
  last_seen_at: string;
  read_receipts_enabled: boolean;
  typing_indicators_enabled: boolean;
  notifications_enabled: boolean;
  notification_preview_enabled: boolean;
  notification_sound_enabled: boolean;
}

export interface Contact {
  id: string;
  user: User;
  nickname?: string | null;
  is_blocked: boolean;
}

export interface Participant {
  user: User;
  is_admin: boolean;
  joined_at: string;
}

export interface Reaction {
  emoji: string;
  user_id: string;
}

export type MessageDeliveryStatus = "sending" | "sent" | "delivered" | "read" | "failed";

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content?: string | null;
  attachment_url?: string | null;
  attachment_type?: string | null;
  attachment_name?: string | null;
  reply_to_id?: string | null;
  is_deleted: boolean;
  is_system: boolean;
  is_edited: boolean;
  is_forwarded: boolean;
  pinned_at?: string | null;
  created_at: string;
  edited_at?: string | null;
  status: MessageDeliveryStatus;
  reactions: Reaction[];
}

export interface ReceiptDetail {
  user: User;
  status: string;
  updated_at: string;
}

export interface MessageInfo {
  message: Message;
  sender: User;
  receipts: ReceiptDetail[];
}

export type ConversationType = "direct" | "group";

export interface Conversation {
  id: string;
  type: ConversationType;
  name?: string | null;
  avatar_color: string;
  avatar_emoji: string;
  disappearing_seconds: number;
  updated_at: string;
  participants: Participant[];
  last_message?: Message | null;
  pinned_messages: Message[];
  unread_count: number;
  archived: boolean;
  muted: boolean;
}
