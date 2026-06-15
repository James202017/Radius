from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.security import get_current_user_id
from ...core.session import get_db
from ...models.schemas import InterestRequest, InterestResponse, MatchOut
from ...services.match_service import get_user_matches, send_interest

router = APIRouter(tags=["interactions"])


@router.post("/interest", response_model=InterestResponse)
async def express_interest(
    payload: InterestRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Send interest signal to another user.
    If mutual → returns match_id.
    """
    return await send_interest(
        from_user_id=UUID(user_id),
        to_user_id=payload.to_user_id,
        db=db,
    )


@router.get("/matches", response_model=List[MatchOut])
async def list_matches(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get all active matches for current user."""
    return await get_user_matches(UUID(user_id), db)
