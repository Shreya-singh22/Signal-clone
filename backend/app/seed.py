"""Seed the SQLite database with demo users, contacts, conversations and messages.

Run with: python -m app.seed
"""

from datetime import datetime, timedelta, timezone

from .database import Base, SessionLocal, engine
from .models import (
    Contact,
    Conversation,
    ConversationParticipant,
    ConversationType,
    Message,
    MessageReaction,
    MessageStatus,
    MessageStatusEnum,
    User,
)
from .security import hash_password

NOW = datetime.now(timezone.utc)


def t(minutes_ago: int) -> datetime:
    return NOW - timedelta(minutes=minutes_ago)


def run():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    users_data = [
        dict(
            username="alice",
            display_name="Alice Johnson",
            phone_number="+919876543201",
            about="Building Signal ✨",
            avatar_color="#2C6BED",
            avatar_emoji="👩‍💻",
        ),
        dict(
            username="bob",
            display_name="Bob Smith",
            phone_number="+919876543202",
            about="Coffee first, code second",
            avatar_color="#3AA3E3",
            avatar_emoji="🧑‍🎨",
        ),
        dict(
            username="carol",
            display_name="Carol Davis",
            phone_number="+919876543203",
            about="Product manager & plant parent",
            avatar_color="#D0895F",
            avatar_emoji="🌿",
        ),
        dict(
            username="dave",
            display_name="Dave Wilson",
            phone_number="+919876543204",
            about="On a boat 🚤",
            avatar_color="#6C63C7",
            avatar_emoji="🎧",
        ),
        dict(
            username="erin",
            display_name="Erin Baker",
            phone_number="+919876543205",
            about="Signal > texting",
            avatar_color="#4CAF7D",
            avatar_emoji="📚",
        ),
    ]

    users: dict[str, User] = {}
    for data in users_data:
        u = User(password_hash=hash_password("password123"), **data)
        db.add(u)
        users[data["username"]] = u
    db.flush()

    alice, bob, carol, dave, erin = (
        users["alice"],
        users["bob"],
        users["carol"],
        users["dave"],
        users["erin"],
    )

    for other in (bob, carol, dave, erin):
        db.add(Contact(owner_id=alice.id, contact_user_id=other.id))
    db.add(Contact(owner_id=bob.id, contact_user_id=alice.id))
    db.add(Contact(owner_id=carol.id, contact_user_id=alice.id))
    db.flush()

    def make_direct(user_a: User, user_b: User) -> Conversation:
        conv = Conversation(type=ConversationType.direct, created_by=user_a.id)
        db.add(conv)
        db.flush()
        db.add(ConversationParticipant(conversation_id=conv.id, user_id=user_a.id))
        db.add(ConversationParticipant(conversation_id=conv.id, user_id=user_b.id))
        db.flush()
        return conv

    def send(conv: Conversation, sender: User, content: str, minutes_ago: int, mark_read_by: list[User] | None = None):
        msg = Message(
            conversation_id=conv.id,
            sender_id=sender.id,
            content=content,
            created_at=t(minutes_ago),
        )
        db.add(msg)
        db.flush()
        others = [p.user for p in conv.participants if p.user_id != sender.id]
        mark_read_by = mark_read_by or []
        for o in others:
            status = MessageStatusEnum.read if o in mark_read_by else MessageStatusEnum.delivered
            db.add(MessageStatus(message_id=msg.id, user_id=o.id, status=status))
        conv.updated_at = t(minutes_ago)
        return msg

    # --- Alice & Bob: fully read conversation ---
    ab = make_direct(alice, bob)
    send(ab, bob, "Hey Alice! Did you check out the new Signal build?", 120, mark_read_by=[alice])
    send(ab, alice, "Just did — the message bubbles look great 👌", 118, mark_read_by=[bob])
    send(ab, bob, "Right? And the typing indicator feels snappy", 115, mark_read_by=[alice])
    send(ab, alice, "Let's demo it in standup tomorrow", 110, mark_read_by=[bob])
    last_ab = send(ab, bob, "Sounds good, I'll prep a few talking points", 5, mark_read_by=[alice])
    db.add(MessageReaction(message_id=last_ab.id, user_id=alice.id, emoji="👍"))

    # --- Alice & Carol: unread messages waiting for Alice ---
    ac = make_direct(alice, carol)
    send(ac, alice, "Carol, are we still on for the design review?", 240, mark_read_by=[carol])
    send(ac, carol, "Yes! I'll bring the updated mockups", 235, mark_read_by=[alice])
    send(ac, carol, "Quick q — should the group avatar be a photo or an emoji by default?", 20)
    send(ac, carol, "No rush, just thinking out loud", 18)

    # --- Alice & Dave: sent but not yet delivered/read (Dave offline) ---
    ad = make_direct(alice, dave)
    send(ad, alice, "Dave, welcome to Signal! 🎉", 60, mark_read_by=[dave])
    msg = send(ad, alice, "Ping me when you're back online", 3)
    db.flush()
    db.query(MessageStatus).filter(MessageStatus.message_id == msg.id).update(
        {"status": MessageStatusEnum.sent}
    )

    # --- Alice & Erin: fresh conversation, single message ---
    ae = make_direct(alice, erin)
    send(ae, erin, "Hi Alice, Carol gave me your contact — mind if I add you to the trip group?", 8)

    # --- Group: Design Team ---
    design = Conversation(
        type=ConversationType.group,
        name="Design Team",
        avatar_emoji="🎨",
        avatar_color="#8854D0",
        created_by=alice.id,
        updated_at=t(30),
    )
    db.add(design)
    db.flush()
    db.add(ConversationParticipant(conversation_id=design.id, user_id=alice.id, is_admin=True))
    db.add(ConversationParticipant(conversation_id=design.id, user_id=bob.id))
    db.add(ConversationParticipant(conversation_id=design.id, user_id=carol.id))
    db.flush()
    db.add(
        Message(
            conversation_id=design.id,
            sender_id=alice.id,
            content='Alice Johnson created the group "Design Team"',
            is_system=True,
            created_at=t(200),
        )
    )
    send(design, carol, "Pushed the new icon set to the shared drive", 90, mark_read_by=[alice, bob])
    send(design, bob, "These look awesome, love the rounded corners", 85, mark_read_by=[alice, carol])
    send(design, alice, "Agreed! Let's finalize the color tokens next", 30, mark_read_by=[bob])

    # --- Group: Weekend Trip ---
    trip = Conversation(
        type=ConversationType.group,
        name="Weekend Trip 🏖️",
        avatar_emoji="🏖️",
        avatar_color="#E0A030",
        created_by=alice.id,
        disappearing_seconds=0,
        updated_at=t(15),
    )
    db.add(trip)
    db.flush()
    db.add(ConversationParticipant(conversation_id=trip.id, user_id=alice.id, is_admin=True))
    db.add(ConversationParticipant(conversation_id=trip.id, user_id=bob.id))
    db.add(ConversationParticipant(conversation_id=trip.id, user_id=dave.id))
    db.add(ConversationParticipant(conversation_id=trip.id, user_id=erin.id))
    db.flush()
    db.add(
        Message(
            conversation_id=trip.id,
            sender_id=alice.id,
            content='Alice Johnson created the group "Weekend Trip 🏖️"',
            is_system=True,
            created_at=t(300),
        )
    )
    send(trip, dave, "Who's driving on Saturday?", 200, mark_read_by=[alice, bob, erin])
    send(trip, erin, "I can drive, my car fits 4", 190, mark_read_by=[alice, bob, dave])
    send(trip, bob, "I'll bring snacks and speakers 🔊", 100, mark_read_by=[alice, dave])
    send(trip, alice, "Perfect, see everyone at 8am!", 15)

    for p in alice.participations:
        if p.conversation_id in (ab.id, design.id):
            p.last_read_at = NOW

    db.commit()
    db.close()
    print("Seed complete. Demo accounts (password: password123):")
    for u in users_data:
        print(f"  {u['username']} — {u['display_name']}")


if __name__ == "__main__":
    run()
