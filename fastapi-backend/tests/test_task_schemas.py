from datetime import date, timedelta

import pytest
from pydantic import ValidationError

from app.modules.tasks.schemas import TaskCreate


def test_task_create_trims_text_fields() -> None:
    payload = TaskCreate(
        title="  Review API  ",
        description="  Verify endpoints  ",
        due_date=date.today(),
    )

    assert payload.title == "Review API"
    assert payload.description == "Verify endpoints"


def test_task_create_rejects_whitespace_title() -> None:
    with pytest.raises(ValidationError):
        TaskCreate(title="   ", due_date=date.today())


def test_task_create_rejects_past_due_date() -> None:
    with pytest.raises(ValidationError):
        TaskCreate(title="Overdue", due_date=date.today() - timedelta(days=1))
