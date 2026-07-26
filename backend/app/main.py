import asyncio
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import models
from .database import Base, SessionLocal, engine
from .models import User
from .routers import auth, contacts, conversations, messages, upload, users, ws
from .tasks import disappearing_messages_sweep_loop

Base.metadata.create_all(bind=engine)


def _reset_stale_presence() -> None:
    # The in-memory ConnectionManager always starts empty on boot, so any user
    # row left over from before a restart with is_online=True is stale — no
    # websocket is actually connected. Without this, that user would show as
    # permanently "Online" (and their last-seen would never appear) until they
    # happen to reconnect and disconnect again.
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        stale_online = db.query(User).filter(User.is_online.is_(True)).all()
        for u in stale_online:
            u.is_online = False
            u.last_seen_at = now
        if stale_online:
            db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    _reset_stale_presence()
    sweep_task = asyncio.create_task(disappearing_messages_sweep_loop())
    yield
    sweep_task.cancel()


app = FastAPI(title="Signam API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(contacts.router)
app.include_router(conversations.router)
app.include_router(messages.router)
app.include_router(upload.router)
app.include_router(ws.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
