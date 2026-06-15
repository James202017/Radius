from uuid import UUID

from fastapi import APIRouter, Depends, Query, WebSocket
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.security import get_current_user_id
from ...core.session import get_db
from ...models.schemas import ChatHistoryResponse, MessageCreate, MessageOut
from ...services.chat_service import get_chat_history, send_message
from ...websocket.manager import websocket_endpoint

router = APIRouter(tags=["chat"])


@router.websocket("/ws/chat")
async def chat_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for real-time messaging.
    Auth via ?token=<jwt> query param.
    """
    await websocket_endpoint(websocket)


@router.post("/message", response_model=MessageOut)
async def post_message(
    payload: MessageCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Send a message (REST fallback for WebSocket)."""
    return await send_message(
        match_id=payload.match_id,
        sender_id=UUID(user_id),
        text=payload.text,
        db=db,
    )


@router.get("/chat/{match_id}", response_model=ChatHistoryResponse)
async def chat_history(
    match_id: UUID,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get paginated chat history for a match."""
    return await get_chat_history(
        match_id=match_id,
        user_id=UUID(user_id),
        offset=offset,
        limit=limit,
        db=db,
    )
