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
    TaskResponse,
    TaskSortField,
    TaskSummaryResponse,
    TaskUpdate,
)
from app.schemas.response import ApiResponse, PaginatedResponse, success

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


@router.get(
    "",
    response_model=ApiResponse[PaginatedResponse[TaskResponse]],
    summary="List tasks",
)
async def get_tasks(
    current_user: CurrentUser,
    session: DatabaseSession,
    search: Annotated[str | None, Query(max_length=200)] = None,
    task_status: Annotated[TaskStatus | None, Query(alias="status")] = None,
    sort: TaskSortField = TaskSortField.DUE_DATE,
    order: SortOrder = SortOrder.ASC,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 10,
) -> ApiResponse[PaginatedResponse[TaskResponse]]:
    """List the current user's tasks with assignment-required filtering and sorting."""
    tasks, total = await task_service.list_tasks(
        session, current_user.id, search, task_status, order, page, page_size
    )
    total_pages = (total + page_size - 1) // page_size
    return success(
        PaginatedResponse(
            content=tasks,
            page=page,
            page_size=page_size,
            total_elements=total,
            total_pages=total_pages,
        )
    )


@router.get("/summary", response_model=ApiResponse[TaskSummaryResponse], summary="Get task summary")
async def get_task_summary(
    current_user: CurrentUser,
    session: DatabaseSession,
) -> ApiResponse[TaskSummaryResponse]:
    """Return status counts for the current user's visible tasks."""
    summary = await task_service.summarize_tasks(session, current_user.id)
    return success(summary)


@router.get("/{task_id}", response_model=ApiResponse[TaskResponse], summary="Get task")
async def get_task(
    task_id: int, current_user: CurrentUser, session: DatabaseSession
) -> ApiResponse[TaskResponse]:
    """Return one task owned by the current user."""
    task = await owned_task_or_404(session, current_user.id, task_id)
    return success(task)


@router.post("", response_model=ApiResponse[TaskResponse], status_code=status.HTTP_201_CREATED)
async def create_task(
    payload: TaskCreate,
    current_user: CurrentUser,
    session: DatabaseSession,
) -> ApiResponse[TaskResponse]:
    """Create a task owned by the current user."""
    task = await task_service.create_task(session, current_user.id, payload)
    return success(task, status_code=status.HTTP_201_CREATED, message="Task created successfully.")


@router.put("/{task_id}", response_model=ApiResponse[TaskResponse], summary="Update task")
async def update_task(
    task_id: int,
    payload: TaskUpdate,
    current_user: CurrentUser,
    session: DatabaseSession,
) -> ApiResponse[TaskResponse]:
    """Replace the editable fields of an owned task."""
    task = await owned_task_or_404(session, current_user.id, task_id)
    task = await task_service.update_task(session, task, current_user.id, payload)
    return success(task, message="Task updated successfully.")


@router.delete("/{task_id}", response_model=ApiResponse[None], summary="Delete task")
async def delete_task(
    task_id: int,
    current_user: CurrentUser,
    session: DatabaseSession,
) -> ApiResponse[None]:
    """Soft-delete an owned task while keeping its audit history."""
    task = await owned_task_or_404(session, current_user.id, task_id)
    await task_service.soft_delete_task(session, task, current_user.id)
    return success(None, message="Task deleted successfully.")


@router.patch(
    "/{task_id}/complete",
    response_model=ApiResponse[TaskResponse],
    summary="Complete task",
)
async def complete_task(
    task_id: int,
    current_user: CurrentUser,
    session: DatabaseSession,
) -> ApiResponse[TaskResponse]:
    """Mark an owned task completed."""
    task = await owned_task_or_404(session, current_user.id, task_id)
    task = await task_service.set_task_status(session, task, current_user.id, TaskStatus.COMPLETED)
    return success(task, message="Task completed successfully.")


@router.patch(
    "/{task_id}/restore",
    response_model=ApiResponse[TaskResponse],
    summary="Restore task",
)
async def restore_task(
    task_id: int,
    current_user: CurrentUser,
    session: DatabaseSession,
) -> ApiResponse[TaskResponse]:
    """Restore a completed task to in-progress status."""
    task = await owned_task_or_404(session, current_user.id, task_id)
    task = await task_service.set_task_status(
        session, task, current_user.id, TaskStatus.IN_PROGRESS
    )
    return success(task, message="Task restored successfully.")
