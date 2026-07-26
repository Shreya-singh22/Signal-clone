from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session as DbSession

from .. import schemas
from ..database import get_db
from ..deps import get_current_user
from ..models import User
from ..ws_manager import manager

router = APIRouter(prefix="/api/users", tags=["users"])


def _with_presence(user: User) -> schemas.UserOut:
    out = schemas.UserOut.model_validate(user)
    out.is_online = manager.is_online(user.id)
    return out


@router.get("/search", response_model=list[schemas.UserOut])
def search_users(
    q: str = Query(min_length=1),
    current_user: User = Depends(get_current_user),
    db: DbSession = Depends(get_db),
):
    like = f"%{q}%"
    users = (
        db.query(User)
        .filter(
            User.id != current_user.id,
            or_(
                User.username.ilike(like),
                User.display_name.ilike(like),
                User.phone_number.ilike(like),
            ),
        )
        .limit(20)
        .all()
    )
    return [_with_presence(u) for u in users]


@router.patch("/me", response_model=schemas.UserOut)
def update_me(
    payload: schemas.UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: DbSession = Depends(get_db),
):
    for field in ("display_name", "about", "avatar_color", "avatar_emoji"):
        value = getattr(payload, field)
        if value is not None:
            setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return _with_presence(current_user)


@router.patch("/me/settings", response_model=schemas.UserOut)
def update_settings(
    payload: schemas.UpdateSettingsRequest,
    current_user: User = Depends(get_current_user),
    db: DbSession = Depends(get_db),
):
    for field in (
        "read_receipts_enabled",
        "typing_indicators_enabled",
        "notifications_enabled",
        "notification_preview_enabled",
        "notification_sound_enabled",
    ):
        value = getattr(payload, field)
        if value is not None:
            setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return _with_presence(current_user)
