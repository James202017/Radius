from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.security import get_current_user_id
from ...core.session import get_db
from ...models.schemas import (
    LocationUpdate,
    MapZonesResponse,
    NearbyResponse,
)
from ...services.geo_service import (
    get_map_zones,
    get_nearby_users,
    update_user_location,
)

router = APIRouter(prefix="/location", tags=["geo"])


@router.post("/update", status_code=204)
async def update_location(
    payload: LocationUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Update current user position. Called every 10–30s from client."""
    await update_user_location(
        user_id=UUID(user_id),
        latitude=payload.latitude,
        longitude=payload.longitude,
        accuracy=payload.accuracy,
        db=db,
    )


@router.get("/nearby", response_model=NearbyResponse)
async def nearby_users(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    radius: int = Query(1000, ge=50, le=5000),
    mode: Optional[str] = Query(
        None, pattern="^(dating|friends|business|travel)$"
    ),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Get nearby users within radius.
    Returns privacy-safe data: no exact coordinates.
    """
    return await get_nearby_users(
        user_id=UUID(user_id),
        latitude=latitude,
        longitude=longitude,
        radius_meters=radius,
        mode=mode,
        db=db,
    )


@router.get("/zones", response_model=MapZonesResponse)
async def map_zones(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Get aggregated zone data for map view.
    Returns only counts per radius zone, no user positions.
    """
    return await get_map_zones(
        user_id=UUID(user_id),
        latitude=latitude,
        longitude=longitude,
        db=db,
    )
