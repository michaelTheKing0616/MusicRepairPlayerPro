"""Clips, moments, radio, podcasts

Revision ID: 002_content
Revises: 001_initial
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "002_content"
down_revision = "001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "clips",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("audio_file_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("audio_files.id"), nullable=False),
        sa.Column("start_ms", sa.Integer(), nullable=False),
        sa.Column("end_ms", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_clips_user_id", "clips", ["user_id"])
    op.create_index("ix_clips_audio_file_id", "clips", ["audio_file_id"])

    op.create_table(
        "moments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("audio_file_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("audio_files.id"), nullable=False),
        sa.Column("position_ms", sa.Integer(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_moments_user_id", "moments", ["user_id"])
    op.create_index("ix_moments_audio_file_id", "moments", ["audio_file_id"])

    op.create_table(
        "radio_stations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("slug", sa.String(length=100), nullable=False, unique=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("stream_url", sa.String(length=1024), nullable=False),
        sa.Column("genre", sa.String(length=100), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_radio_stations_slug", "radio_stations", ["slug"])

    op.create_table(
        "podcast_episodes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("show_slug", sa.String(length=120), nullable=False),
        sa.Column("title", sa.String(length=512), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("enclosure_url", sa.String(length=1024), nullable=False),
        sa.Column("duration_sec", sa.Float(), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_podcast_episodes_show_slug", "podcast_episodes", ["show_slug"])

    op.execute(
        sa.text(
            """
            INSERT INTO radio_stations (id, slug, name, stream_url, genre, is_active)
            VALUES
            (gen_random_uuid(), 'soundhelix_demo',
             'SoundHelix demo (MP3 stream sample)',
             'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
             'instrumental', true),
            (gen_random_uuid(), 'soundhelix_demo_2',
             'SoundHelix demo 2',
             'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
             'instrumental', true)
            """
        )
    )

    op.execute(
        sa.text(
            """
            INSERT INTO podcast_episodes
            (id, show_slug, title, description, enclosure_url, duration_sec, published_at)
            VALUES
            (gen_random_uuid(), 'musicrepair_samples', 'Sample episode A',
             'Public sample audio for integration tests',
             'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
             422, now() - interval '7 days'),
            (gen_random_uuid(), 'musicrepair_samples', 'Sample episode B',
             'Second sample for continuous playback checks',
             'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
             380, now() - interval '1 days')
            """
        )
    )


def downgrade() -> None:
    op.drop_index("ix_podcast_episodes_show_slug", table_name="podcast_episodes")
    op.drop_table("podcast_episodes")
    op.drop_index("ix_radio_stations_slug", table_name="radio_stations")
    op.drop_table("radio_stations")
    op.drop_index("ix_moments_audio_file_id", table_name="moments")
    op.drop_index("ix_moments_user_id", table_name="moments")
    op.drop_table("moments")
    op.drop_index("ix_clips_audio_file_id", table_name="clips")
    op.drop_index("ix_clips_user_id", table_name="clips")
    op.drop_table("clips")
