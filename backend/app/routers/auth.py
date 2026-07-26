import time

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session as DbSession

from .. import schemas
from ..database import get_db
from ..deps import get_current_user
from ..models import Session as SessionModel
from ..models import User
from ..security import MOCK_OTP, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

# in-memory pending OTPs for the mocked verification flow: phone_number -> otp
_pending_otps: dict[str, str] = {}

# Basic abuse-prevention for the OTP endpoint: this is a real, non-cryptographic
# rate limit (enumeration/spam protection), not part of the mocked-encryption
# simplification — an in-memory sliding window is fine for a single-process demo.
_OTP_RATE_LIMIT = 5
_OTP_RATE_WINDOW_SECONDS = 600
_otp_request_log: dict[str, list[float]] = {}


def _check_otp_rate_limit(phone_number: str) -> None:
    now = time.monotonic()
    window_start = now - _OTP_RATE_WINDOW_SECONDS
    recent = [t for t in _otp_request_log.get(phone_number, []) if t > window_start]
    if len(recent) >= _OTP_RATE_LIMIT:
        raise HTTPException(
            status_code=429, detail="Too many verification code requests. Try again in a few minutes."
        )
    recent.append(now)
    _otp_request_log[phone_number] = recent


@router.post("/otp/request", response_model=schemas.OtpResponse)
def request_otp(payload: schemas.OtpRequest):
    _check_otp_rate_limit(payload.phone_number)
    _pending_otps[payload.phone_number] = MOCK_OTP
    return schemas.OtpResponse(
        message=f"A verification code was sent to {payload.phone_number} (mocked).",
        dev_otp=MOCK_OTP,
    )


@router.post("/register", response_model=schemas.AuthResponse)
def register(payload: schemas.RegisterRequest, db: DbSession = Depends(get_db)):
    expected = _pending_otps.get(payload.phone_number, MOCK_OTP)
    if payload.otp != expected:
        raise HTTPException(status_code=400, detail="Invalid verification code")

    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.query(User).filter(User.phone_number == payload.phone_number).first():
        raise HTTPException(status_code=400, detail="Phone number already registered")

    user = User(
        phone_number=payload.phone_number,
        username=payload.username,
        display_name=payload.display_name,
        avatar_color=payload.avatar_color or "#2C6BED",
        avatar_emoji=payload.avatar_emoji or "🙂",
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    session = SessionModel(user_id=user.id)
    db.add(session)
    db.commit()
    db.refresh(session)
    _pending_otps.pop(payload.phone_number, None)

    return schemas.AuthResponse(token=session.token, user=schemas.UserOut.model_validate(user))


@router.post("/login", response_model=schemas.AuthResponse)
def login(payload: schemas.LoginRequest, db: DbSession = Depends(get_db)):
    identifier = payload.identifier.strip()
    user = (
        db.query(User)
        .filter(or_(User.phone_number == identifier, User.username == identifier))
        .first()
    )
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid phone number/username or password")

    session = SessionModel(user_id=user.id)
    db.add(session)
    db.commit()
    db.refresh(session)

    return schemas.AuthResponse(token=session.token, user=schemas.UserOut.model_validate(user))


@router.post("/logout")
def logout(
    current_user: User = Depends(get_current_user),
    db: DbSession = Depends(get_db),
):
    db.query(SessionModel).filter(SessionModel.user_id == current_user.id).delete()
    db.commit()
    return {"ok": True}


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user
