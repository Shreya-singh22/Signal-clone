import json

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.active: dict[str, set[WebSocket]] = {}

    async def connect(self, user_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self.active.setdefault(user_id, set()).add(ws)

    def disconnect(self, user_id: str, ws: WebSocket) -> None:
        conns = self.active.get(user_id)
        if conns and ws in conns:
            conns.discard(ws)
            if not conns:
                self.active.pop(user_id, None)

    def is_online(self, user_id: str) -> bool:
        return bool(self.active.get(user_id))

    async def send_to_user(self, user_id: str, payload: dict) -> None:
        conns = list(self.active.get(user_id, []))
        data = json.dumps(payload, default=str)
        for ws in conns:
            try:
                await ws.send_text(data)
            except Exception:
                self.disconnect(user_id, ws)

    async def send_to_users(self, user_ids: list[str], payload: dict) -> None:
        for uid in set(user_ids):
            await self.send_to_user(uid, payload)


manager = ConnectionManager()
