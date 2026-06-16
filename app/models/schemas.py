from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ─── Auth ────────────────────────────────────────────────────────────────────

class TelegramAuthRequest(BaseModel):
    init_data: str = Field(..., description="Telegram WebApp initData string")


class AuthResponse(BaseModel):
    access_token: str
    user_id: UUID
    is_new_user: bool


# ─── Profile ─────────────────────────────────────────────────────────────────

class ProfileBase(BaseModel):
    phone: Optional[str] = Field(None, max_length=50)
    age: Optional[int] = Field(None, ge=16, le=100)
    bio: Optional[str] = Field(None, max_length=500)
    interests: List[str] = Field(default_factory=list, max_items=15)
    mode: str = Field(
        "friends", pattern="^(dating|friends|business|travel)$"
    )
    gender: Optional[str] = None
    show_gender: bool = True
    is_visible: bool = True


class ProfileUpdate(ProfileBase):
    pass


class ProfileOut(ProfileBase):
    user_id: UUID
    updated_at: datetime

    class Config:  # noqa: E501
        from_attributes = True


class UserOut(BaseModel):
    id: UUID
    name: str
    username: Optional[str]
    avatar: Optional[str]
    profile: Optional[ProfileOut]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Geo ─────────────────────────────────────────────────────────────────────

class LocationUpdate(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    accuracy: Optional[float] = Field(None, ge=0)


class NearbyUser(BaseModel):
    user_id: UUID
    name: str
    avatar: Optional[str]
    age: Optional[int]
    bio: Optional[str]
    interests: List[str]
    mode: str
    distance_bucket: str  # "50m" | "100m" | "500m" | "1km" | "—"  # noqa: E501
    is_online: bool = False

    class Config:
        from_attributes = True


class NearbyResponse(BaseModel):  # noqa: E501
    users: List[NearbyUser]
    total: int
    radius_meters: int


class ZoneCluster(BaseModel):
    zone_name: str
    user_count: int
    radius_meters: int


class MapZonesResponse(BaseModel):
    zones: List[ZoneCluster]


# ─── Interactions ─────────────────────────────────────────────────────────────

class InterestRequest(BaseModel):
    to_user_id: UUID


class InterestResponse(BaseModel):
    is_match: bool
    match_id: Optional[UUID] = None
    message: str


class MatchOut(BaseModel):
    id: UUID
    other_user: NearbyUser
    created_at: datetime
    last_message: Optional[str] = None

    class Config:
        from_attributes = True


# ─── Chat ─────────────────────────────────────────────────────────────────────

class MessageCreate(BaseModel):
    match_id: UUID
    text: str = Field(..., min_length=1, max_length=2000)


class MessageOut(BaseModel):
    id: UUID
    match_id: UUID
    sender_id: UUID
    text: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ChatHistoryResponse(BaseModel):
    messages: List[MessageOut]
    match_id: UUID
    total: int


# ─── WebSocket ───────────────────────────────────────────────────────────────

class WSMessage(BaseModel):
    type: str  # "message" | "typing" | "read" | "ping"
    match_id: Optional[UUID] = None
    text: Optional[str] = None
    message_id: Optional[UUID] = None


class WSEvent(BaseModel):
    type: str
    data: dict
