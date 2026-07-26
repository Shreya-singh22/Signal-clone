import type { Contact, Conversation, Message, User } from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.body && !(options.body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : {}),
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(options.headers as Record<string, string>),
  };
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  requestOtp: (phone_number: string) =>
    request<{ message: string; dev_otp: string }>("/api/auth/otp/request", {
      method: "POST",
      body: JSON.stringify({ phone_number }),
    }),
  register: (payload: {
    phone_number: string;
    otp: string;
    username: string;
    display_name: string;
    password: string;
    avatar_color?: string;
    avatar_emoji?: string;
  }) =>
    request<{ token: string; user: User }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  login: (identifier: string, password: string) =>
    request<{ token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
    }),
  logout: () => request("/api/auth/logout", { method: "POST" }),
  me: () => request<User>("/api/auth/me"),
  updateProfile: (payload: Partial<Pick<User, "display_name" | "about" | "avatar_color" | "avatar_emoji">>) =>
    request<User>("/api/users/me", { method: "PATCH", body: JSON.stringify(payload) }),
  searchUsers: (q: string) => request<User[]>(`/api/users/search?q=${encodeURIComponent(q)}`),

  listContacts: () => request<Contact[]>("/api/contacts"),
  addContact: (payload: { username?: string; phone_number?: string; nickname?: string }) =>
    request<Contact>("/api/contacts", { method: "POST", body: JSON.stringify(payload) }),
  deleteContact: (id: string) => request(`/api/contacts/${id}`, { method: "DELETE" }),

  listConversations: () => request<Conversation[]>("/api/conversations"),
  getConversation: (id: string) => request<Conversation>(`/api/conversations/${id}`),
  createDirectConversation: (user_id: string) =>
    request<Conversation>("/api/conversations/direct", {
      method: "POST",
      body: JSON.stringify({ user_id }),
    }),
  createGroup: (payload: { name: string; member_ids: string[]; avatar_emoji?: string; avatar_color?: string }) =>
    request<Conversation>("/api/conversations/group", { method: "POST", body: JSON.stringify(payload) }),
  updateConversation: (id: string, payload: { name?: string; disappearing_seconds?: number }) =>
    request<Conversation>(`/api/conversations/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  addMember: (conversationId: string, user_id: string) =>
    request<Conversation>(`/api/conversations/${conversationId}/members`, {
      method: "POST",
      body: JSON.stringify({ user_id }),
    }),
  removeMember: (conversationId: string, userId: string) =>
    request<Conversation>(`/api/conversations/${conversationId}/members/${userId}`, {
      method: "DELETE",
    }),
  setAdmin: (conversationId: string, userId: string, isAdmin: boolean) =>
    request(`/api/conversations/${conversationId}/members/${userId}?is_admin=${isAdmin}`, {
      method: "PATCH",
    }),
  markRead: (conversationId: string) =>
    request(`/api/conversations/${conversationId}/read`, { method: "POST" }),

  listMessages: (conversationId: string, before?: string) =>
    request<Message[]>(
      `/api/conversations/${conversationId}/messages${before ? `?before=${before}` : ""}`
    ),
  sendMessage: (
    conversationId: string,
    payload: {
      content?: string;
      reply_to_id?: string;
      attachment_url?: string;
      attachment_type?: string;
      attachment_name?: string;
    }
  ) =>
    request<Message>(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteMessage: (messageId: string) => request(`/api/messages/${messageId}`, { method: "DELETE" }),
  react: (messageId: string, emoji: string) =>
    request<Message>(`/api/messages/${messageId}/reactions`, {
      method: "POST",
      body: JSON.stringify({ emoji }),
    }),

  upload: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<{ url: string; type: string; name: string }>("/api/upload", {
      method: "POST",
      body: form,
    });
  },
};
