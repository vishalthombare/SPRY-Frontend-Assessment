"""Interactive CLI for securely creating the initial administrator account."""

import asyncio
from getpass import getpass

from pydantic import EmailStr, TypeAdapter, ValidationError
from sqlalchemy import select

from app.core.database import AsyncSessionFactory, engine
from app.core.security import hash_password
from app.models.user import User

email_validator = TypeAdapter(EmailStr)


def collect_credentials() -> tuple[str, str, str]:
    """Collect and validate superuser details without echoing passwords."""
    raw_email = input("Email: ").strip().lower()
    try:
        email = str(email_validator.validate_python(raw_email))
    except ValidationError as error:
        raise ValueError("Enter a valid email address.") from error

    full_name = input("Full name: ").strip()
    if not full_name:
        raise ValueError("Full name is required.")

    # getpass prevents passwords from appearing in terminal output or shell history.
    password = getpass("Password: ")
    confirmation = getpass("Confirm password: ")
    if len(password) < 8:
        raise ValueError("Password must contain at least 8 characters.")
    if password != confirmation:
        raise ValueError("Passwords do not match.")

    return email, full_name, password


async def create_superuser(email: str, full_name: str, password: str) -> User:
    """Create one active superuser and record its self-audit identifiers."""
    async with AsyncSessionFactory() as session:
        existing_user = await session.scalar(select(User).where(User.email == email))
        if existing_user is not None:
            raise ValueError("A user with this email already exists.")

        user = User(
            email=email,
            full_name=full_name,
            password_hash=hash_password(password),
            is_superuser=True,
        )
        session.add(user)
        # Flush assigns the integer ID before self-referencing audit fields are set.
        await session.flush()
        user.created_by = user.id
        user.updated_by = user.id
        await session.commit()
        return user


async def run() -> None:
    """Run the interactive superuser workflow and release database resources."""
    try:
        email, full_name, password = collect_credentials()
        user = await create_superuser(email, full_name, password)
        print(f"Superuser created successfully: {user.email}")
    except ValueError as error:
        raise SystemExit(f"Error: {error}") from error
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
