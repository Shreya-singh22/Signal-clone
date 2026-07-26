from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DbSession

from .. import schemas
from ..database import get_db
from ..deps import get_current_user
from ..models import Contact, User
from ..ws_manager import manager

router = APIRouter(prefix="/api/contacts", tags=["contacts"])


def _contact_out(contact: Contact) -> schemas.ContactOut:
    user_out = schemas.UserOut.model_validate(contact.contact_user)
    user_out.is_online = manager.is_online(contact.contact_user.id)
    return schemas.ContactOut(
        id=contact.id, user=user_out, nickname=contact.nickname, is_blocked=bool(contact.is_blocked)
    )


@router.get("", response_model=list[schemas.ContactOut])
def list_contacts(
    current_user: User = Depends(get_current_user),
    db: DbSession = Depends(get_db),
):
    contacts = db.query(Contact).filter(Contact.owner_id == current_user.id).all()
    return [_contact_out(c) for c in contacts]


@router.post("", response_model=schemas.ContactOut)
def add_contact(
    payload: schemas.AddContactRequest,
    current_user: User = Depends(get_current_user),
    db: DbSession = Depends(get_db),
):
    query = db.query(User)
    if payload.username:
        target = query.filter(User.username == payload.username).first()
    elif payload.phone_number:
        target = query.filter(User.phone_number == payload.phone_number).first()
    else:
        raise HTTPException(status_code=400, detail="username or phone_number required")

    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot add yourself")

    existing = (
        db.query(Contact)
        .filter(Contact.owner_id == current_user.id, Contact.contact_user_id == target.id)
        .first()
    )
    if existing:
        return _contact_out(existing)

    contact = Contact(
        owner_id=current_user.id, contact_user_id=target.id, nickname=payload.nickname
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return _contact_out(contact)


@router.patch("/{contact_id}", response_model=schemas.ContactOut)
def update_contact(
    contact_id: str,
    payload: schemas.UpdateContactRequest,
    current_user: User = Depends(get_current_user),
    db: DbSession = Depends(get_db),
):
    contact = (
        db.query(Contact)
        .filter(Contact.id == contact_id, Contact.owner_id == current_user.id)
        .first()
    )
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    if payload.is_blocked is not None:
        contact.is_blocked = payload.is_blocked
    if payload.nickname is not None:
        contact.nickname = payload.nickname
    db.commit()
    db.refresh(contact)
    return _contact_out(contact)


def _block(db: DbSession, owner_id: str, target_id: str, blocked: bool) -> Contact:
    contact = (
        db.query(Contact)
        .filter(Contact.owner_id == owner_id, Contact.contact_user_id == target_id)
        .first()
    )
    if not contact:
        contact = Contact(owner_id=owner_id, contact_user_id=target_id, is_blocked=blocked)
        db.add(contact)
    else:
        contact.is_blocked = blocked
    db.commit()
    db.refresh(contact)
    return contact


@router.post("/block", response_model=schemas.ContactOut)
def block_user(
    payload: schemas.BlockUserRequest,
    current_user: User = Depends(get_current_user),
    db: DbSession = Depends(get_db),
):
    if payload.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot block yourself")
    target = db.query(User).filter(User.id == payload.user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    return _contact_out(_block(db, current_user.id, target.id, True))


@router.post("/unblock", response_model=schemas.ContactOut)
def unblock_user(
    payload: schemas.BlockUserRequest,
    current_user: User = Depends(get_current_user),
    db: DbSession = Depends(get_db),
):
    target = db.query(User).filter(User.id == payload.user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    return _contact_out(_block(db, current_user.id, target.id, False))


@router.delete("/{contact_id}")
def delete_contact(
    contact_id: str,
    current_user: User = Depends(get_current_user),
    db: DbSession = Depends(get_db),
):
    contact = (
        db.query(Contact)
        .filter(Contact.id == contact_id, Contact.owner_id == current_user.id)
        .first()
    )
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    db.delete(contact)
    db.commit()
    return {"ok": True}
