import os
from datetime import timezone

from sqlalchemy import DateTime, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.types import TypeDecorator

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Overridable so a host with a persistent disk (Render, Railway, Fly) can point
# this at the mounted volume instead of the container's ephemeral filesystem.
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'signam.db')}")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


class UTCDateTime(TypeDecorator):
    """A DateTime column that's always timezone-aware UTC on the Python side.

    SQLite has no real timezone-aware storage — SQLAlchemy silently returns a
    *naive* datetime after a round-trip through the DB (e.g. right after
    db.commit() expires and reloads an ORM object). Every datetime in this app
    is UTC by convention (see models.now()), but a naive datetime serializes
    to JSON without a "Z"/offset suffix, and browsers parse an offset-less
    ISO string as *local* time, not UTC — silently shifting every timestamp
    (message times, last-seen, etc.) by the viewer's UTC offset. This type
    closes that gap in one place instead of requiring every call site to
    remember to re-attach tzinfo.
    """

    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None and value.tzinfo is not None:
            value = value.astimezone(timezone.utc).replace(tzinfo=None)
        return value

    def process_result_value(self, value, dialect):
        if value is not None and value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
