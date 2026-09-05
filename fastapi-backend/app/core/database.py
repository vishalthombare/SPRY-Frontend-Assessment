"""SQLAlchemy engine, session factory, and FastAPI database dependency."""

from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings

settings = get_settings()

database_url = make_url(settings.async_database_url)
query = dict(database_url.query)
# asyncpg expects `ssl`; hosted PostgreSQL URLs often provide `sslmode` instead.
ssl_mode = query.pop("sslmode", None)
# asyncpg does not support libpq's channel_binding query option.
query.pop("channel_binding", None)
database_url = database_url.set(query=query)

engine = create_async_engine(
    database_url,
    connect_args={"ssl": ssl_mode} if ssl_mode else {},
    pool_pre_ping=True,
)
AsyncSessionFactory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db_session() -> AsyncIterator[AsyncSession]:
    """Provide one transaction-safe database session per request."""
    # The context manager always closes the session, including after an exception.
    async with AsyncSessionFactory() as session:
        yield session


# Routes use this alias to request a database session without repeating Depends(...).
DatabaseSession = Annotated[AsyncSession, Depends(get_db_session)]


async def check_database_connection() -> None:
    """Verify database connectivity without reading or changing application data."""
    async with engine.connect() as connection:
        await connection.execute(text("SELECT 1"))
