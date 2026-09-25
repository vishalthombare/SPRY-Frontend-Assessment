"""Authentication business logic independent of HTTP routing."""

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, verify_password
from app.models.user import User


class EmailAlreadyRegisteredError(Exception):
    """Raised when registration cannot use an existing email address."""


async def register_user(
    session: AsyncSession,
    *,
    email: str,
    full_name: str,
    password: str,
    is_2fa_enabled: bool = False,
    created_by: int,
) -> User:
    """Create a standard active user while keeping password storage one-way hashed."""
    # Store one canonical representation so login and uniqueness checks stay predictable.
    normalized_email = email.strip().lower()
    existing_user = await session.scalar(
        select(User.id).where(func.lower(User.email) == normalized_email)
    )
    if existing_user is not None:
        raise EmailAlreadyRegisteredError

    # API registration never grants administrator privileges.
    user = User(
        email=normalized_email,
        full_name=full_name.strip(),
        password_hash=hash_password(password),
        is_superuser=False,
        is_2fa_enabled=is_2fa_enabled,
    )
    session.add(user)
    try:
        # Flush validates the insert before audit metadata and the transaction are committed.
        await session.flush()
        user.created_by = created_by
        user.updated_by = created_by
        await session.commit()
        await session.refresh(user)
    except IntegrityError:
        # The database unique constraint handles two simultaneous registrations safely.
        await session.rollback()
        raise EmailAlreadyRegisteredError from None
    return user


async def authenticate_user(session: AsyncSession, email: str, password: str) -> User | None:
    """Return an eligible user only when the supplied password is valid."""
    # Email matching is case-insensitive and deleted/disabled accounts cannot sign in.
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
