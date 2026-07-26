import json
from datetime import datetime, timezone

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session as DbSession

from ..database import SessionLocal
from ..models import ConversationParticipant, Session as SessionModel, User
from ..ws_manager import manager

router = APIRouter()


def _authenticate(db: DbSession, token: str) -> User | None:
    session = db.query(SessionModel).filter(SessionModel.token == token).first()
    if not session:
        return None
    return db.query(User).filter(User.id == session.user_id).first()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    db = SessionLocal()
    user = _authenticate(db, token)
    if not user:
        await websocket.close(code=4401)
        db.close()
        return

    was_offline = not manager.is_online(user.id)
    await manager.connect(user.id, websocket)

    if was_offline:
        user.is_online = True
        user.last_seen_at = datetime.now(timezone.utc)
        db.commit()
        peer_ids = _peer_ids(db, user.id)
        await manager.send_to_users(
            peer_ids, {"type": "presence", "user_id": user.id, "is_online": True}
        )

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue
            msg_type = data.get("type")
            conversation_id = data.get("conversation_id")

            if msg_type in ("typing", "stop_typing") and conversation_id:
                participant_ids = _conversation_peer_ids(db, conversation_id, user.id)
                await manager.send_to_users(
                    participant_ids,
                    {
                        "type": msg_type,
                        "conversation_id": conversation_id,
                        "user_id": user.id,
                    },
                )
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(user.id, websocket)
        if not manager.is_online(user.id):
            user.is_online = False
            user.last_seen_at = datetime.now(timezone.utc)
            db.commit()
            peer_ids = _peer_ids(db, user.id)
            await manager.send_to_users(
                peer_ids,
                {
                    "type": "presence",
                    "user_id": user.id,
                    "is_online": False,
                    "last_seen_at": user.last_seen_at.isoformat(),
                },
            )
        db.close()


def _conversation_peer_ids(db: DbSession, conversation_id: str, exclude_user_id: str) -> list[str]:
    rows = (
        db.query(ConversationParticipant.user_id)
        .filter(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id != exclude_user_id,
        )
        .all()
    )
    return [r[0] for r in rows]


def _peer_ids(db: DbSession, user_id: str) -> list[str]:
    conv_ids = (
        db.query(ConversationParticipant.conversation_id)
        .filter(ConversationParticipant.user_id == user_id)
        .subquery()
    )
    rows = (
        db.query(ConversationParticipant.user_id)
        .filter(
            ConversationParticipant.conversation_id.in_(conv_ids),
            ConversationParticipant.user_id != user_id,
        )
        .distinct()
        .all()
    )
    return [r[0] for r in rows]
