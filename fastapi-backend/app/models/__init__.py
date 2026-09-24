"""Expose model metadata so SQLAlchemy and Alembic discover every table."""

from app.models.auth_otp_challenge import AuthOtpChallenge
from app.models.base import Base
from app.models.task import Task, TaskStatus
from app.models.user import User

__all__ = ["AuthOtpChallenge", "Base", "Task", "TaskStatus", "User"]
