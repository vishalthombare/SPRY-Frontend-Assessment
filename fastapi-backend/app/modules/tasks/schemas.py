"""Validation and response contracts for task-management endpoints."""

from datetime import date, datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.task import TaskStatus


class SortOrder(StrEnum):
    ASC = "asc"
    DESC = "desc"


class TaskSortField(StrEnum):
    DUE_DATE = "due_date"


class TaskWriteBase(BaseModel):
    """Fields shared by task creation and replacement."""

    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=500)
    status: TaskStatus = TaskStatus.PENDING
    due_date: date

    # @field_validator normalizes and validates input before services receive it.
    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        """Trim a title and reject values that contain only whitespace."""
        value = value.strip()
        if not value:
            raise ValueError("Title must not contain only whitespace.")
        return value

    @field_validator("description")
    @classmethod
    def normalize_description(cls, value: str | None) -> str | None:
        """Store empty descriptions consistently as null."""
        if value is None:
            return None
        value = value.strip()
        return value or None

    @field_validator("due_date")
    @classmethod
    def validate_due_date(cls, value: date) -> date:
        """Prevent creation or replacement with an already-expired due date."""
        if value < date.today():
            raise ValueError("Due date must be today or later.")
        return value


class TaskCreate(TaskWriteBase):
    """Payload used to create a task."""


class TaskUpdate(TaskWriteBase):
    """Payload used to replace editable task fields."""


class TaskResponse(BaseModel):
    """Task representation returned to authenticated clients."""

    # ConfigDict(from_attributes=True) converts SQLAlchemy Task instances into JSON responses.
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None
    status: TaskStatus
    due_date: date
    completed_date: datetime | None
    created_date: datetime
    updated_date: datetime


class TaskSummaryResponse(BaseModel):
    """Counts calculated from one user's active task collection."""

    total: int
    pending: int
    in_progress: int
    completed: int
