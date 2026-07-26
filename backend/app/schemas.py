from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ---------- Auth ----------


class OtpRequest(BaseModel):
    phone_number: str


class OtpResponse(BaseModel):
    message: str
    dev_otp: str  # exposed for demo purposes since verification is mocked


class RegisterRequest(BaseModel):
    phone_number: str
    otp: str
    username: str
    display_name: str
    password: str
    avatar_color: Optional[str] = "#2C6BED"
    avatar_emoji: Optional[str] = "🙂"


class LoginRequest(BaseModel):
    identifier: str  # phone number or username
    password: str


class UserOut(BaseModel):
    id: str
    username: str
    display_name: str
    phone_number: Optional[str] = None
    about: Optional[str] = None
    avatar_color: str
    avatar_emoji: str
    is_online: bool
    last_seen_at: datetime
    read_receipts_enabled: bool = True
    typing_indicators_enabled: bool = True
    notifications_enabled: bool = True
    notification_preview_enabled: bool = True
    notification_sound_enabled: bool = True

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    token: str
    user: UserOut


class UpdateProfileRequest(BaseModel):
    display_name: Optional[str] = None
    about: Optional[str] = None
    avatar_color: Optional[str] = None
    avatar_emoji: Optional[str] = None


class UpdateSettingsRequest(BaseModel):
    read_receipts_enabled: Optional[bool] = None
    typing_indicators_enabled: Optional[bool] = None
    notifications_enabled: Optional[bool] = None
    notification_preview_enabled: Optional[bool] = None
    notification_sound_enabled: Optional[bool] = None


# ---------- Contacts ----------


class AddContactRequest(BaseModel):
    username: Optional[str] = None
    phone_number: Optional[str] = None
    nickname: Optional[str] = None


class UpdateContactRequest(BaseModel):
    is_blocked: Optional[bool] = None
    nickname: Optional[str] = None


class BlockUserRequest(BaseModel):
    user_id: str


class ContactOut(BaseModel):
    id: str
    user: UserOut
    nickname: Optional[str] = None
    is_blocked: bool = False

    class Config:
        from_attributes = True


# ---------- Conversations ----------


class CreateDirectConversationRequest(BaseModel):
    user_id: str


class CreateGroupRequest(BaseModel):
    name: str
    member_ids: list[str]
    avatar_emoji: Optional[str] = "👥"
    avatar_color: Optional[str] = "#2C6BED"


class UpdateConversationRequest(BaseModel):
    name: Optional[str] = None
    disappearing_seconds: Optional[int] = None


class ParticipantOut(BaseModel):
    user: UserOut
    is_admin: bool
    joined_at: datetime

    class Config:
        from_attributes = True


class ReactionOut(BaseModel):
    emoji: str
    user_id: str

    class Config:
        from_attributes = True


class MessageOut(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    content: Optional[str] = None
    attachment_url: Optional[str] = None
    attachment_type: Optional[str] = None
    attachment_name: Optional[str] = None
    reply_to_id: Optional[str] = None
    is_deleted: bool
    is_system: bool
    is_edited: bool = False
    is_forwarded: bool = False
    pinned_at: Optional[datetime] = None
    created_at: datetime
    edited_at: Optional[datetime] = None
    status: str = "sent"
    reactions: list[ReactionOut] = []

    class Config:
        from_attributes = True


class EditMessageRequest(BaseModel):
    content: str


class PinMessageRequest(BaseModel):
    pinned: bool


class ReceiptDetail(BaseModel):
    user: UserOut
    status: str
    updated_at: datetime


class MessageInfoOut(BaseModel):
    message: MessageOut
    sender: UserOut
    receipts: list[ReceiptDetail]


class ConversationOut(BaseModel):
    id: str
    type: str
    name: Optional[str] = None
    avatar_color: str
    avatar_emoji: str
    disappearing_seconds: int
    updated_at: datetime
    participants: list[ParticipantOut]
    last_message: Optional[MessageOut] = None
    pinned_messages: list[MessageOut] = []
    unread_count: int = 0
    archived: bool = False
    muted: bool = False
    pinned: bool = False
    marked_unread: bool = False

    class Config:
        from_attributes = True


class ArchiveConversationRequest(BaseModel):
    archived: bool


class FlagRequest(BaseModel):
    value: bool


class SendMessageRequest(BaseModel):
    content: Optional[str] = None
    reply_to_id: Optional[str] = None
    attachment_url: Optional[str] = None
    attachment_type: Optional[str] = None
    attachment_name: Optional[str] = None
    is_forwarded: Optional[bool] = False


class AddMemberRequest(BaseModel):
    user_id: str


class ReactionRequest(BaseModel):
    emoji: str
