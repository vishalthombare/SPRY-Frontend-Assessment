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

## Quality checks

```bash
ruff check .
ruff format --check .
pytest
```

## Current endpoint

| Method | Path             | Authentication | Purpose          |
| ------ | ---------------- | -------------- | ---------------- |
| GET    | `/api/v1/health` | Public         | API availability |

Database configuration and migrations will be added in the next reviewed phase.

