from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import AuditMixin, Base

if TYPE_CHECKING:
    from app.models.task import Task


class User(AuditMixin, Base):
    """Authenticated account that owns tasks."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    is_superuser: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false", nullable=False
    )
    auth_version: Mapped[int] = mapped_column(default=0, server_default="0", nullable=False)
    tasks: Mapped[list["Task"]] = relationship(
        back_populates="owner",
        foreign_keys="Task.user_id",
        cascade="all, delete-orphan",
    )
