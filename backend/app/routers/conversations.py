from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DbSession, joinedload

from .. import schemas
from ..database import get_db
from ..deps import get_current_user
from ..models import (
    Conversation,
    ConversationParticipant,
    ConversationType,
    Message,
    MessageStatusEnum,
    User,
)
from ..ws_manager import manager

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


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


def _message_status(message: Message, recipient_count: int) -> str:
    statuses = [s.status for s in message.statuses]
    if not statuses or recipient_count == 0:
        return "sent"
    if all(s == MessageStatusEnum.read for s in statuses):
        return "read"
    if all(s in (MessageStatusEnum.read, MessageStatusEnum.delivered) for s in statuses):
        return "delivered"
    return "sent"


def _message_out(message: Message, recipient_count: int) -> schemas.MessageOut:
    out = schemas.MessageOut.model_validate(message)
    out.status = _message_status(message, recipient_count)
    out.reactions = [
        schemas.ReactionOut(emoji=r.emoji, user_id=r.user_id) for r in message.reactions
    ]
    return out


def _conversation_out(
    db: DbSession, conv: Conversation, current_user_id: str
) -> schemas.ConversationOut:
    participants = conv.participants
    recipient_count = max(len(participants) - 1, 0)
    last_message = (
        db.query(Message)
        .filter(Message.conversation_id == conv.id)
        .order_by(Message.created_at.desc())
        .first()
    )
    pinned = (
        db.query(Message)
        .filter(Message.conversation_id == conv.id, Message.pinned_at.isnot(None))
        .order_by(Message.pinned_at.desc())
        .limit(3)
        .all()
    )

    me = next((p for p in participants if p.user_id == current_user_id), None)
    unread_count = 0
    if me:
        q = db.query(Message).filter(
            Message.conversation_id == conv.id, Message.sender_id != current_user_id
        )
        if me.last_read_at:
            q = q.filter(Message.created_at > me.last_read_at)
        unread_count = q.count()

    if conv.type == ConversationType.direct:
        other = next((p for p in participants if p.user_id != current_user_id), None)
        name = other.user.display_name if other else conv.name
        avatar_color = other.user.avatar_color if other else conv.avatar_color
        avatar_emoji = other.user.avatar_emoji if other else conv.avatar_emoji
    else:
        name = conv.name
        avatar_color = conv.avatar_color
        avatar_emoji = conv.avatar_emoji

    return schemas.ConversationOut(
        id=conv.id,
        type=conv.type.value,
        name=name,
        avatar_color=avatar_color,
        avatar_emoji=avatar_emoji,
        disappearing_seconds=conv.disappearing_seconds,
        updated_at=conv.updated_at,
        participants=[schemas.ParticipantOut.model_validate(p) for p in participants],
        last_message=_message_out(last_message, recipient_count) if last_message else None,
        pinned_messages=[_message_out(m, recipient_count) for m in pinned],
        unread_count=unread_count,
        archived=bool(me.archived) if me else False,
        muted=bool(me.muted) if me else False,
    )


@router.get("", response_model=list[schemas.ConversationOut])
def list_conversations(
    current_user: User = Depends(get_current_user),
    db: DbSession = Depends(get_db),
):
    convs = (
        db.query(Conversation)
        .join(ConversationParticipant)
        .filter(ConversationParticipant.user_id == current_user.id)
        .options(joinedload(Conversation.participants).joinedload(ConversationParticipant.user))
        .order_by(Conversation.updated_at.desc())
        .all()
    )
    return [_conversation_out(db, c, current_user.id) for c in convs]


@router.post("/direct", response_model=schemas.ConversationOut)
def create_direct_conversation(
    payload: schemas.CreateDirectConversationRequest,
    current_user: User = Depends(get_current_user),
    db: DbSession = Depends(get_db),
):
    other = db.query(User).filter(User.id == payload.user_id).first()
    if not other:
        raise HTTPException(status_code=404, detail="User not found")
    if other.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot message yourself")

    existing = (
        db.query(Conversation)
        .filter(Conversation.type == ConversationType.direct)
        .join(ConversationParticipant)
        .filter(ConversationParticipant.user_id.in_([current_user.id, other.id]))
        .all()
    )
    for conv in existing:
        member_ids = {p.user_id for p in conv.participants}
        if member_ids == {current_user.id, other.id}:
            return _conversation_out(db, conv, current_user.id)

    conv = Conversation(type=ConversationType.direct, created_by=current_user.id)
    db.add(conv)
    db.flush()
    db.add(ConversationParticipant(conversation_id=conv.id, user_id=current_user.id))
    db.add(ConversationParticipant(conversation_id=conv.id, user_id=other.id))
    db.commit()
    db.refresh(conv)
    return _conversation_out(db, conv, current_user.id)


@router.post("/group", response_model=schemas.ConversationOut)
def create_group(
    payload: schemas.CreateGroupRequest,
    current_user: User = Depends(get_current_user),
    db: DbSession = Depends(get_db),
):
    member_ids = set(payload.member_ids) - {current_user.id}
    if not member_ids:
        raise HTTPException(status_code=400, detail="Select at least one other member")
    members = db.query(User).filter(User.id.in_(member_ids)).all()
    if len(members) != len(member_ids):
        raise HTTPException(status_code=404, detail="One or more users not found")

    conv = Conversation(
        type=ConversationType.group,
        name=payload.name,
        avatar_emoji=payload.avatar_emoji or "👥",
        avatar_color=payload.avatar_color or "#2C6BED",
        created_by=current_user.id,
    )
    db.add(conv)
    db.flush()
    db.add(
        ConversationParticipant(conversation_id=conv.id, user_id=current_user.id, is_admin=True)
    )
    for m in members:
        db.add(ConversationParticipant(conversation_id=conv.id, user_id=m.id))
    db.add(
        Message(
            conversation_id=conv.id,
            sender_id=current_user.id,
            content=f"{current_user.display_name} created the group \"{payload.name}\"",
            is_system=True,
        )
    )
    db.commit()
    db.refresh(conv)
    return _conversation_out(db, conv, current_user.id)


@router.get("/{conversation_id}", response_model=schemas.ConversationOut)
def get_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: DbSession = Depends(get_db),
):
    _require_participant(db, conversation_id, current_user.id)
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    return _conversation_out(db, conv, current_user.id)


@router.post("/{conversation_id}/archive", response_model=schemas.ConversationOut)
def archive_conversation(
    conversation_id: str,
    payload: schemas.ArchiveConversationRequest,
    current_user: User = Depends(get_current_user),
    db: DbSession = Depends(get_db),
):
    # Archiving is per-user (lives on the participant row), not a shared conversation
    # property — one person archiving a chat shouldn't hide it for everyone else in it.
    participant = _require_participant(db, conversation_id, current_user.id)
    participant.archived = payload.archived
    db.commit()
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    return _conversation_out(db, conv, current_user.id)


@router.patch("/{conversation_id}", response_model=schemas.ConversationOut)
def update_conversation(
    conversation_id: str,
    payload: schemas.UpdateConversationRequest,
    current_user: User = Depends(get_current_user),
    db: DbSession = Depends(get_db),
):
    participant = _require_participant(db, conversation_id, current_user.id)
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if conv.type == ConversationType.group and not participant.is_admin:
        raise HTTPException(status_code=403, detail="Only admins can edit the group")
    if payload.name is not None:
        conv.name = payload.name
    if payload.disappearing_seconds is not None:
        conv.disappearing_seconds = payload.disappearing_seconds
    conv.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(conv)
    return _conversation_out(db, conv, current_user.id)


@router.post("/{conversation_id}/members", response_model=schemas.ConversationOut)
async def add_member(
    conversation_id: str,
    payload: schemas.AddMemberRequest,
    current_user: User = Depends(get_current_user),
    db: DbSession = Depends(get_db),
):
    participant = _require_participant(db, conversation_id, current_user.id)
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if conv.type != ConversationType.group:
        raise HTTPException(status_code=400, detail="Not a group")
    if not participant.is_admin:
        raise HTTPException(status_code=403, detail="Only admins can add members")
    target = db.query(User).filter(User.id == payload.user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    exists = (
        db.query(ConversationParticipant)
        .filter(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == target.id,
        )
        .first()
    )
    if exists:
        raise HTTPException(status_code=400, detail="Already a member")
    db.add(ConversationParticipant(conversation_id=conversation_id, user_id=target.id))
    db.add(
        Message(
            conversation_id=conversation_id,
            sender_id=current_user.id,
            content=f"{current_user.display_name} added {target.display_name}",
            is_system=True,
        )
    )
    db.commit()
    db.refresh(conv)
    result = _conversation_out(db, conv, current_user.id)
    member_ids = [p.user_id for p in conv.participants]
    await manager.send_to_users(
        member_ids, {"type": "conversation_update", "conversation": result.model_dump(mode="json")}
    )
    return result


@router.delete("/{conversation_id}/members/{user_id}", response_model=schemas.ConversationOut)
async def remove_member(
    conversation_id: str,
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: DbSession = Depends(get_db),
):
    participant = _require_participant(db, conversation_id, current_user.id)
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if conv.type != ConversationType.group:
        raise HTTPException(status_code=400, detail="Not a group")
    is_self_leave = user_id == current_user.id
    if not is_self_leave and not participant.is_admin:
        raise HTTPException(status_code=403, detail="Only admins can remove members")
    target = db.query(User).filter(User.id == user_id).first()
    target_p = (
        db.query(ConversationParticipant)
        .filter(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == user_id,
        )
        .first()
    )
    if not target_p:
        raise HTTPException(status_code=404, detail="Not a member")
    member_ids_before = [p.user_id for p in conv.participants]
    db.delete(target_p)
    verb = "left" if is_self_leave else f"was removed by {current_user.display_name}"
    db.add(
        Message(
            conversation_id=conversation_id,
            sender_id=current_user.id,
            content=f"{target.display_name} {verb}",
            is_system=True,
        )
    )
    db.commit()
    db.refresh(conv)
    result = _conversation_out(db, conv, current_user.id)
    await manager.send_to_users(
        member_ids_before,
        {"type": "conversation_update", "conversation": result.model_dump(mode="json")},
    )
    return result


@router.patch("/{conversation_id}/members/{user_id}")
def set_admin(
    conversation_id: str,
    user_id: str,
    is_admin: bool,
    current_user: User = Depends(get_current_user),
    db: DbSession = Depends(get_db),
):
    participant = _require_participant(db, conversation_id, current_user.id)
    if not participant.is_admin:
        raise HTTPException(status_code=403, detail="Only admins can change roles")
    target_p = (
        db.query(ConversationParticipant)
        .filter(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == user_id,
        )
        .first()
    )
    if not target_p:
        raise HTTPException(status_code=404, detail="Not a member")
    target_p.is_admin = is_admin
    db.commit()
    return {"ok": True}


@router.post("/{conversation_id}/read")
async def mark_read(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: DbSession = Depends(get_db),
):
    participant = _require_participant(db, conversation_id, current_user.id)
    participant.last_read_at = datetime.now(timezone.utc)

    senders_to_notify: dict[str, list[str]] = {}
    # If the reader has read receipts turned off, we still track their own unread
    # count (last_read_at above) but never flip a status to "read" or tell the
    # sender — mirrors Signal's "you don't send receipts if you've disabled them".
    if current_user.read_receipts_enabled:
        unread_messages = (
            db.query(Message)
            .filter(
                Message.conversation_id == conversation_id,
                Message.sender_id != current_user.id,
            )
            .all()
        )
        for msg in unread_messages:
            status_row = None
            for s in msg.statuses:
                if s.user_id == current_user.id:
                    status_row = s
                    break
            if status_row and status_row.status != MessageStatusEnum.read:
                status_row.status = MessageStatusEnum.read
                status_row.updated_at = datetime.now(timezone.utc)
                senders_to_notify.setdefault(msg.sender_id, []).append(msg.id)
    db.commit()

    for sender_id, message_ids in senders_to_notify.items():
        await manager.send_to_user(
            sender_id,
            {
                "type": "status_update",
                "conversation_id": conversation_id,
                "message_ids": message_ids,
                "user_id": current_user.id,
                "status": "read",
            },
        )
    return {"ok": True}
