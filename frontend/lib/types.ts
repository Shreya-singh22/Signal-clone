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
}

export interface Contact {
  id: string;
  user: User;
  nickname?: string | null;
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
  created_at: string;
  status: MessageDeliveryStatus;
  reactions: Reaction[];
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
  unread_count: number;
}
