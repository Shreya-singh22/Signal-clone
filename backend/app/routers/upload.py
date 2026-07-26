import os
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from ..deps import get_current_user
from ..models import User

router = APIRouter(prefix="/api/upload", tags=["upload"])

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_BYTES = 10 * 1024 * 1024
ALLOWED_EXT = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".pdf", ".txt", ".zip", ".mp4", ".mp3"}


@router.post("")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    contents = await file.read()
    if len(contents) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    stored_name = f"{uuid.uuid4().hex}{ext}"
    with open(os.path.join(UPLOAD_DIR, stored_name), "wb") as f:
        f.write(contents)

    is_image = ext in {".png", ".jpg", ".jpeg", ".gif", ".webp"}
    return {
        "url": f"/uploads/{stored_name}",
        "type": "image" if is_image else "file",
        "name": file.filename,
    }
