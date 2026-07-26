import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from .database import Base, UTCDateTime


def gen_uuid() -> str:
    return str(uuid.uuid4())


def now() -> datetime:
    return datetime.now(timezone.utc)


class ConversationType(str, enum.Enum):
    direct = "direct"
    group = "group"


class MessageStatusEnum(str, enum.Enum):
    sending = "sending"
    sent = "sent"
    delivered = "delivered"
    read = "read"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    phone_number = Column(String, unique=True, index=True, nullable=True)
    username = Column(String, unique=True, index=True, nullable=False)
    display_name = Column(String, nullable=False)
    about = Column(String, default="Available")
    avatar_color = Column(String, default="#2C6BED")
    avatar_emoji = Column(String, default="🙂")
    password_hash = Column(String, nullable=False)
    is_online = Column(Boolean, default=False)
    last_seen_at = Column(UTCDateTime, default=now)
    created_at = Column(UTCDateTime, default=now)

    # Privacy settings (mocked but functional — enforced server-side, see routers)
    read_receipts_enabled = Column(Boolean, default=True)
    typing_indicators_enabled = Column(Boolean, default=True)

    # Notification settings (enforced client-side against these values)
    notifications_enabled = Column(Boolean, default=True)
    notification_preview_enabled = Column(Boolean, default=True)
    notification_sound_enabled = Column(Boolean, default=True)

    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    sent_messages = relationship("Message", back_populates="sender", cascade="all, delete-orphan")
    participations = relationship(
        "ConversationParticipant", back_populates="user", cascade="all, delete-orphan"
    )


class Session(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True, default=gen_uuid)
    token = Column(String, unique=True, index=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(UTCDateTime, default=now)
    expires_at = Column(UTCDateTime, nullable=True)

    user = relationship("User", back_populates="sessions")


class Contact(Base):
    __tablename__ = "contacts"
    __table_args__ = (UniqueConstraint("owner_id", "contact_user_id", name="uq_owner_contact"),)

    id = Column(String, primary_key=True, default=gen_uuid)
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)
    contact_user_id = Column(String, ForeignKey("users.id"), nullable=False)
    nickname = Column(String, nullable=True)
    is_blocked = Column(Boolean, default=False)
    created_at = Column(UTCDateTime, default=now)

    owner = relationship("User", foreign_keys=[owner_id])
    contact_user = relationship("User", foreign_keys=[contact_user_id])


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String, primary_key=True, default=gen_uuid)
    type = Column(Enum(ConversationType), nullable=False, default=ConversationType.direct)
    name = Column(String, nullable=True)  # group name only
    avatar_color = Column(String, default="#2C6BED")
    avatar_emoji = Column(String, default="👥")
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    disappearing_seconds = Column(Integer, default=0)  # 0 = off
    created_at = Column(UTCDateTime, default=now)
    updated_at = Column(UTCDateTime, default=now)  # bumped on new message, for sorting

    participants = relationship(
        "ConversationParticipant", back_populates="conversation", cascade="all, delete-orphan"
    )
    messages = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
    )


class ConversationParticipant(Base):
    __tablename__ = "conversation_participants"
    __table_args__ = (UniqueConstraint("conversation_id", "user_id", name="uq_conv_user"),)

    id = Column(String, primary_key=True, default=gen_uuid)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    is_admin = Column(Boolean, default=False)
    joined_at = Column(UTCDateTime, default=now)
    last_read_at = Column(UTCDateTime, nullable=True)
    archived = Column(Boolean, default=False)
    muted = Column(Boolean, default=False)

    conversation = relationship("Conversation", back_populates="participants")
    user = relationship("User", back_populates="participations")


class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=gen_uuid)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False)
    sender_id = Column(String, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=True)
    attachment_url = Column(String, nullable=True)
    attachment_type = Column(String, nullable=True)  # image, file
    attachment_name = Column(String, nullable=True)
    reply_to_id = Column(String, ForeignKey("messages.id"), nullable=True)
    is_deleted = Column(Boolean, default=False)
    is_system = Column(Boolean, default=False)  # "X added Y" events
    is_edited = Column(Boolean, default=False)
    is_forwarded = Column(Boolean, default=False)
    pinned_at = Column(UTCDateTime, nullable=True)
    created_at = Column(UTCDateTime, default=now)
    edited_at = Column(UTCDateTime, nullable=True)
    expires_at = Column(UTCDateTime, nullable=True)  # disappearing messages

    sender = relationship("User", back_populates="sent_messages")
    conversation = relationship("Conversation", back_populates="messages")
    reply_to = relationship("Message", remote_side=[id])
    statuses = relationship(
        "MessageStatus", back_populates="message", cascade="all, delete-orphan"
    )
    reactions = relationship(
        "MessageReaction", back_populates="message", cascade="all, delete-orphan"
    )


class MessageStatus(Base):
    """Per-recipient delivery/read receipt."""

    __tablename__ = "message_statuses"
    __table_args__ = (UniqueConstraint("message_id", "user_id", name="uq_message_user"),)

    id = Column(String, primary_key=True, default=gen_uuid)
    message_id = Column(String, ForeignKey("messages.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)  # recipient
    status = Column(Enum(MessageStatusEnum), default=MessageStatusEnum.sent)
    updated_at = Column(UTCDateTime, default=now)

    message = relationship("Message", back_populates="statuses")
    user = relationship("User")


class MessageReaction(Base):
    __tablename__ = "message_reactions"
    __table_args__ = (UniqueConstraint("message_id", "user_id", name="uq_reaction_user"),)

    id = Column(String, primary_key=True, default=gen_uuid)
    message_id = Column(String, ForeignKey("messages.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    emoji = Column(String, nullable=False)
    created_at = Column(UTCDateTime, default=now)

    message = relationship("Message", back_populates="reactions")
    user = relationship("User")
