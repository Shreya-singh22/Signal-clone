"""Background tasks: proactively push disappearing-message expiry instead of
relying only on the lazy purge that runs when a client happens to fetch a
conversation's messages (see routers/messages.py::_purge_expired).
"""

import asyncio
from datetime import datetime, timezone

from .database import SessionLocal
from .models import Conversation, Message
from .ws_manager import manager

SWEEP_INTERVAL_SECONDS = 5


async def disappearing_messages_sweep_loop() -> None:
    while True:
        try:
            await _sweep_once()
        except Exception:
            # A transient DB/WS hiccup shouldn't kill the sweep loop — it just
            # tries again next tick.
            pass
        await asyncio.sleep(SWEEP_INTERVAL_SECONDS)


async def _sweep_once() -> None:
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        candidates = (
            db.query(Message)
            .filter(Message.expires_at.isnot(None), Message.is_deleted.is_(False))
            .all()
        )

        newly_expired_by_conversation: dict[str, list[str]] = {}
        for msg in candidates:
            expires_at = msg.expires_at
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at <= now:
                msg.is_deleted = True
                msg.content = None
                msg.attachment_url = None
                newly_expired_by_conversation.setdefault(msg.conversation_id, []).append(msg.id)

        if not newly_expired_by_conversation:
            return
        db.commit()

        for conversation_id, message_ids in newly_expired_by_conversation.items():
            conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
            if not conv:
                continue
            member_ids = [p.user_id for p in conv.participants]
            for message_id in message_ids:
                await manager.send_to_users(
                    member_ids,
                    {
                        "type": "message_deleted",
                        "conversation_id": conversation_id,
                        "message_id": message_id,
                    },
                )
    finally:
        db.close()
