"""create auth otp challenges

Revision ID: d63058d26f4a
Revises: b74d65c8a921
Create Date: 2026-09-24 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d63058d26f4a"
down_revision: str | None = "b74d65c8a921"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create isolated storage for hashed, expiring, single-use OTP challenges."""
    op.create_table(
        "auth_otp_challenges",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("challenge_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("otp_hash", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("attempt_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("resend_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("last_sent_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_auth_otp_challenges_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_auth_otp_challenges")),
    )
    op.create_index(
        "ix_auth_otp_challenges_active_user",
        "auth_otp_challenges",
        ["user_id"],
        unique=False,
        postgresql_where=sa.text("verified_at IS NULL"),
    )
    op.create_index(
        op.f("ix_auth_otp_challenges_challenge_id"),
        "auth_otp_challenges",
        ["challenge_id"],
        unique=True,
    )
    op.create_index(
        op.f("ix_auth_otp_challenges_expires_at"),
        "auth_otp_challenges",
        ["expires_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_auth_otp_challenges_user_id"),
        "auth_otp_challenges",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    """Remove only the OTP challenge table and its indexes."""
    op.drop_index(op.f("ix_auth_otp_challenges_user_id"), table_name="auth_otp_challenges")
    op.drop_index(op.f("ix_auth_otp_challenges_expires_at"), table_name="auth_otp_challenges")
    op.drop_index(op.f("ix_auth_otp_challenges_challenge_id"), table_name="auth_otp_challenges")
    op.drop_index("ix_auth_otp_challenges_active_user", table_name="auth_otp_challenges")
    op.drop_table("auth_otp_challenges")
