from typing import Optional
from uuid import UUID

from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import AsyncSession


from ..core.config import settings
from ..db.redis import is_user_online, set_user_online
from ..models.models import Location
from ..models.schemas import (
    MapZonesResponse,
    NearbyResponse,
    NearbyUser,
    ZoneCluster,
)


async def update_user_location(
    user_id: UUID,
    latitude: float,
    longitude: float,
    accuracy: Optional[float],
    db: AsyncSession,
) -> None:
    """Upsert user location. Only last position is stored."""
    result = await db.execute(
        select(Location).where(Location.user_id == user_id)
    )
    location = result.scalar_one_or_none()

    # PostGIS point: ST_MakePoint(lng, lat)
    point_wkt = f"SRID=4326;POINT({longitude} {latitude})"

    if location:
        location.point = point_wkt
        location.accuracy = accuracy
    else:
        location = Location(
            user_id=user_id,
            point=point_wkt,
            accuracy=accuracy,
        )
        db.add(location)

    await db.flush()

    # Update presence in Redis
    await set_user_online(
        str(user_id),
        location={"lat": latitude, "lng": longitude},
    )


async def get_nearby_users(
    user_id: UUID,
    latitude: float,
    longitude: float,
    radius_meters: int,
    mode: Optional[str],
    db: AsyncSession,
) -> NearbyResponse:
    """Find users within radius. Returns privacy-safe data only."""
    radius_meters = min(radius_meters, settings.MAX_SEARCH_RADIUS_METERS)

    # Call the PostgreSQL function
    result = await db.execute(
        text("""
            SELECT * FROM find_nearby_users(
                :lat, :lng, :radius, :user_id, :mode, :stale
            )
        """),
        {
            "lat": latitude,
            "lng": longitude,
            "radius": radius_meters,
            "user_id": str(user_id),
            "mode": mode,
            "stale": settings.LOCATION_STALE_MINUTES,
        },
    )
    rows = result.fetchall()

    # Enrich with online status from Redis
    nearby_users = []
    for row in rows:
        is_online = await is_user_online(str(row.user_id))
        nearby_users.append(
            NearbyUser(
                user_id=row.user_id,
                name=row.name,
                avatar=row.avatar,
                age=row.age,
                bio=row.bio,
                interests=row.interests or [],
                mode=row.mode,
                distance_bucket=row.distance_bucket,
                is_online=is_online,
            )
        )

    return NearbyResponse(
        users=nearby_users,
        total=len(nearby_users),
        radius_meters=radius_meters,
    )


async def get_map_zones(
    user_id: UUID,
    latitude: float,
    longitude: float,
    db: AsyncSession,
) -> MapZonesResponse:
    """
    Returns zone-level aggregated data for map view.
    NO individual user positions are exposed.
    """
    result = await db.execute(
        text("""
            SELECT * FROM get_zone_clusters(
                :lat, :lng, :user_id, :stale
            )
        """),
        {
            "lat": latitude,
            "lng": longitude,
            "user_id": str(user_id),
            "stale": settings.LOCATION_STALE_MINUTES,
        },
    )
    rows = result.fetchall()

    zone_radius_map = {
        "close": 100,
        "near": 300,
        "medium": 500,
        "far": 1000,
    }

    zones = [
        ZoneCluster(
            zone_name=row.zone_name,
            user_count=row.user_count or 0,
            radius_meters=zone_radius_map.get(row.zone_name, 500),
        )
        for row in rows
    ]

    return MapZonesResponse(zones=zones)
