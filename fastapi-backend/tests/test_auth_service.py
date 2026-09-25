"""Unit tests for authentication business logic that does not depend on HTTP routing."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.service import EmailAlreadyRegisteredError, register_user


@pytest.mark.asyncio
async def test_register_user_normalizes_email_hashes_password_and_sets_audit_fields() -> None:
    session = MagicMock(spec=AsyncSession)
    session.scalar = AsyncMock(return_value=None)
    session.flush = AsyncMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    session.rollback = AsyncMock()

    with patch("app.modules.auth.service.hash_password", return_value="argon2-hash") as hasher:
        user = await register_user(
            session,
            email="  New.User@Example.COM ",
            full_name=" New User ",
            password="secure-password",
            is_2fa_enabled=True,
            created_by=7,
        )

    assert user.email == "new.user@example.com"
    assert user.full_name == "New User"
    assert user.password_hash == "argon2-hash"
    assert user.is_superuser is False
    assert user.is_2fa_enabled is True
    assert user.created_by == 7
    assert user.updated_by == 7
    hasher.assert_called_once_with("secure-password")
    session.commit.assert_awaited_once()
    session.refresh.assert_awaited_once_with(user)


@pytest.mark.asyncio
async def test_register_user_rejects_existing_email_before_hashing() -> None:
    session = MagicMock(spec=AsyncSession)
    session.scalar = AsyncMock(return_value=7)

    with (
        patch("app.modules.auth.service.hash_password") as hasher,
        pytest.raises(EmailAlreadyRegisteredError),
    ):
        await register_user(
            session,
            email="existing@example.com",
            full_name="Existing User",
            password="secure-password",
            created_by=7,
        )

    hasher.assert_not_called()
    session.add.assert_not_called()


@pytest.mark.asyncio
async def test_register_user_rolls_back_database_uniqueness_race() -> None:
    session = MagicMock(spec=AsyncSession)
    session.scalar = AsyncMock(return_value=None)
    session.flush = AsyncMock(side_effect=IntegrityError("insert", {}, Exception("duplicate")))
    session.rollback = AsyncMock()

    with pytest.raises(EmailAlreadyRegisteredError):
        await register_user(
            session,
            email="race@example.com",
            full_name="Race User",
            password="secure-password",
            created_by=7,
        )

    session.rollback.assert_awaited_once()
