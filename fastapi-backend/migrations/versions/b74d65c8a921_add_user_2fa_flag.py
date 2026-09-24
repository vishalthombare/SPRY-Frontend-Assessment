"""add user 2fa flag

Revision ID: b74d65c8a921
Revises: ad3efeb5c3be
Create Date: 2026-09-24 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "b74d65c8a921"
down_revision: str | None = "ad3efeb5c3be"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Keep existing users on direct login while making 2FA configurable per account."""
    op.add_column(
        "users",
        sa.Column("is_2fa_enabled", sa.Boolean(), server_default="false", nullable=False),
    )


def downgrade() -> None:
    """Remove only the per-user 2FA setting."""
    op.drop_column("users", "is_2fa_enabled")
