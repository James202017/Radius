from typing import List
from uuid import UUID

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..db.redis import publish_message
from ..models.models import Interaction, Match, Message, User
from ..models.schemas import InterestResponse, MatchOut, NearbyUser


async def send_interest(
    from_user_id: UUID,
    to_user_id: UUID,
    db: AsyncSession,
) -> InterestResponse:
    """
    Send interest signal to another user.
    If the other user already sent interest → create a Match.
    """
    # Check if already interacted
    existing = await db.execute(
        select(Interaction).where(
            Interaction.from_user == from_user_id,
            Interaction.to_user == to_user_id,
        )
    )
    if existing.scalar_one_or_none():
        return InterestResponse(
            is_match=False,
            message="Already sent interest to this user",
        )

    # Check if the other person already liked us
    reverse = await db.execute(
        select(Interaction).where(
            Interaction.from_user == to_user_id,
            Interaction.to_user == from_user_id,
            Interaction.type == "interest",
        )
    )
    reverse_interaction = reverse.scalar_one_or_none()

    # Save this interaction
    interaction = Interaction(
        from_user=from_user_id,
        to_user=to_user_id,
        type="interest",
    )
    db.add(interaction)

    if reverse_interaction:
        # Mutual interest → create Match
        # Enforce user1 < user2 constraint
        u1, u2 = sorted([from_user_id, to_user_id], key=lambda x: str(x))

        # Check if match already exists
        existing_match = await db.execute(
            select(Match).where(Match.user1 == u1, Match.user2 == u2)
        )
        match = existing_match.scalar_one_or_none()

        if not match:
            match = Match(user1=u1, user2=u2)
            db.add(match)

            # Update interaction types
            reverse_interaction.type = "match"
            interaction.type = "match"

        await db.flush()
        await db.commit()
        await db.refresh(match)

        # Notify both users via WebSocket
        await publish_message(
            f"user:{from_user_id}",
            {
                "type": "match",
                "match_id": str(match.id),
                "with_user": str(to_user_id),
            },
        )
        await publish_message(
            f"user:{to_user_id}",
            {
                "type": "match",
                "match_id": str(match.id),
                "with_user": str(from_user_id),
            },
        )

        return InterestResponse(
            is_match=True,
            match_id=match.id,
            message="It's a match! 🎉",
        )

    await db.commit()
    return InterestResponse(
        is_match=False,
        message="Interest sent!",
    )


async def get_user_matches(user_id: UUID, db: AsyncSession) -> List[MatchOut]:
    """Get all active matches for user."""
    result = await db.execute(
        select(Match).where(
            and_(
                or_(Match.user1 == user_id, Match.user2 == user_id),
                Match.is_active is True,
            )
        ).order_by(Match.created_at.desc())
    )
    matches = result.scalars().all()

    match_outs = []
    for match in matches:
        other_id = match.user2 if match.user1 == user_id else match.user1

        # Get other user profile
        user_result = await db.execute(
            select(User)
            .options(selectinload(User.profile))
            .where(User.id == other_id)
        )
        other_user = user_result.scalar_one_or_none()
        if not other_user:
            continue

        # Get last message
        msg_result = await db.execute(
            select(Message)
            .where(Message.match_id == match.id)
            .order_by(Message.created_at.desc())
            .limit(1)
        )
        last_msg = msg_result.scalar_one_or_none()

        profile = other_user.profile
        match_outs.append(
            MatchOut(
                id=match.id,
                other_user=NearbyUser(
                    user_id=other_user.id,
                    name=other_user.name,
                    avatar=other_user.avatar,
                    age=profile.age if profile else None,
                    bio=profile.bio if profile else None,
                    interests=profile.interests if profile else [],
                    mode=profile.mode if profile else "friends",
                    distance_bucket="—",
                    is_online=False,
                ),
                created_at=match.created_at,
                last_message=last_msg.text if last_msg else None,
            )
        )

    return match_outs
