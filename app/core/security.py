import hashlib
import hmac
import json
import time
from typing import Optional
from urllib.parse import unquote

from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from .config import settings

security = HTTPBearer(auto_error=False)

ALGORITHM = "HS256"


def create_access_token(user_id: str) -> str:
    payload = {
        "sub": str(user_id),
        "iat": time.time(),
        "exp": time.time() + settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def verify_access_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[ALGORITHM]
        )
        return payload.get("sub")
    except JWTError:
        return None


def verify_telegram_webapp_data(init_data: str) -> Optional[dict]:
    """
    Verify Telegram WebApp initData signature.
    https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
    """
    try:
        parsed = dict(
            item.split("=", 1) for item in init_data.split("&") if "=" in item
        )
        received_hash = parsed.pop("hash", None)
        if not received_hash:
            return None

        # Build data-check-string
        data_check_string = "\n".join(
            f"{k}={unquote(v)}" for k, v in sorted(parsed.items())
        )

        # Create secret key from bot token
        secret_key = hmac.new(
            b"WebAppData",
            settings.TELEGRAM_BOT_TOKEN.encode(),
            hashlib.sha256,
        ).digest()

        # Compute expected hash
        expected_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(expected_hash, received_hash):
            return None

        # Check auth_date freshness (24 hours)
        auth_date = int(parsed.get("auth_date", 0))
        if time.time() - auth_date > 86400:
            return None

        # Parse user data
        user_data = json.loads(unquote(parsed.get("user", "{}")))
        return user_data

    except Exception:
        return None


async def get_current_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> str:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    user_id = verify_access_token(credentials.credentials)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    return user_id
