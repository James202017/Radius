
from uuid import UUID

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.redis import publish_message
from ..models.models import Match, Message
from ..models.schemas import ChatHistoryResponse, MessageOut


async def verify_match_access(
    match_id: UUID,
    user_id: UUID,
    db: AsyncSession,
) -> Match:
    """Ensure user is part of the match."""
    result = await db.execute(
        select(Match).where(
            and_(
                Match.id == match_id,
                or_(Match.user1 == user_id, Match.user2 == user_id),
                Match.is_active is True,
            )
        )
    )
    match = result.scalar_one_or_none()
    if not match:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Match not found or access denied",
        )
    return match


async def send_message(
    match_id: UUID,
    sender_id: UUID,
    text: str,
    db: AsyncSession,
) -> MessageOut:
    """Persist message and broadcast via Redis pub/sub."""
    await verify_match_access(match_id, sender_id, db)

    message = Message(
        match_id=match_id,
        sender_id=sender_id,
        text=text,
    )
    db.add(message)
    await db.flush()
    await db.commit()
    await db.refresh(message)

    msg_out = MessageOut(
        id=message.id,
        match_id=message.match_id,
        sender_id=message.sender_id,
        text=message.text,
        is_read=message.is_read,
        created_at=message.created_at,
    )

    # Broadcast to the match channel
    await publish_message(
        f"match:{match_id}",
        {"type": "message", "data": msg_out.model_dump(mode="json")},
    )

    return msg_out


async def get_chat_history(
    match_id: UUID,
    user_id: UUID,
    offset: int,
    limit: int,
    db: AsyncSession,
) -> ChatHistoryResponse:
    await verify_match_access(match_id, user_id, db)

    result = await db.execute(
        select(Message)
        .where(Message.match_id == match_id)
        .order_by(Message.created_at.asc())
        .offset(offset)
        .limit(limit)
    )
    messages = result.scalars().all()

    return ChatHistoryResponse(
        messages=[
            MessageOut(
                id=m.id,
                match_id=m.match_id,
                sender_id=m.sender_id,
                text=m.text,
                is_read=m.is_read,
                created_at=m.created_at,
            )
            for m in messages
        ],
        match_id=match_id,
        total=len(messages),
    )
