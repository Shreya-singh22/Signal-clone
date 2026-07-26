from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session as DbSession

from .. import schemas
from ..database import get_db
from ..deps import get_current_user
from ..models import (
    Conversation,
    ConversationParticipant,
    Message,
    MessageReaction,
    MessageStatus,
    MessageStatusEnum,
    User,
)
from ..ws_manager import manager

router = APIRouter(tags=["messages"])


def _require_participant(db: DbSession, conversation_id: str, user_id: str) -> ConversationParticipant:
    p = (
        db.query(ConversationParticipant)
        .filter(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == user_id,
        )
        .first()
    )
    if not p:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return p


def _purge_expired(db: DbSession, conversation_id: str) -> None:
    now = datetime.now(timezone.utc)
    expired = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id, Message.expires_at.isnot(None))
        .all()
    )
    changed = False
    for m in expired:
        exp = m.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp <= now and not m.is_deleted:
            m.is_deleted = True
            m.content = None
            m.attachment_url = None
            changed = True
    if changed:
        db.commit()


def _message_out(message: Message, recipient_count: int) -> schemas.MessageOut:
    statuses = [s.status for s in message.statuses]
    if not statuses or recipient_count == 0:
        status = "sent"
    elif all(s == MessageStatusEnum.read for s in statuses):
        status = "read"
    elif all(s in (MessageStatusEnum.read, MessageStatusEnum.delivered) for s in statuses):
        status = "delivered"
    else:
        status = "sent"
    out = schemas.MessageOut.model_validate(message)
    out.status = status
    out.reactions = [
        schemas.ReactionOut(emoji=r.emoji, user_id=r.user_id) for r in message.reactions
    ]
    return out


@router.get("/api/conversations/{conversation_id}/messages", response_model=list[schemas.MessageOut])
def list_messages(
    conversation_id: str,
    before: str | None = Query(default=None),
    limit: int = Query(default=50, le=200),
    current_user: User = Depends(get_current_user),
    db: DbSession = Depends(get_db),
):
    _require_participant(db, conversation_id, current_user.id)
    _purge_expired(db, conversation_id)

    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    recipient_count = max(len(conv.participants) - 1, 0)

    q = db.query(Message).filter(Message.conversation_id == conversation_id)
    if before:
        ref = db.query(Message).filter(Message.id == before).first()
        if ref:
            q = q.filter(Message.created_at < ref.created_at)
    messages = q.order_by(Message.created_at.desc()).limit(limit).all()
    messages.reverse()
    return [_message_out(m, recipient_count) for m in messages]


@router.post("/api/conversations/{conversation_id}/messages", response_model=schemas.MessageOut)
async def send_message(
    conversation_id: str,
    payload: schemas.SendMessageRequest,
    current_user: User = Depends(get_current_user),
    db: DbSession = Depends(get_db),
):
    _require_participant(db, conversation_id, current_user.id)
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if not payload.content and not payload.attachment_url:
        raise HTTPException(status_code=400, detail="Message must have content or attachment")

    expires_at = None
    if conv.disappearing_seconds:
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=conv.disappearing_seconds)

    message = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=payload.content,
        reply_to_id=payload.reply_to_id,
        attachment_url=payload.attachment_url,
        attachment_type=payload.attachment_type,
        attachment_name=payload.attachment_name,
        expires_at=expires_at,
    )
    db.add(message)
    db.flush()

    other_participants = [p for p in conv.participants if p.user_id != current_user.id]
    for p in other_participants:
        st = MessageStatusEnum.delivered if manager.is_online(p.user_id) else MessageStatusEnum.sent
        db.add(MessageStatus(message_id=message.id, user_id=p.user_id, status=st))

    conv.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(message)

    result = _message_out(message, len(other_participants))
    payload_dict = result.model_dump(mode="json")

    all_member_ids = [p.user_id for p in conv.participants]
    await manager.send_to_users(all_member_ids, {"type": "message", "message": payload_dict})
    await manager.send_to_users(
        [p.user_id for p in other_participants], {"type": "stop_typing", "conversation_id": conversation_id, "user_id": current_user.id}
    )
    return result


@router.delete("/api/messages/{message_id}")
async def delete_message(
    message_id: str,
    current_user: User = Depends(get_current_user),
    db: DbSession = Depends(get_db),
):
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    if message.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot delete another user's message")
    message.is_deleted = True
    message.content = None
    message.attachment_url = None
    db.commit()

    conv = db.query(Conversation).filter(Conversation.id == message.conversation_id).first()
    member_ids = [p.user_id for p in conv.participants]
    await manager.send_to_users(
        member_ids,
        {"type": "message_deleted", "conversation_id": conv.id, "message_id": message.id},
    )
    return {"ok": True}


@router.post("/api/messages/{message_id}/reactions", response_model=schemas.MessageOut)
async def react_to_message(
    message_id: str,
    payload: schemas.ReactionRequest,
    current_user: User = Depends(get_current_user),
    db: DbSession = Depends(get_db),
):
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    _require_participant(db, message.conversation_id, current_user.id)

    existing = (
        db.query(MessageReaction)
        .filter(MessageReaction.message_id == message_id, MessageReaction.user_id == current_user.id)
        .first()
    )
    if existing:
        if existing.emoji == payload.emoji:
            db.delete(existing)
        else:
            existing.emoji = payload.emoji
    else:
        db.add(MessageReaction(message_id=message_id, user_id=current_user.id, emoji=payload.emoji))
    db.commit()
    db.refresh(message)

    conv = db.query(Conversation).filter(Conversation.id == message.conversation_id).first()
    recipient_count = max(len(conv.participants) - 1, 0)
    result = _message_out(message, recipient_count)
    member_ids = [p.user_id for p in conv.participants]
    await manager.send_to_users(
        member_ids,
        {"type": "reaction_update", "conversation_id": conv.id, "message": result.model_dump(mode="json")},
    )
    return result
