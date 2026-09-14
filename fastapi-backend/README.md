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

## Response format

Successful single-object responses use `message`, `response`, and the HTTP `status` code. List
responses place their array in `response.content`. Expected HTTP and validation errors use the
same top-level envelope so frontend consumers can handle every API consistently.

## Rate limiting

The API uses an async-safe in-memory fixed-window limiter. It is appropriate for the current
single-worker deployment and requires no database tables. Keep the production service at one
worker until the limiter storage is replaced by a shared service such as Redis.

Configure limits through environment variables:

```text
RATE_LIMIT_ENABLED=true
GLOBAL_RATE_LIMIT=100/minute
LOGIN_RATE_LIMIT=5/15minutes
REFRESH_RATE_LIMIT=20/minute
LOGOUT_RATE_LIMIT=10/minute
TASK_WRITE_RATE_LIMIT=30/minute
```

`GET /api/v1/health`, CORS preflight requests, and non-API paths are excluded. Rejected requests
return HTTP `429` with a `Retry-After` header. The limiter uses the client address resolved by the
ASGI server and does not read forwarded-IP headers directly.

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
