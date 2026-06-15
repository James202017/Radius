import json
from typing import Optional, Set

import redis.asyncio as aioredis

from ..core.config import settings

_redis_client: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
    return _redis_client


# Presence keys
def presence_key(user_id: str) -> str:
    return f"presence:{user_id}"


def online_users_key() -> str:
    return "online_users"


async def set_user_online(user_id: str, location: Optional[dict] = None):
    redis = await get_redis()
    pipe = redis.pipeline()
    pipe.setex(presence_key(user_id), settings.PRESENCE_TTL, "1")
    pipe.sadd(online_users_key(), user_id)
    pipe.expire(online_users_key(), settings.PRESENCE_TTL * 2)
    if location:
        pipe.setex(
            f"location_cache:{user_id}",
            settings.PRESENCE_TTL,
            json.dumps(location),
        )
    await pipe.execute()


async def set_user_offline(user_id: str):
    redis = await get_redis()
    pipe = redis.pipeline()
    pipe.delete(presence_key(user_id))
    pipe.srem(online_users_key(), user_id)
    await pipe.execute()


async def is_user_online(user_id: str) -> bool:
    redis = await get_redis()
    return bool(await redis.exists(presence_key(user_id)))


async def get_online_users() -> Set[str]:
    redis = await get_redis()
    return await redis.smembers(online_users_key())


async def cache_set(key: str, value: dict, ttl: int = 60):
    redis = await get_redis()
    await redis.setex(key, ttl, json.dumps(value))


async def cache_get(key: str) -> Optional[dict]:
    redis = await get_redis()
    data = await redis.get(key)
    return json.loads(data) if data else None


async def cache_delete(key: str):
    redis = await get_redis()
    await redis.delete(key)


async def publish_message(channel: str, message: dict):
    """Publish to Redis pub/sub for WebSocket fan-out."""
    redis = await get_redis()
    await redis.publish(channel, json.dumps(message))


async def close_redis():
    global _redis_client
    if _redis_client:
        await _redis_client.close()
        _redis_client = None
