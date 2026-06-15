import asyncio
import json
import logging
from typing import Dict, Set

from fastapi import WebSocket, WebSocketDisconnect

from ..core.security import verify_access_token
from ..db.redis import (
    get_redis, publish_message, set_user_offline, set_user_online
)

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages WebSocket connections with Redis pub/sub for horizontal scaling.
    Each server instance handles its own connections.
    Redis pub/sub ensures messages reach connections on any server.
    """

    def __init__(self):
        # user_id → set of websockets (user can have multiple tabs)
        self._user_connections: Dict[str, Set[WebSocket]] = {}
        # match_id → set of user_ids in that chat
        self._match_subscriptions: Dict[str, Set[str]] = {}
        self._pubsub_task: asyncio.Task | None = None

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self._user_connections:
            self._user_connections[user_id] = set()
        self._user_connections[user_id].add(websocket)
        await set_user_online(user_id)
        logger.info(f"WS connected: {user_id}")

    async def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self._user_connections:
            self._user_connections[user_id].discard(websocket)
            if not self._user_connections[user_id]:
                del self._user_connections[user_id]
                await set_user_offline(user_id)
        logger.info(f"WS disconnected: {user_id}")

    async def send_to_user(self, user_id: str, data: dict):
        """Send message to all connections for a user on this server."""
        if user_id in self._user_connections:
            dead = set()
            for ws in self._user_connections[user_id]:
                try:
                    await ws.send_json(data)
                except Exception:
                    dead.add(ws)
            self._user_connections[user_id] -= dead

    async def subscribe_to_match(self, user_id: str, match_id: str):
        if match_id not in self._match_subscriptions:
            self._match_subscriptions[match_id] = set()
        self._match_subscriptions[match_id].add(user_id)

    async def broadcast_to_match(self, match_id: str, data: dict):
        """Send to all users in a match room on this server."""
        user_ids = self._match_subscriptions.get(match_id, set())
        for user_id in user_ids:
            await self.send_to_user(user_id, data)

    async def start_pubsub_listener(self):
        """Listen to Redis pub/sub and relay to local WebSocket connections."""
        redis = await get_redis()
        pubsub = redis.pubsub()

        # Subscribe to wildcard channels
        await pubsub.psubscribe("user:*", "match:*")

        async def _listen():
            async for msg in pubsub.listen():
                if msg["type"] not in ("pmessage", "message"):
                    continue
                try:
                    channel = msg.get("channel", "") or msg.get("pattern", "")
                    data = json.loads(msg["data"])

                    if channel.startswith("user:"):
                        user_id = channel.split(":", 1)[1]
                        await self.send_to_user(user_id, data)

                    elif channel.startswith("match:"):
                        match_id = channel.split(":", 1)[1]
                        await self.broadcast_to_match(match_id, data)

                except Exception as e:
                    logger.error(f"PubSub error: {e}")

        self._pubsub_task = asyncio.create_task(_listen())

    def stop_pubsub_listener(self):
        if self._pubsub_task:
            self._pubsub_task.cancel()


manager = ConnectionManager()


async def websocket_endpoint(websocket: WebSocket):
    """
    Main WebSocket entry point.
    Auth: ?token=<jwt> query param.
    """
    token = websocket.query_params.get("token")
    user_id = verify_access_token(token) if token else None

    if not user_id:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    await manager.connect(websocket, user_id)
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json(
                    {"type": "error", "detail": "Invalid JSON"}
                )
                continue

            msg_type = msg.get("type")

            if msg_type == "ping":
                await websocket.send_json({"type": "pong"})
                await set_user_online(user_id)

            elif msg_type == "join_chat":
                match_id = msg.get("match_id")
                if match_id:
                    await manager.subscribe_to_match(user_id, match_id)
                    await websocket.send_json(
                        {"type": "joined", "match_id": match_id}
                    )

            elif msg_type == "typing":
                match_id = msg.get("match_id")
                if match_id:
                    await publish_message(
                        f"match:{match_id}",
                        {
                            "type": "typing",
                            "user_id": user_id,
                            "match_id": match_id,
                        },
                    )

            else:
                await websocket.send_json(
                    {"type": "error", "detail": f"Unknown type: {msg_type}"}
                )

    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect(websocket, user_id)
