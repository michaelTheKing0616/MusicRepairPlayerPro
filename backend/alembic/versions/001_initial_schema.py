"""Initial database schema

Revision ID: 001_initial
Revises: 
Create Date: 2024-01-15

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(255), nullable=False, unique=True, index=True),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_premium', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('consent_audio_processing', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('consent_voice_cloning', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('consent_analytics', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('consent_model_training', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('age_verified', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    # Create audio_files table
    op.create_table(
        'audio_files',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('filename', sa.String(255), nullable=False),
        sa.Column('original_filename', sa.String(255), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('duration', sa.Float(), nullable=True),
        sa.Column('sample_rate', sa.Integer(), nullable=True),
        sa.Column('channels', sa.Integer(), nullable=True),
        sa.Column('format', sa.String(10), nullable=True),
        sa.Column('storage_path', sa.String(512), nullable=False, unique=True),
        sa.Column('storage_bucket', sa.String(100), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='uploaded'),
        sa.Column('artist', sa.String(255), nullable=True),
        sa.Column('title', sa.String(255), nullable=True),
        sa.Column('album', sa.String(255), nullable=True),
        sa.Column('genre', sa.String(100), nullable=True),
        sa.Column('year', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    # Create jobs table
    op.create_table(
        'jobs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('audio_file_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('audio_files.id'), nullable=False, index=True),
        sa.Column('job_type', sa.String(50), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='queued', index=True),
        sa.Column('current_stage', sa.String(50), nullable=True),
        sa.Column('progress_percent', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('progress_message', sa.Text(), nullable=True),
        sa.Column('params', postgresql.JSON(), nullable=True),
        sa.Column('result_file_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('audio_files.id'), nullable=True),
        sa.Column('result_stems', postgresql.JSON(), nullable=True),
        sa.Column('result_metadata', postgresql.JSON(), nullable=True),
        sa.Column('error_code', sa.String(100), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('retry_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('celery_task_id', sa.String(255), nullable=True, index=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False, index=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('failed_at', sa.DateTime(timezone=True), nullable=True),
    )
    
    # Create transform_requests table
    op.create_table(
        'transform_requests',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('job_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('jobs.id'), nullable=False, unique=True, index=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('transform_type', sa.String(50), nullable=False),
        sa.Column('voice_preset', sa.String(100), nullable=True),
        sa.Column('style_preset', sa.String(100), nullable=True),
        sa.Column('intensity', sa.Float(), nullable=False, server_default='0.85'),
        sa.Column('preserve_pitch', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('separate_stems', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('extract_content', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('quality', sa.String(20), nullable=False, server_default='high'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('transform_requests')
    op.drop_table('jobs')
    op.drop_table('audio_files')
    op.drop_table('users')

