from datetime import date, datetime
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import AuditMixin, Base

if TYPE_CHECKING:
    from app.models.user import User


class TaskStatus(StrEnum):
    """Statuses supported by the assignment workflow."""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class Task(AuditMixin, Base):
    """Task owned by one authenticated user."""

    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[TaskStatus] = mapped_column(
        Enum(
            TaskStatus,
            name="task_status",
            values_callable=lambda enum: [item.value for item in enum],
        ),
        default=TaskStatus.PENDING,
        server_default=TaskStatus.PENDING.value,
        index=True,
        nullable=False,
    )
    due_date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    completed_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    owner: Mapped["User"] = relationship(back_populates="tasks", foreign_keys=[user_id])
