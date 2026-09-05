from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import verify_password
from app.models.user import User


async def authenticate_user(session: AsyncSession, email: str, password: str) -> User | None:
    """Return an eligible user only when the supplied password is valid."""
    user = await session.scalar(
        select(User).where(
            func.lower(User.email) == email.strip().lower(),
            User.is_active.is_(True),
            User.is_deleted.is_(False),
        )
    )
    if user is None or not verify_password(password, user.password_hash):
        return None
    return user
