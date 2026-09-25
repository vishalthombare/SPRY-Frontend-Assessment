"""Persisted, single-use email OTP authentication challenges."""

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class AuthOtpChallenge(Base):
    """Hashed OTP state stored separately from the user account."""

    __tablename__ = "auth_otp_challenges"
    __table_args__ = (
        # This partial index accelerates lookup and invalidation of unverified challenges.
        Index(
            "ix_auth_otp_challenges_active_user",
            "user_id",
            postgresql_where=text("verified_at IS NULL"),
        ),
    )

    # Keep the internal relational key numeric while exposing only the opaque UUID to clients.
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    # This UUID is the only challenge identifier returned through the public API.
    challenge_id: Mapped[UUID] = mapped_column(
        default=uuid4, unique=True, index=True, nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    # The plain six-digit OTP is never stored in the database.
    otp_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), index=True, nullable=False
    )
    attempt_count: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )
    resend_count: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )
    last_sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    # A non-null value marks the challenge as consumed and prevents replay.
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()"), nullable=False
    )

    user: Mapped["User"] = relationship(back_populates="otp_challenges")
