# Signal — a Signal-inspired messenger clone

Signal is a full-stack clone of the Signal Messenger experience: registration/onboarding,
a conversation list, one-on-one and group messaging in real time, typing indicators,
delivery/read receipts, reactions, replies, attachments, disappearing messages, and a
Signal-styled UI with light/dark themes.

> Encryption is **mocked** — there is no real end-to-end cryptography. OTP verification is
> mocked with a fixed/dev-visible code. Everything else (auth, persistence, real-time
> delivery, group management) is fully functional against a real database and WebSocket
> connection.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 |
| Backend | FastAPI (Python) + SQLAlchemy ORM |
| Database | SQLite |
| Real-time | Native WebSockets (`/ws`), one connection per client, server-side connection manager |
| Auth | Custom mocked phone/OTP registration + username/password login, opaque bearer session tokens (no JWT needed for this scope) |

No external services are required — everything runs locally against a SQLite file and an
in-process WebSocket connection manager.

---

## Project structure

```
Signal Clone/
├── backend/
│   └── app/
│       ├── main.py          # FastAPI app, router wiring, static file mount for uploads
│       ├── models.py        # SQLAlchemy models (schema below)
│       ├── schemas.py       # Pydantic request/response models
│       ├── database.py      # Engine/session setup (SQLite)
│       ├── security.py      # Password hashing (PBKDF2), mock OTP constant
│       ├── deps.py          # get_current_user() bearer-token dependency
│       ├── ws_manager.py    # In-memory user_id -> WebSocket connection registry
│       ├── seed.py          # Seeds demo users/contacts/conversations/messages
│       └── routers/
│           ├── auth.py          # /api/auth/* (otp, register, login, logout, me)
│           ├── users.py         # /api/users/* (search, update profile)
│           ├── contacts.py      # /api/contacts/*
│           ├── conversations.py # /api/conversations/* (direct/group CRUD, members, read receipts)
│           ├── messages.py      # /api/conversations/{id}/messages, reactions, delete
│           ├── upload.py        # /api/upload (attachments)
│           └── ws.py            # /ws (typing, presence, live message/receipt fan-out)
└── frontend/
    ├── app/
    │   ├── page.tsx          # redirects to /login or /chat
    │   ├── login/page.tsx
    │   ├── register/page.tsx # 3-step onboarding: phone -> OTP -> profile
    │   └── chat/page.tsx     # main Signal-like shell (nav rail + list + chat pane)
    ├── components/           # Avatar, Modal, ToastStack, and chat/* (bubbles, composer, modals…)
    └── lib/
        ├── api.ts            # typed REST client
        ├── store.tsx         # global app state (auth, conversations, messages, WS handling)
        ├── theme.tsx         # light/dark/system theme provider
        ├── types.ts          # shared TS types mirroring backend schemas
        └── format.ts         # date/time/avatar formatting helpers
```

---

## Getting started

### Prerequisites
- Python 3.11+
- Node.js 20+

### 1. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Creates signam.db and seeds demo users/conversations/messages
python -m app.seed

uvicorn app.main:app --reload --port 8000
```

The API is now at `http://localhost:8000` (interactive docs at `/docs`).

Demo accounts (all use password `password123`): **alice, bob, carol, dave, erin**.
Alice has a mix of read/unread direct chats and two seeded groups ("Design Team",
"Weekend Trip 🏖️") so the app is immediately usable.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local      # NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

Open `http://localhost:3000`. Log in with any seeded user, or go through
**Create an account** to register a brand-new one (phone number → mocked OTP,
auto-filled for convenience → profile/avatar → password).

---

## Architecture overview

**Backend** is a fairly standard layered FastAPI app: SQLAlchemy models →
Pydantic schemas → routers that depend on a `get_current_user` bearer-token
dependency for auth. There's no ORM-to-API leakage — routers build response
objects explicitly (e.g. computing a conversation's `unread_count` and a
message's aggregate delivery `status` at request time) instead of exposing
raw rows.

**Real-time** is handled by a single `/ws?token=...` WebSocket endpoint per
logged-in client, tracked in an in-memory `ConnectionManager` (`user_id ->
set[WebSocket]`, supports multiple tabs/devices per user). REST endpoints
that mutate state (send message, add/remove member, react, mark read) do the
DB write first, then push the resulting event to every affected participant
over their live socket(s). The client also keeps REST as the source of truth
for the initial page load and reconciles/dedupes by message id — the socket
is purely a push channel, not a second data store. Typing indicators are
WebSocket-only (never persisted): the client sends `typing`/`stop_typing`
frames, the server fans them out to the other conversation participants.

**Frontend** centralizes all cross-component state (auth session,
conversations, messages-by-conversation, typing map, toasts) in one React
context (`lib/store.tsx`) backed by a small reducer for the messages map, so
components stay presentational. The WebSocket connection lives inside that
same provider and dispatches into the reducer/state as events arrive.
Message sends are optimistic: a temporary `sending`-status message is shown
immediately and swapped for the server's real message (or marked `failed`)
once the REST call resolves.

**Presence / delivery status modeling**: online/offline is derived directly
from whether a user has an open WebSocket connection (no polling). Message
delivery status is per-recipient (`MessageStatus` rows: `sent` → `delivered`
→ `read`), and the API aggregates that into a single status per message for
the sender's UI (single check / double check / blue double check), matching
Signal's checkmark semantics for both direct and group chats.

---

## Database schema

SQLite, 8 tables:

```
users
├── id (pk, uuid)
├── phone_number (unique)         username (unique)
├── display_name, about, avatar_color, avatar_emoji
├── password_hash                 is_online, last_seen_at, created_at

sessions                          # opaque bearer tokens (mocked auth, no JWT)
├── id (pk)   token (unique)   user_id (fk -> users)   expires_at

contacts                          # per-user address book
├── id (pk)   owner_id (fk -> users)   contact_user_id (fk -> users)
├── nickname   unique(owner_id, contact_user_id)

conversations
├── id (pk)   type (direct | group)   name (group only)
├── avatar_color, avatar_emoji, disappearing_seconds
├── created_by (fk -> users)   updated_at   # bumped on every new message, drives list sort order

conversation_participants         # membership + per-member read state
├── id (pk)   conversation_id (fk)   user_id (fk)
├── is_admin   joined_at   last_read_at   muted   archived
├── unique(conversation_id, user_id)

messages
├── id (pk)   conversation_id (fk)   sender_id (fk -> users)
├── content, attachment_url/type/name, reply_to_id (fk -> messages, self-referential)
├── is_deleted, is_system (for "X added Y" / "X created the group" events)
├── created_at, expires_at (disappearing messages)

message_statuses                  # per-recipient delivery/read receipt
├── id (pk)   message_id (fk)   user_id (fk, the recipient)
├── status (sent | delivered | read)   updated_at
├── unique(message_id, user_id)

message_reactions
├── id (pk)   message_id (fk)   user_id (fk)   emoji
├── unique(message_id, user_id)   # one reaction per user per message, like Signal
```

Design notes:
- `conversations` covers both direct and group chats through one table + a
  `type` discriminator, with membership normalized into
  `conversation_participants` — this lets group-only fields (`is_admin`) and
  direct-only computed fields (peer name/avatar) live cleanly without two
  parallel schemas.
- Read receipts are tracked at two granularities on purpose:
  `conversation_participants.last_read_at` gives an O(1) unread-count query
  for the conversation list, while `message_statuses` gives per-message,
  per-recipient ticks for the chat pane. They're updated together whenever a
  conversation is marked read.
- `messages.reply_to_id` self-references `messages` for quoted replies;
  `is_system` messages (member added/removed/group created) live in the same
  table as regular messages so they sort naturally into the timeline.

---

## API overview

All endpoints are under `/api`, JSON in/out, auth via `Authorization: Bearer
<token>` (obtained from `/api/auth/register` or `/api/auth/login`). Full
interactive reference at `http://localhost:8000/docs`.

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/otp/request`, `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` |
| Users | `GET /api/users/search?q=`, `PATCH /api/users/me` |
| Contacts | `GET /api/contacts`, `POST /api/contacts`, `DELETE /api/contacts/{id}` |
| Conversations | `GET/POST /api/conversations`, `POST /api/conversations/direct`, `POST /api/conversations/group`, `GET/PATCH /api/conversations/{id}`, `POST /api/conversations/{id}/read` |
| Group membership | `POST /api/conversations/{id}/members`, `DELETE /api/conversations/{id}/members/{user_id}`, `PATCH /api/conversations/{id}/members/{user_id}?is_admin=` |
| Messages | `GET/POST /api/conversations/{id}/messages`, `DELETE /api/messages/{id}`, `POST /api/messages/{id}/reactions` |
| Attachments | `POST /api/upload` (multipart, served back from `/uploads/...`) |
| Real-time | `WS /ws?token=` — client sends `{type: "typing"\|"stop_typing", conversation_id}`; server pushes `message`, `typing`/`stop_typing`, `status_update`, `message_deleted`, `reaction_update`, `presence`, `conversation_update` |

---

## Feature checklist

- **Auth/onboarding**: mocked phone+OTP registration, profile + avatar setup, username/password
  login, session persisted in `localStorage`, logout.
- **Conversation list**: sorted by latest activity, search across chats/contacts, unread
  filter tab, unread-count badges, last-message preview, online/last-seen indicators.
- **1:1 messaging**: realtime send/receive, timestamps, typing indicators, sending → sent →
  delivered → read status ticks, full persistence.
- **Group messaging**: create with name + members, member list, add/remove members, admin
  toggle, leave group, system messages for membership events, group renaming.
- **Signal look & feel**: nav rail (chats/calls/stories/settings), conversation list + chat
  pane layout, message bubbles with tails, day dividers, modals for new chat/new group/chat
  info, toast notifications for incoming messages.
- **Bonus implemented**: image/file attachments, emoji reactions (double-click or picker),
  reply-to/quoted messages, functional disappearing messages (per-conversation timer, purged
  lazily on read), light/dark/system theme, responsive layout (mobile collapses to
  list-or-pane), Enter-to-send.
- **Placeholders**: voice/video calls, stories, linked devices, privacy/notification settings
  all render a "coming soon" state rather than being silently missing.

## Assumptions & simplifications

- OTP is a fixed mocked code (`123456`), also returned directly in the `/api/auth/otp/request`
  response so the UI can auto-fill it — there is no real SMS delivery.
- Passwords are hashed with salted PBKDF2-SHA256 (no third-party auth/crypto library pulled
  in for a scope this size); sessions are opaque random tokens stored server-side, not JWTs.
- "Online" is defined as "has an open WebSocket connection right now" — there's no separate
  heartbeat/away state.
- Disappearing messages purge lazily (checked when a conversation's messages are fetched),
  not via a background scheduler — acceptable for a demo, would move to a periodic job in
  production.
- File uploads are stored on local disk under `backend/uploads/` and served via a static
  mount; there's a 10MB size cap and an extension allowlist. This would move to object
  storage (S3/GCS) for a real deployment.
- Group read receipts are aggregated (a message shows "read" only once every recipient has
  read it), matching what Signal's summary tick shows, rather than exposing a per-recipient
  breakdown UI.
