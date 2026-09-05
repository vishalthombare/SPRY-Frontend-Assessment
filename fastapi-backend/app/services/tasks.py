from datetime import UTC, datetime

from sqlalchemy import Select, asc, case, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task import Task, TaskStatus
from app.schemas.task import SortOrder, TaskCreate, TaskSummaryResponse, TaskUpdate


def active_user_tasks(user_id: int) -> Select[tuple[Task]]:
    """Build the ownership and soft-delete boundary shared by task queries."""
    return select(Task).where(
        Task.user_id == user_id,
        Task.is_active.is_(True),
        Task.is_deleted.is_(False),
    )


async def list_tasks(
    session: AsyncSession,
    user_id: int,
    search: str | None,
    task_status: TaskStatus | None,
    order: SortOrder,
) -> list[Task]:
    """Return filtered tasks ordered by due date with deterministic ID ties."""
    statement = active_user_tasks(user_id)
    if search and (query := search.strip()):
        pattern = f"%{query}%"
        statement = statement.where(or_(Task.title.ilike(pattern), Task.description.ilike(pattern)))
    if task_status is not None:
        statement = statement.where(Task.status == task_status)

    direction = asc if order == SortOrder.ASC else desc
    result = await session.scalars(statement.order_by(direction(Task.due_date), asc(Task.id)))
    return list(result.all())


async def get_task(session: AsyncSession, user_id: int, task_id: int) -> Task | None:
    """Find a visible task without allowing cross-user access."""
    return await session.scalar(active_user_tasks(user_id).where(Task.id == task_id))


async def create_task(session: AsyncSession, user_id: int, payload: TaskCreate) -> Task:
    """Create a user-owned task and populate audit fields."""
    completed_date = datetime.now(UTC) if payload.status == TaskStatus.COMPLETED else None
    task = Task(
        user_id=user_id,
        **payload.model_dump(),
        completed_date=completed_date,
        created_by=user_id,
        updated_by=user_id,
    )
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task


async def update_task(
    session: AsyncSession,
    task: Task,
    user_id: int,
    payload: TaskUpdate,
) -> Task:
    """Replace editable fields and synchronize completion metadata."""
    previous_status = task.status
    for field, value in payload.model_dump().items():
        setattr(task, field, value)
    if payload.status == TaskStatus.COMPLETED and previous_status != TaskStatus.COMPLETED:
        task.completed_date = datetime.now(UTC)
    elif payload.status != TaskStatus.COMPLETED:
        task.completed_date = None
    task.updated_by = user_id
    await session.commit()
    await session.refresh(task)
    return task


async def soft_delete_task(session: AsyncSession, task: Task, user_id: int) -> None:
    """Hide a task while preserving its audit history."""
    task.is_deleted = True
    task.is_active = False
    task.deleted_date = datetime.now(UTC)
    task.deleted_by = user_id
    task.updated_by = user_id
    await session.commit()


async def set_task_status(
    session: AsyncSession,
    task: Task,
    user_id: int,
    task_status: TaskStatus,
) -> Task:
    """Apply a workflow status and its corresponding completion timestamp."""
    task.status = task_status
    task.completed_date = datetime.now(UTC) if task_status == TaskStatus.COMPLETED else None
    task.updated_by = user_id
    await session.commit()
    await session.refresh(task)
    return task


async def summarize_tasks(session: AsyncSession, user_id: int) -> TaskSummaryResponse:
    """Calculate every summary value from the same visible task collection."""
    statement = select(
        func.count(Task.id),
        func.sum(case((Task.status == TaskStatus.PENDING, 1), else_=0)),
        func.sum(case((Task.status == TaskStatus.IN_PROGRESS, 1), else_=0)),
        func.sum(case((Task.status == TaskStatus.COMPLETED, 1), else_=0)),
    ).where(
        Task.user_id == user_id,
        Task.is_active.is_(True),
        Task.is_deleted.is_(False),
    )
    total, pending, in_progress, completed = (await session.execute(statement)).one()
    return TaskSummaryResponse(
        total=total or 0,
        pending=pending or 0,
        in_progress=in_progress or 0,
        completed=completed or 0,
    )
