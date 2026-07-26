# Signal — a Signal-inspired messenger clone

A full-stack clone of the Signal Messenger experience: registration/onboarding, a
conversation list, one-on-one and group messaging in real time, typing indicators,
delivery/read receipts, reactions, replies, attachments, stickers/GIFs, disappearing
messages, and a Signal-styled UI with light/dark themes.

> Encryption is **mocked** — there is no real end-to-end cryptography, no Double
> Ratchet/Sender Keys, no prekey exchange. OTP verification is mocked with a fixed,
> dev-visible code. Everything else (auth, persistence, real-time delivery, group
> management, privacy/notification settings) is fully functional against a real
> database and WebSocket connection.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + Framer Motion |
| Backend | FastAPI (Python) + SQLAlchemy ORM |
| Database | SQLite |
| Real-time | Native WebSockets (`/ws`), one connection per client, server-side connection manager |
| Auth | Custom mocked phone/OTP registration + phone-or-username/password login, opaque bearer session tokens (no JWT needed for this scope) |
| External | GIPHY API (server-proxied, optional — see [GIFs](#gifs)) |

No external services are *required* — everything runs locally against a SQLite file
and an in-process WebSocket connection manager. GIF search is the one feature that
talks to a third party, and it degrades gracefully without one.

---

## Project structure

```
Signal Clone/
├── backend/
│   └── app/
│       ├── main.py          # FastAPI app, lifespan (stale-presence reset + disappearing-message sweep), router wiring
│       ├── models.py        # SQLAlchemy models (schema below)
│       ├── schemas.py       # Pydantic request/response models
│       ├── database.py      # Engine/session setup + UTCDateTime column type
│       ├── security.py      # Password hashing (PBKDF2), mock OTP constant
│       ├── deps.py          # get_current_user() bearer-token dependency
│       ├── ws_manager.py    # In-memory user_id -> WebSocket connection registry
│       ├── tasks.py         # Background sweep: proactively expires disappearing messages
│       ├── seed.py          # Seeds demo users/contacts/conversations/messages
│       └── routers/
│           ├── auth.py          # /api/auth/* (otp, register, login, logout, me) + OTP rate limiting
│           ├── users.py         # /api/users/* (search, profile, privacy/notification settings)
│           ├── contacts.py      # /api/contacts/* (add/remove, block/unblock)
│           ├── conversations.py # /api/conversations/* (direct/group CRUD, members, archive, read receipts)
│           ├── messages.py      # /api/conversations/{id}/messages, edit, pin, info, reactions, delete
│           ├── upload.py        # /api/upload (attachments)
│           ├── gifs.py          # /api/gifs/search (server-side GIPHY proxy)
│           └── ws.py            # /ws (typing, presence, live message/receipt fan-out)
└── frontend/
    ├── app/
    │   ├── page.tsx          # redirects to /login or /chat
    │   ├── login/page.tsx    # phone-number-first login (also accepts @username)
    │   ├── register/page.tsx # 3-step onboarding: phone -> OTP -> profile
    │   └── chat/page.tsx     # main Signal-like shell (nav rail + list + chat pane), global keyboard shortcuts
    ├── components/           # Avatar, Modal, ToastStack, and chat/* (bubbles, composer, modals, pickers…)
    └── lib/
        ├── api.ts            # typed REST client
        ├── store.tsx         # global app state (auth, conversations, messages, WS handling)
        ├── theme.tsx         # light/dark/system theme provider
        ├── types.ts          # shared TS types mirroring backend schemas
        ├── format.ts         # date/time/phone-formatting helpers
        ├── sound.ts          # Web Audio notification beep (no external asset)
        ├── stickers.ts       # sticker pack data
        ├── gifs.ts           # GIF search client
        └── useTicker.ts      # forces periodic re-render for "5m ago"-style relative time
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

Demo accounts (all use password `password123`): **alice, bob, carol, dave, erin**,
reachable by phone number (`+91 98765 4320<1-5>`) or username. Alice has a mix of
read/unread direct chats and two seeded groups ("Design Team", "Weekend Trip 🏖️")
so the app is immediately usable.

Optional: set `GIPHY_API_KEY` in the backend's environment to enable live GIF
search (see [GIFs](#gifs) below) — everything else works with zero configuration.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local      # NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

Open `http://localhost:3000`. Log in with any seeded user (phone number or
username), or go through **Create an account** to register a brand-new one
(phone number → mocked OTP, auto-filled for convenience → profile/avatar →
password).

### 3. Deploying it live

See [DEPLOYMENT.md](DEPLOYMENT.md) for step-by-step instructions to get a
real hosted link (Render for the backend, Vercel for the frontend). A
`render.yaml` blueprint is included so the backend deploy is close to
one-click.

---

## Architecture overview

**Backend** is a fairly standard layered FastAPI app: SQLAlchemy models →
Pydantic schemas → routers that depend on a `get_current_user` bearer-token
dependency for auth. There's no ORM-to-API leakage — routers build response
objects explicitly (e.g. computing a conversation's `unread_count` and a
message's aggregate delivery `status` at request time) instead of exposing
raw rows.

**Timestamps are stored and read as UTC, deliberately.** SQLAlchemy sessions
expire ORM objects on `commit()`, and the next attribute read silently
reloads from SQLite — which has no real timezone-aware storage, so values
come back *naive* even though every datetime assigned is
`datetime.now(timezone.utc)`. A naive datetime serializes without a "Z"/offset
suffix, and browsers parse an offset-less ISO string as *local* time, which
silently shifted every timestamp in the app by the viewer's UTC offset. Fixed
once at the root with a `UTCDateTime` SQLAlchemy `TypeDecorator`
(`database.py`) that normalizes to UTC on write and re-attaches `tzinfo=utc`
on read, rather than patching every call site.

**Real-time** is handled by a single `/ws?token=...` WebSocket endpoint per
logged-in client, tracked in an in-memory `ConnectionManager` (`user_id ->
set[WebSocket]`, supports multiple tabs/devices per user). REST endpoints
that mutate state (send/edit/pin a message, add/remove member, react, mark
read, archive) do the DB write first, then push the resulting event to every
affected participant over their live socket(s). The client also keeps REST
as the source of truth for the initial page load and reconciles/dedupes by
message id — the socket is purely a push channel, not a second data store.
Typing indicators are WebSocket-only (never persisted), and respect the
sender's privacy toggle (see below).

A background asyncio task (`tasks.py`, started from the app's `lifespan`)
sweeps for expired disappearing messages every 5 seconds and pushes
`message_deleted` proactively — this isn't purely lazy-on-fetch. On startup,
the same lifespan resets any `is_online=True` row left over from a previous
process (the in-memory connection map always starts empty on boot, so a
stale flag would otherwise strand that user as permanently "Online").

**Frontend** centralizes all cross-component state (auth session,
conversations, messages-by-conversation, typing map, toasts) in one React
context (`lib/store.tsx`) backed by a small reducer for the messages map, so
components stay presentational. The WebSocket connection lives inside that
same provider and dispatches into the reducer/state as events arrive.
Message sends are optimistic: a temporary `sending`-status message is shown
immediately and swapped for the server's real message (or marked `failed`)
once the REST call resolves — deduped by id so a race between the REST
response and the WS echo of the same message can't produce a duplicate.

**Presence / delivery status modeling**: online/offline is derived directly
from whether a user has an open WebSocket connection (no polling). Message
delivery status is per-recipient (`MessageStatus` rows: `sent` → `delivered`
→ `read`), and the API aggregates that into a single status per message for
the sender's UI (single check / double check / blue double check), matching
Signal's checkmark semantics for both direct and group chats. Relative "last
seen" text is kept fresh by a small `useTicker()` hook that force-re-renders
the component every 30s — otherwise "2m ago" would compute once and freeze.

**Privacy & notification settings are enforced, not cosmetic.** Turning off
read receipts stops the backend from ever flipping a status to `read` or
notifying the sender (mirrors Signal's mutual-receipts behavior); turning
off typing indicators stops the WS handler from broadcasting them; blocking
a contact is checked server-side on send (403, not just a hidden button) as
well as reflected in the UI.

### GIFs

GIF search is proxied server-side (`routers/gifs.py`) so no API key ships to
the client. It defaults to GIPHY's public "beta" testing key, which is
shared across countless tutorials and gets rate-limited/banned by GIPHY over
time (it returns `403 BANNED` as of writing — verified directly against
GIPHY's API, and Tenor's equivalent public v1 key is discontinued). Rather
than fake results with hardcoded GIF URLs, the endpoint returns
`{"available": false}` and the UI shows a clearly labeled "GIF search is
currently unavailable" state instead of hanging or erroring. Set a real
`GIPHY_API_KEY` (free at developers.giphy.com) and it works immediately with
no other changes. Stickers don't have this problem — there's no custom
sticker artwork in this project, so "stickers" are single emoji rendered
large with no bubble chrome, the same convention real chat apps use for a
lone-emoji message.

---

## Database schema

SQLite, 8 tables:

```
users
├── id (pk, uuid)
├── phone_number (unique)         username (unique)
├── display_name, about, avatar_color, avatar_emoji
├── password_hash                 is_online, last_seen_at, created_at
├── read_receipts_enabled, typing_indicators_enabled          # privacy settings
├── notifications_enabled, notification_preview_enabled, notification_sound_enabled

sessions                          # opaque bearer tokens (mocked auth, no JWT)
├── id (pk)   token (unique)   user_id (fk -> users)   expires_at

contacts                          # per-user address book
├── id (pk)   owner_id (fk -> users)   contact_user_id (fk -> users)
├── nickname   is_blocked   unique(owner_id, contact_user_id)

conversations
├── id (pk)   type (direct | group)   name (group only)
├── avatar_color, avatar_emoji, disappearing_seconds
├── created_by (fk -> users)   updated_at   # bumped on every new message, drives list sort order

conversation_participants         # membership + per-member read state
├── id (pk)   conversation_id (fk)   user_id (fk)
├── is_admin   joined_at   last_read_at   archived   muted
├── unique(conversation_id, user_id)

messages
├── id (pk)   conversation_id (fk)   sender_id (fk -> users)
├── content, attachment_url/type/name, reply_to_id (fk -> messages, self-referential)
├── is_deleted, is_system (for "X added Y" / "X created the group" / "X set disappearing messages to Y" events)
├── is_edited, edited_at         is_forwarded         pinned_at
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
  conversation is marked read (and skipped entirely if the reader has
  disabled read receipts).
- `messages.reply_to_id` self-references `messages` for quoted replies;
  `is_system` messages (member added/removed/group created/disappearing
  timer changed) live in the same table as regular messages so they sort
  naturally into the timeline, rather than being a parallel event log.
- `archived`/`muted` live on `conversation_participants`, not `conversations`
  — archiving is a per-user view preference, not a shared property of the
  chat, so one person archiving a conversation doesn't hide it for anyone
  else in it.
- All `DateTime` columns use the custom `UTCDateTime` type (see Architecture
  above), not raw SQLAlchemy `DateTime`.

---

## API overview

All endpoints are under `/api`, JSON in/out, auth via `Authorization: Bearer
<token>` (obtained from `/api/auth/register` or `/api/auth/login`). Full
interactive reference at `http://localhost:8000/docs`.

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/otp/request` (rate-limited, 5/10min per number), `POST /api/auth/register`, `POST /api/auth/login` (phone or username), `POST /api/auth/logout`, `GET /api/auth/me` |
| Users | `GET /api/users/search?q=`, `PATCH /api/users/me`, `PATCH /api/users/me/settings` (privacy/notifications) |
| Contacts | `GET /api/contacts`, `POST /api/contacts`, `PATCH /api/contacts/{id}`, `DELETE /api/contacts/{id}`, `POST /api/contacts/block`, `POST /api/contacts/unblock` |
| Conversations | `GET/POST /api/conversations`, `POST /api/conversations/direct`, `POST /api/conversations/group`, `GET/PATCH /api/conversations/{id}`, `POST /api/conversations/{id}/archive`, `POST /api/conversations/{id}/read` |
| Group membership | `POST /api/conversations/{id}/members`, `DELETE /api/conversations/{id}/members/{user_id}`, `PATCH /api/conversations/{id}/members/{user_id}?is_admin=` |
| Messages | `GET/POST /api/conversations/{id}/messages`, `PATCH /api/messages/{id}` (edit), `DELETE /api/messages/{id}`, `POST /api/messages/{id}/pin`, `GET /api/messages/{id}/info` (per-recipient receipts), `POST /api/messages/{id}/reactions` |
| Attachments | `POST /api/upload` (multipart, served back from `/uploads/...`) |
| GIFs | `GET /api/gifs/search?q=` (server-proxied GIPHY) |
| Real-time | `WS /ws?token=` — client sends `{type: "typing"\|"stop_typing", conversation_id}`; server pushes `message`, `message_edited`, `typing`/`stop_typing`, `status_update`, `message_deleted`, `reaction_update`, `pin_update`, `presence`, `conversation_update` |

---

## Feature checklist

Mapped against the assignment's own sections:

**1. Authentication/Onboarding** — phone-number-or-username registration with
mocked OTP (fixed code, dev-auto-filled), display name + emoji/color avatar
picker, phone-number-first login (also accepts `@username`) with session
persisted in `localStorage`, logout.

**2. Contacts & Conversation List** — sorted by latest activity; search
across both open conversations *and* contacts you haven't messaged yet;
dedicated "Add contact" flow (by phone number or username search) alongside
the implicit add-via-new-chat; unread badges + last-message preview; live
online/last-seen indicators (green/grey dot + relative text that keeps
ticking).

**3. One-on-one messaging** — real-time send/receive, timestamps, typing
indicators, `sending → sent → delivered → read` status ticks (with a color
transition + a shake animation on `failed`), full persistence.

**4. Group messaging** — create with name + members, member list, add/remove
members, admin toggle, leave group, system messages for every membership/
settings event, group renaming, all persisted.

**5. Signal experience** — nav rail (chats/calls/stories/settings),
conversation list + chat pane layout, message bubbles with reply threading,
day dividers, modals for new chat/new group/chat info/forward, toast
notifications (respecting the notification/preview/sound settings), in-chat
message search with match navigation, keyboard shortcuts (`Cmd/Ctrl+K` new
chat, `Cmd/Ctrl+,` settings, `Esc` backs out of select-mode/search).

**Placeholders** — voice/video calls, stories, linked devices, chat folders,
and notification profiles all render an explicit "coming soon" state.

**Bonus implemented** — image/file attachments (staged with a caption
before sending, not auto-sent on pick), emoji reactions (double-click or
picker), reply-to/quoted messages (click a quote to jump to and highlight
the original), message edit/pin/forward/multi-select, a real Emoji/
Stickers/GIFs picker, functional disappearing messages (proactively
expired by a background sweep, not just on next fetch, with a collapse/fade
animation), real (not placeholder) Privacy and Notification settings
including contact blocking, light/dark/system theme, responsive layout
(collapses to single-pane on mobile, full three-pane at tablet width and
up, verified at both), and the keyboard shortcuts above.

## Assumptions & simplifications

- OTP is a fixed mocked code (`123456`), also returned directly in the
  `/api/auth/otp/request` response so the UI can auto-fill it — there is no
  real SMS delivery.
- Passwords are hashed with salted PBKDF2-SHA256 (no third-party auth/crypto
  library pulled in for a scope this size); sessions are opaque random
  tokens stored server-side, not JWTs.
- "Online" is defined as "has an open WebSocket connection right now" —
  there's no separate heartbeat/away state.
- Disappearing messages are expired by a background sweep every 5s (see
  Architecture) rather than a precise per-message timer, and by a lazy
  check whenever a conversation's messages are fetched as a backstop — a
  production system would likely use a proper task queue instead of an
  in-process asyncio loop.
- File uploads are stored on local disk under `backend/uploads/` and served
  via a static mount; there's a 10MB size cap and an extension allowlist.
  This would move to object storage (S3/GCS) for a real deployment.
- Group read receipts are aggregated (a message shows "read" only once
  every recipient has read it), matching what Signal's summary tick shows,
  rather than exposing a per-recipient breakdown UI in the chat itself
  (the per-recipient breakdown *is* available via the message "Info" panel).
- GIF search depends on a third-party API key that isn't bundled (see
  [GIFs](#gifs)) — every other feature works fully offline/self-contained.
- Real end-to-end encryption (Signal's Double Ratchet / Sender Keys,
  prekey rotation, safety-number verification) is intentionally out of
  scope per the assignment — implementing pieces of that theater without
  real cryptographic keys underneath would be misleading rather than
  useful, so it isn't simulated beyond the "encryption mocked" framing.
