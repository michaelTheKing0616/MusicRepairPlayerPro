"""Listening events table

Revision ID: 004_listening_events
Revises: 003_clip_artifacts
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "004_listening_events"
down_revision = "003_clip_artifacts"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "listening_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column(
            "audio_file_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("audio_files.id"),
            nullable=False,
        ),
        sa.Column(
            "event_type",
            sa.Enum(
                "play",
                "pause",
                "seek",
                "progress",
                "complete",
                name="listeningeventtype",
            ),
            nullable=False,
        ),
        sa.Column("position_sec", sa.Float(), nullable=True),
        sa.Column("duration_sec", sa.Float(), nullable=True),
        sa.Column("client", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_listening_events_user_id", "listening_events", ["user_id"])
    op.create_index("ix_listening_events_audio_file_id", "listening_events", ["audio_file_id"])
    op.create_index("ix_listening_events_event_type", "listening_events", ["event_type"])
    op.create_index("ix_listening_events_created_at", "listening_events", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_listening_events_created_at", table_name="listening_events")
    op.drop_index("ix_listening_events_event_type", table_name="listening_events")
    op.drop_index("ix_listening_events_audio_file_id", table_name="listening_events")
    op.drop_index("ix_listening_events_user_id", table_name="listening_events")
    op.drop_table("listening_events")
    op.execute("DROP TYPE IF EXISTS listeningeventtype")

