from fastapi import Header, HTTPException
from app.core.config import settings

class User:
    def __init__(self, user_id: str, email: str, role: str):
        self.user_id = user_id
        self.email = email
        self.role = role

    def to_dict(self):
        return {"user_id": self.user_id, "email": self.email, "role": self.role}

async def get_current_user(authorization: str = Header(None)) -> User:
    """
    Description: FastAPI authentication dependency.
    Usecase: Provides mock-user bypass in development mode, replaced with Clerk/Supabase Auth JWT validation in production.
    """
    if settings.MOCK_AUTH_BYPASS or settings.APP_ENV == "development":
        return User(user_id="dev_user_001", email="developer@sqlguard.local", role="admin")

    if not authorization:
        raise HTTPException(status_code=401, detail="Authentication token missing.")

    # Phase 2 production auth token parsing (Clerk / Supabase Auth)
    return User(user_id="prod_user_001", email="user@sqlguard.com", role="analyst")
