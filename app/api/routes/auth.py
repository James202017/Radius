from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.session import get_db
from ...models.schemas import AuthResponse, TelegramAuthRequest
from ...services.auth_service import authenticate_telegram

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/telegram", response_model=AuthResponse)
async def telegram_auth(
    payload: TelegramAuthRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticate via Telegram WebApp initData.
    Returns JWT access token.
    """
    return await authenticate_telegram(payload.init_data, db)
