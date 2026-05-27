"""Clip rendered artifact pointer

Revision ID: 003_clip_artifacts
Revises: 002_content
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "003_clip_artifacts"
down_revision = "002_content"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "clips",
        sa.Column(
            "artifact_audio_file_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("audio_files.id"),
            nullable=True,
        ),
    )
    op.create_index("ix_clips_artifact_audio_file_id", "clips", ["artifact_audio_file_id"])


def downgrade() -> None:
    op.drop_index("ix_clips_artifact_audio_file_id", table_name="clips")
    op.drop_column("clips", "artifact_audio_file_id")

