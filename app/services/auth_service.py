from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..core.security import create_access_token, verify_telegram_webapp_data
from ..models.models import Profile, User
from ..models.schemas import AuthResponse


async def authenticate_telegram(
    init_data: str,
    db: AsyncSession,
) -> AuthResponse:
    """Authenticate user via Telegram WebApp initData."""
    telegram_user = verify_telegram_webapp_data(init_data)
    if not telegram_user:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Telegram auth data",
        )

    telegram_id = telegram_user.get("id")
    name = telegram_user.get("first_name", "")
    if telegram_user.get("last_name"):
        name += f" {telegram_user['last_name']}"
    username = telegram_user.get("username")
    avatar = telegram_user.get("photo_url")

    # Find or create user
    result = await db.execute(
        select(User)
        .options(selectinload(User.profile))
        .where(User.telegram_id == telegram_id)
    )
    user = result.scalar_one_or_none()
    is_new = False

    if not user:
        is_new = True
        user = User(
            telegram_id=telegram_id,
            name=name,
            username=username,
            avatar=avatar,
        )
        db.add(user)
        await db.flush()

        # Create default profile
        profile = Profile(user_id=user.id)
        db.add(profile)
        await db.flush()
    else:
        # Update name/avatar if changed
        user.name = name
        user.avatar = avatar
        if username:
            user.username = username

    await db.commit()
    await db.refresh(user)

    token = create_access_token(str(user.id))
    return AuthResponse(
        access_token=token,
        user_id=user.id,
        is_new_user=is_new,
    )


async def get_user_by_id(user_id: UUID, db: AsyncSession) -> Optional[User]:
    result = await db.execute(
        select(User)
        .options(selectinload(User.profile))
        .where(User.id == user_id)
    )
    return result.scalar_one_or_none()
