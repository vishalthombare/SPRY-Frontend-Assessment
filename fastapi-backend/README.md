# SPRY Task Management API

FastAPI backend for the SPRY frontend assessment.

## Requirements

- Python 3.12
- PostgreSQL 15 or newer

## Local setup

```bash
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"
cp .env.example .env
uvicorn app.main:app --reload
```

The API documentation is available at `http://localhost:8000/docs`.

## Architecture

```text
app/
├── api/v1/              # API version composition and health route
├── commands/            # Administrative CLI commands
├── core/                # Configuration, database and security infrastructure
├── models/              # Shared SQLAlchemy database models
└── modules/
    ├── auth/             # Auth router, schemas, service and dependencies
    └── tasks/            # Task router, schemas and service
```

Each feature module owns its HTTP contract and business operations. Shared infrastructure and
cross-module database models remain centralized to avoid circular dependencies.

## Quality checks

```bash
ruff check .
ruff format --check .
pytest
```

## Endpoints

| Method | Path                            | Authentication | Purpose                  |
| ------ | ------------------------------- | -------------- | ------------------------ |
| GET    | `/api/v1/health`                | Public         | API availability         |
| GET    | `/api/v1/health/database`       | Public         | Database availability    |
| POST   | `/api/v1/auth/login`            | Public         | Create authenticated session |
| POST   | `/api/v1/auth/refresh`          | Refresh token  | Refresh session tokens   |
| POST   | `/api/v1/auth/logout`           | Bearer token   | Invalidate user tokens   |
| GET    | `/api/v1/auth/me`               | Bearer token   | Get authenticated user   |
| GET    | `/api/v1/tasks`                 | Bearer token   | List and filter tasks    |
| POST   | `/api/v1/tasks`                 | Bearer token   | Create task              |
| GET    | `/api/v1/tasks/summary`         | Bearer token   | Get status counts        |
| GET    | `/api/v1/tasks/{task_id}`       | Bearer token   | Get task                 |
| PUT    | `/api/v1/tasks/{task_id}`       | Bearer token   | Update task              |
| DELETE | `/api/v1/tasks/{task_id}`       | Bearer token   | Soft-delete task         |
| PATCH  | `/api/v1/tasks/{task_id}/complete` | Bearer token | Complete task            |
| PATCH  | `/api/v1/tasks/{task_id}/restore`  | Bearer token | Restore task             |
