"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { api, ApiError, API_URL, setAuthToken } from "./api";
import type { Contact, Conversation, Message, User } from "./types";

// ---------- Toasts ----------

export interface Toast {
  id: string;
  title: string;
  body?: string;
}

// ---------- Messages reducer ----------

type MessagesState = Record<string, Message[]>;

type MessagesAction =
  | { type: "SET"; conversationId: string; messages: Message[] }
  | { type: "PREPEND"; conversationId: string; messages: Message[] }
  | { type: "UPSERT"; conversationId: string; message: Message; tempId?: string }
  | { type: "SET_STATUS"; conversationId: string; messageIds: string[]; status: Message["status"] }
  | { type: "REMOVE"; conversationId: string; messageId: string }
  | { type: "MARK_DELETED"; conversationId: string; messageId: string };

function messagesReducer(state: MessagesState, action: MessagesAction): MessagesState {
  switch (action.type) {
    case "SET":
      return { ...state, [action.conversationId]: action.messages };
    case "PREPEND": {
      const existing = state[action.conversationId] || [];
      return { ...state, [action.conversationId]: [...action.messages, ...existing] };
    }
    case "UPSERT": {
      const existing = state[action.conversationId] || [];
      // Filter out both the temp placeholder (if any) and any prior copy of this
      // real message id, then re-add once. Using a two-pass replace here (instead
      // of filter+push) could otherwise leave two rows sharing the same id when the
      // WS echo and the REST response for the same send both arrive and race.
      const filtered = existing.filter(
        (m) => m.id !== action.message.id && !(action.tempId && m.id === action.tempId)
      );
      const next = [...filtered, action.message];
      next.sort((a, b) => a.created_at.localeCompare(b.created_at));
      return { ...state, [action.conversationId]: next };
    }
    case "SET_STATUS": {
      const existing = state[action.conversationId] || [];
      const ids = new Set(action.messageIds);
      return {
        ...state,
        [action.conversationId]: existing.map((m) =>
          ids.has(m.id) ? { ...m, status: action.status } : m
        ),
      };
    }
    case "REMOVE": {
      const existing = state[action.conversationId] || [];
      return {
        ...state,
        [action.conversationId]: existing.filter((m) => m.id !== action.messageId),
      };
    }
    case "MARK_DELETED": {
      const existing = state[action.conversationId] || [];
      return {
        ...state,
        [action.conversationId]: existing.map((m) =>
          m.id === action.messageId ? { ...m, is_deleted: true, content: null, attachment_url: null } : m
        ),
      };
    }
    default:
      return state;
  }
}

// ---------- Context ----------

interface AppContextValue {
  user: User | null;
  authLoading: boolean;
  conversations: Conversation[];
  contacts: Contact[];
  messages: MessagesState;
  typing: Record<string, string[]>;
  toasts: Toast[];
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setSession: (token: string, user: User) => void;
  refreshConversations: () => Promise<void>;
  refreshContacts: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (
    conversationId: string,
    content: string,
    opts?: { reply_to_id?: string; attachment_url?: string; attachment_type?: string; attachment_name?: string }
  ) => Promise<void>;
  deleteMessage: (conversationId: string, messageId: string) => Promise<void>;
  react: (conversationId: string, messageId: string, emoji: string) => Promise<void>;
  markRead: (conversationId: string) => Promise<void>;
  sendTyping: (conversationId: string) => void;
  sendStopTyping: (conversationId: string) => void;
  createDirect: (userId: string) => Promise<Conversation>;
  createGroup: (name: string, memberIds: string[]) => Promise<Conversation>;
  addContact: (payload: { username?: string; phone_number?: string }) => Promise<Contact>;
  updateConversation: (id: string, payload: { name?: string; disappearing_seconds?: number }) => Promise<void>;
  archiveConversation: (id: string, archived: boolean) => Promise<void>;
  addMember: (conversationId: string, userId: string) => Promise<void>;
  removeMember: (conversationId: string, userId: string) => Promise<void>;
  updateProfile: (payload: Partial<Pick<User, "display_name" | "about" | "avatar_color" | "avatar_emoji">>) => Promise<void>;
  pushToast: (title: string, body?: string) => void;
  dismissToast: (id: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const TOKEN_KEY = "signam_token";

function updateUserInConversations(convs: Conversation[], userId: string, patch: Partial<User>): Conversation[] {
  return convs.map((c) => ({
    ...c,
    participants: c.participants.map((p) =>
      p.user.id === userId ? { ...p, user: { ...p.user, ...patch } } : p
    ),
  }));
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, dispatchMessages] = useReducer(messagesReducer, {});
  const [typing, setTyping] = useState<Record<string, string[]>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeouts = useRef<Record<string, number>>({});
  const activeConversationIdRef = useRef<string | null>(null);
  const userRef = useRef<User | null>(null);
  const conversationsRef = useRef<Conversation[]>([]);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const pushToast = useCallback((title: string, body?: string) => {
    const id = crypto.randomUUID();
    setToasts((t) => [...t, { id, title, body }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((toast) => toast.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((t) => t.filter((toast) => toast.id !== id));
  }, []);

  const refreshConversations = useCallback(async () => {
    const convs = await api.listConversations();
    setConversations(convs);
  }, []);

  const refreshContacts = useCallback(async () => {
    const c = await api.listContacts();
    setContacts(c);
  }, []);

  const setSession = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setAuthToken(newToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setAuthToken(null);
    setToken(null);
    setUser(null);
    setConversations([]);
    setContacts([]);
    wsRef.current?.close();
  }, []);

  // bootstrap from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time auth bootstrap on mount
      setAuthLoading(false);
      return;
    }
    setAuthToken(stored);
    api
      .me()
      .then((u) => {
        setToken(stored);
        setUser(u);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setAuthToken(null);
      })
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-login, not a render sync
      refreshConversations().catch(() => {});
      refreshContacts().catch(() => {});
    }
  }, [user, refreshConversations, refreshContacts]);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const res = await api.login(identifier, password);
      setSession(res.token, res.user);
    },
    [setSession]
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    }
    clearSession();
  }, [clearSession]);

  // ---------- WebSocket ----------
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    let reconnectTimer: number | undefined;

    function connect() {
      if (cancelled) return;
      const wsUrl = API_URL.replace(/^http/, "ws");
      const ws = new WebSocket(`${wsUrl}/ws?token=${encodeURIComponent(token as string)}`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWsEvent(data);
      };
      ws.onclose = () => {
        if (!cancelled) {
          reconnectTimer = window.setTimeout(connect, 2000);
        }
      };
      ws.onerror = () => {
        ws.close();
      };
    }

    function handleWsEvent(data: Record<string, unknown>) {
      const me = userRef.current;
      switch (data.type) {
        case "message": {
          const message = data.message as Message;
          dispatchMessages({ type: "UPSERT", conversationId: message.conversation_id, message });
          setConversations((prev) => {
            const idx = prev.findIndex((c) => c.id === message.conversation_id);
            if (idx === -1) {
              refreshConversations().catch(() => {});
              return prev;
            }
            const conv = prev[idx];
            const isActive = activeConversationIdRef.current === message.conversation_id;
            const isMine = me && message.sender_id === me.id;
            const updated: Conversation = {
              ...conv,
              last_message: message,
              updated_at: message.created_at,
              unread_count: isActive || isMine ? conv.unread_count : conv.unread_count + 1,
              // The backend un-archives a chat for recipients when a new message lands in it.
              archived: isMine ? conv.archived : false,
            };
            const rest = prev.filter((_, i) => i !== idx);
            return [updated, ...rest];
          });
          if (!message.is_system) {
            const senderIsMe = me && message.sender_id === me.id;
            if (!senderIsMe && activeConversationIdRef.current !== message.conversation_id) {
              const conv = conversationsRef.current.find((c) => c.id === message.conversation_id);
              const senderP = conv?.participants.find((p) => p.user.id === message.sender_id);
              pushToast(
                senderP?.user.display_name || "New message",
                message.content || (message.attachment_url ? "Sent an attachment" : "")
              );
            }
          } else if (activeConversationIdRef.current === message.conversation_id) {
            // system message in active conversation already appended above
          }
          if (activeConversationIdRef.current === message.conversation_id) {
            api.markRead(message.conversation_id).catch(() => {});
          }
          break;
        }
        case "typing":
        case "stop_typing": {
          const convId = data.conversation_id as string;
          const uid = data.user_id as string;
          setTyping((prev) => {
            const current = new Set(prev[convId] || []);
            if (data.type === "typing") current.add(uid);
            else current.delete(uid);
            return { ...prev, [convId]: Array.from(current) };
          });
          break;
        }
        case "status_update": {
          const convId = data.conversation_id as string;
          const ids = data.message_ids as string[];
          dispatchMessages({ type: "SET_STATUS", conversationId: convId, messageIds: ids, status: "read" });
          break;
        }
        case "message_deleted": {
          dispatchMessages({
            type: "MARK_DELETED",
            conversationId: data.conversation_id as string,
            messageId: data.message_id as string,
          });
          break;
        }
        case "reaction_update": {
          const message = data.message as Message;
          dispatchMessages({ type: "UPSERT", conversationId: message.conversation_id, message });
          break;
        }
        case "presence": {
          const uid = data.user_id as string;
          const isOnline = data.is_online as boolean;
          const lastSeen = data.last_seen_at as string | undefined;
          setConversations((prev) =>
            updateUserInConversations(prev, uid, {
              is_online: isOnline,
              ...(lastSeen ? { last_seen_at: lastSeen } : {}),
            })
          );
          setContacts((prev) =>
            prev.map((c) =>
              c.user.id === uid
                ? { ...c, user: { ...c.user, is_online: isOnline, ...(lastSeen ? { last_seen_at: lastSeen } : {}) } }
                : c
            )
          );
          break;
        }
        case "conversation_update": {
          const conv = data.conversation as Conversation;
          setConversations((prev) => {
            const idx = prev.findIndex((c) => c.id === conv.id);
            if (idx === -1) return [conv, ...prev];
            const next = [...prev];
            next[idx] = { ...conv, unread_count: prev[idx].unread_count };
            return next;
          });
          if (activeConversationIdRef.current === conv.id) {
            api
              .listMessages(conv.id)
              .then((msgs) => dispatchMessages({ type: "SET", conversationId: conv.id, messages: msgs }))
              .catch(() => {});
          }
          break;
        }
        default:
          break;
      }
    }

    connect();
    return () => {
      cancelled = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadMessages = useCallback(async (conversationId: string) => {
    const msgs = await api.listMessages(conversationId);
    dispatchMessages({ type: "SET", conversationId, messages: msgs });
  }, []);

  const sendMessage = useCallback(
    async (
      conversationId: string,
      content: string,
      opts?: { reply_to_id?: string; attachment_url?: string; attachment_type?: string; attachment_name?: string }
    ) => {
      const me = userRef.current;
      if (!me) return;
      const tempId = `temp-${crypto.randomUUID()}`;
      const optimistic: Message = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: me.id,
        content: content || null,
        attachment_url: opts?.attachment_url || null,
        attachment_type: opts?.attachment_type || null,
        attachment_name: opts?.attachment_name || null,
        reply_to_id: opts?.reply_to_id || null,
        is_deleted: false,
        is_system: false,
        created_at: new Date().toISOString(),
        status: "sending",
        reactions: [],
      };
      dispatchMessages({ type: "UPSERT", conversationId, message: optimistic });
      try {
        const real = await api.sendMessage(conversationId, { content: content || undefined, ...opts });
        dispatchMessages({ type: "UPSERT", conversationId, message: real, tempId });
        setConversations((prev) => {
          const idx = prev.findIndex((c) => c.id === conversationId);
          if (idx === -1) return prev;
          const conv = { ...prev[idx], last_message: real, updated_at: real.created_at };
          const rest = prev.filter((_, i) => i !== idx);
          return [conv, ...rest];
        });
      } catch {
        dispatchMessages({
          type: "UPSERT",
          conversationId,
          message: { ...optimistic, status: "failed" },
          tempId,
        });
      }
    },
    []
  );

  const deleteMessage = useCallback(async (conversationId: string, messageId: string) => {
    await api.deleteMessage(messageId);
    dispatchMessages({ type: "MARK_DELETED", conversationId, messageId });
  }, []);

  const react = useCallback(async (conversationId: string, messageId: string, emoji: string) => {
    const updated = await api.react(messageId, emoji);
    dispatchMessages({ type: "UPSERT", conversationId, message: updated });
  }, []);

  const markRead = useCallback(async (conversationId: string) => {
    setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c)));
    try {
      await api.markRead(conversationId);
    } catch {
      // ignore
    }
  }, []);

  const sendTyping = useCallback((conversationId: string) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "typing", conversation_id: conversationId }));
    }
    window.clearTimeout(typingTimeouts.current[conversationId]);
    typingTimeouts.current[conversationId] = window.setTimeout(() => {
      const ws2 = wsRef.current;
      if (ws2 && ws2.readyState === WebSocket.OPEN) {
        ws2.send(JSON.stringify({ type: "stop_typing", conversation_id: conversationId }));
      }
    }, 3000);
  }, []);

  const sendStopTyping = useCallback((conversationId: string) => {
    window.clearTimeout(typingTimeouts.current[conversationId]);
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "stop_typing", conversation_id: conversationId }));
    }
  }, []);

  const createDirect = useCallback(async (userId: string) => {
    const conv = await api.createDirectConversation(userId);
    setConversations((prev) => {
      const exists = prev.find((c) => c.id === conv.id);
      if (exists) return prev.map((c) => (c.id === conv.id ? conv : c));
      return [conv, ...prev];
    });
    return conv;
  }, []);

  const createGroup = useCallback(async (name: string, memberIds: string[]) => {
    const conv = await api.createGroup({ name, member_ids: memberIds });
    setConversations((prev) => [conv, ...prev]);
    return conv;
  }, []);

  const addContact = useCallback(async (payload: { username?: string; phone_number?: string }) => {
    const contact = await api.addContact(payload);
    setContacts((prev) => {
      const exists = prev.find((c) => c.id === contact.id);
      if (exists) return prev;
      return [...prev, contact];
    });
    return contact;
  }, []);

  const updateConversation = useCallback(
    async (id: string, payload: { name?: string; disappearing_seconds?: number }) => {
      const updated = await api.updateConversation(id, payload);
      setConversations((prev) => prev.map((c) => (c.id === id ? { ...updated, unread_count: c.unread_count } : c)));
    },
    []
  );

  const archiveConversation = useCallback(async (id: string, archived: boolean) => {
    const updated = await api.archiveConversation(id, archived);
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...updated, unread_count: c.unread_count } : c)));
  }, []);

  const addMember = useCallback(async (conversationId: string, userId: string) => {
    const updated = await api.addMember(conversationId, userId);
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...updated, unread_count: c.unread_count } : c))
    );
    await loadMessages(conversationId);
  }, [loadMessages]);

  const removeMember = useCallback(async (conversationId: string, userId: string) => {
    const updated = await api.removeMember(conversationId, userId);
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...updated, unread_count: c.unread_count } : c))
    );
    await loadMessages(conversationId);
  }, [loadMessages]);

  const updateProfile = useCallback(
    async (payload: Partial<Pick<User, "display_name" | "about" | "avatar_color" | "avatar_emoji">>) => {
      const updated = await api.updateProfile(payload);
      setUser(updated);
    },
    []
  );

  const value: AppContextValue = useMemo(
    () => ({
      user,
      authLoading,
      conversations,
      contacts,
      messages,
      typing,
      toasts,
      activeConversationId,
      setActiveConversationId,
      login,
      logout,
      setSession,
      refreshConversations,
      refreshContacts,
      loadMessages,
      sendMessage,
      deleteMessage,
      react,
      markRead,
      sendTyping,
      sendStopTyping,
      createDirect,
      createGroup,
      addContact,
      updateConversation,
      archiveConversation,
      addMember,
      removeMember,
      updateProfile,
      pushToast,
      dismissToast,
    }),
    [
      user,
      authLoading,
      conversations,
      contacts,
      messages,
      typing,
      toasts,
      activeConversationId,
      login,
      logout,
      setSession,
      refreshConversations,
      refreshContacts,
      loadMessages,
      sendMessage,
      deleteMessage,
      react,
      markRead,
      sendTyping,
      sendStopTyping,
      createDirect,
      createGroup,
      addContact,
      updateConversation,
      archiveConversation,
      addMember,
      removeMember,
      updateProfile,
      pushToast,
      dismissToast,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export { ApiError };
