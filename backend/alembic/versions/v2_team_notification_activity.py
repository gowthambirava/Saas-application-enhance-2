"""add teams notifications activities

Revision ID: v2_enhancements
Revises: 229dc0033e4e
Create Date: 2026-04-17

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'v2_enhancements'
down_revision: Union[str, Sequence[str], None] = '229dc0033e4e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add columns to users
    op.add_column('users', sa.Column('is_verified', sa.Boolean(), nullable=True, server_default='0'))
    op.add_column('users', sa.Column('verification_token', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()))

    # Teams
    op.create_table(
        'teams',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('owner_id', sa.Integer(), sa.ForeignKey('users.id')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_teams_owner_id', 'teams', ['owner_id'])

    # Team members
    op.create_table(
        'team_members',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('team_id', sa.Integer(), sa.ForeignKey('teams.id')),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id')),
        sa.Column('role', sa.String(50), server_default='member'),
        sa.Column('status', sa.String(50), server_default='pending'),
        sa.Column('invited_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_team_members_team_id', 'team_members', ['team_id'])
    op.create_index('ix_team_members_user_id', 'team_members', ['user_id'])

    # Notifications
    op.create_table(
        'notifications',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id')),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('type', sa.String(50), server_default='info'),
        sa.Column('is_read', sa.Boolean(), server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_notifications_user_id', 'notifications', ['user_id'])
    op.create_index('ix_notifications_is_read', 'notifications', ['is_read'])

    # Project activities
    op.create_table(
        'project_activities',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('project_id', sa.Integer(), sa.ForeignKey('projects.id')),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id')),
        sa.Column('action', sa.String(50), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_project_activities_project_id', 'project_activities', ['project_id'])
    op.create_index('ix_project_activities_user_id', 'project_activities', ['user_id'])


def downgrade() -> None:
    op.drop_table('project_activities')
    op.drop_table('notifications')
    op.drop_table('team_members')
    op.drop_table('teams')
    op.drop_column('users', 'created_at')
    op.drop_column('users', 'verification_token')
    op.drop_column('users', 'is_verified')
