from datetime import date
from unittest.mock import AsyncMock, MagicMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task import Task, TaskStatus
from app.modules.tasks.schemas import SortOrder, TaskCreate, TaskSummaryResponse, TaskUpdate
from app.modules.tasks.service import (
    create_task,
    list_tasks,
    set_task_status,
    soft_delete_task,
    summarize_tasks,
    update_task,
)


def mock_session() -> MagicMock:
    session = MagicMock(spec=AsyncSession)
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    session.scalars = AsyncMock()
    session.execute = AsyncMock()
    return session


@pytest.mark.asyncio
async def test_list_tasks_applies_status_search_and_descending_due_date() -> None:
    session = mock_session()
    scalar_result = MagicMock()
    scalar_result.all.return_value = []
    session.scalars.return_value = scalar_result

    await list_tasks(
        session,
        user_id=4,
        search="API",
        task_status=TaskStatus.IN_PROGRESS,
        order=SortOrder.DESC,
    )

    statement = str(session.scalars.await_args.args[0])
    assert "lower(tasks.title) LIKE lower" in statement
    assert "tasks.status" in statement
    assert "tasks.due_date DESC" in statement


@pytest.mark.asyncio
async def test_create_task_sets_owner_and_audit_fields() -> None:
    session = mock_session()
    payload = TaskCreate(title="API", due_date=date.today())

    task = await create_task(session, user_id=4, payload=payload)

    assert task.user_id == 4
    assert task.created_by == 4
    assert task.updated_by == 4
    session.add.assert_called_once_with(task)
    session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_update_completed_task_sets_completion_date() -> None:
    session = mock_session()
    task = Task(
        id=3,
        user_id=4,
        title="API",
        due_date=date.today(),
        status=TaskStatus.PENDING,
    )
    payload = TaskUpdate(
        title="Updated API",
        due_date=date.today(),
        status=TaskStatus.COMPLETED,
    )

    await update_task(session, task, user_id=4, payload=payload)

    assert task.title == "Updated API"
    assert task.status == TaskStatus.COMPLETED
    assert task.completed_date is not None
    assert task.updated_by == 4


@pytest.mark.asyncio
async def test_soft_delete_sets_lifecycle_audit_fields() -> None:
    session = mock_session()
    task = Task(id=3, user_id=4, title="API", due_date=date.today())

    await soft_delete_task(session, task, user_id=4)

    assert task.is_deleted is True
    assert task.is_active is False
    assert task.deleted_date is not None
    assert task.deleted_by == 4


@pytest.mark.asyncio
async def test_complete_and_restore_manage_completion_date() -> None:
    session = mock_session()
    task = Task(id=3, user_id=4, title="API", due_date=date.today())

    await set_task_status(session, task, 4, TaskStatus.COMPLETED)
    assert task.status == TaskStatus.COMPLETED
    assert task.completed_date is not None

    await set_task_status(session, task, 4, TaskStatus.IN_PROGRESS)
    assert task.status == TaskStatus.IN_PROGRESS
    assert task.completed_date is None


@pytest.mark.asyncio
async def test_summary_uses_one_combined_result() -> None:
    session = mock_session()
    result = MagicMock()
    result.one.return_value = (8, 2, 3, 3)
    session.execute.return_value = result

    summary = await summarize_tasks(session, user_id=4)

    assert summary == TaskSummaryResponse(total=8, pending=2, in_progress=3, completed=3)
