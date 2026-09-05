"""Protected HTTP endpoints for the task-management workflow."""

from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from app.core.database import DatabaseSession
from app.models.task import Task, TaskStatus
from app.modules.auth.dependencies import CurrentUser
from app.modules.tasks import service as task_service
from app.modules.tasks.schemas import (
    SortOrder,
    TaskCreate,
    TaskDeleteResponse,
    TaskResponse,
    TaskSortField,
    TaskSummaryResponse,
    TaskUpdate,
)

router = APIRouter(prefix="/tasks", tags=["Tasks"])


def task_not_found() -> HTTPException:
    """Return one consistent response for missing and unauthorized tasks."""
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")


async def owned_task_or_404(session: DatabaseSession, user_id: int, task_id: int) -> Task:
    """Load an owned visible task or hide its existence behind a 404 response."""
    task = await task_service.get_task(session, user_id, task_id)
    if task is None:
        raise task_not_found()
    return task


@router.get("", response_model=list[TaskResponse], summary="List tasks")
async def get_tasks(
    current_user: CurrentUser,
    session: DatabaseSession,
    search: Annotated[str | None, Query(max_length=200)] = None,
    task_status: Annotated[TaskStatus | None, Query(alias="status")] = None,
    sort: TaskSortField = TaskSortField.DUE_DATE,
    order: SortOrder = SortOrder.ASC,
) -> list[Task]:
    """List the current user's tasks with assignment-required filtering and sorting."""
    return await task_service.list_tasks(session, current_user.id, search, task_status, order)


@router.get("/summary", response_model=TaskSummaryResponse, summary="Get task summary")
async def get_task_summary(
    current_user: CurrentUser,
    session: DatabaseSession,
) -> TaskSummaryResponse:
    """Return status counts for the current user's visible tasks."""
    return await task_service.summarize_tasks(session, current_user.id)


@router.get("/{task_id}", response_model=TaskResponse, summary="Get task")
async def get_task(task_id: int, current_user: CurrentUser, session: DatabaseSession) -> Task:
    """Return one task owned by the current user."""
    return await owned_task_or_404(session, current_user.id, task_id)


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    payload: TaskCreate,
    current_user: CurrentUser,
    session: DatabaseSession,
) -> Task:
    """Create a task owned by the current user."""
    return await task_service.create_task(session, current_user.id, payload)


@router.put("/{task_id}", response_model=TaskResponse, summary="Update task")
async def update_task(
    task_id: int,
    payload: TaskUpdate,
    current_user: CurrentUser,
    session: DatabaseSession,
) -> Task:
    """Replace the editable fields of an owned task."""
    task = await owned_task_or_404(session, current_user.id, task_id)
    return await task_service.update_task(session, task, current_user.id, payload)


@router.delete("/{task_id}", response_model=TaskDeleteResponse, summary="Delete task")
async def delete_task(
    task_id: int,
    current_user: CurrentUser,
    session: DatabaseSession,
) -> TaskDeleteResponse:
    """Soft-delete an owned task while keeping its audit history."""
    task = await owned_task_or_404(session, current_user.id, task_id)
    await task_service.soft_delete_task(session, task, current_user.id)
    return TaskDeleteResponse(message="Task deleted successfully.")


@router.patch("/{task_id}/complete", response_model=TaskResponse, summary="Complete task")
async def complete_task(
    task_id: int,
    current_user: CurrentUser,
    session: DatabaseSession,
) -> Task:
    """Mark an owned task completed."""
    task = await owned_task_or_404(session, current_user.id, task_id)
    return await task_service.set_task_status(session, task, current_user.id, TaskStatus.COMPLETED)


@router.patch("/{task_id}/restore", response_model=TaskResponse, summary="Restore task")
async def restore_task(
    task_id: int,
    current_user: CurrentUser,
    session: DatabaseSession,
) -> Task:
    """Restore a completed task to in-progress status."""
    task = await owned_task_or_404(session, current_user.id, task_id)
    return await task_service.set_task_status(
        session, task, current_user.id, TaskStatus.IN_PROGRESS
    )
