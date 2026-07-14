'''
Revision ID: add_ai_columns_20260526
Revises: 4b6aa132d69e
Create Date: 2026-05-26 15:45:00.000000
'''

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import datetime

# revision identifiers, used by Alembic.
revision = 'add_ai_columns_20260526'
down_revision = '4b6aa132d69e'
branch_labels = None
depends_on = None

def upgrade():
    # Add AI related columns to blockchain_transactions table
    op.add_column('blockchain_transactions', sa.Column('ai_anomaly_score', sa.Float(), nullable=False, server_default='0.0'))
    op.add_column('blockchain_transactions', sa.Column('ai_pattern_analysis', postgresql.JSON(astext_type=sa.Text()), nullable=True, server_default='{}'))
    op.add_column('blockchain_transactions', sa.Column('ai_risk_assessment', postgresql.JSON(astext_type=sa.Text()), nullable=True, server_default='{}'))
    op.add_column('blockchain_transactions', sa.Column('ai_insights', postgresql.JSON(astext_type=sa.Text()), nullable=True, server_default='{}'))
    op.add_column('blockchain_transactions', sa.Column('last_ai_update', sa.DateTime(), nullable=True, server_default=sa.text('now()')))

def downgrade():
    # Remove AI related columns
    op.drop_column('blockchain_transactions', 'last_ai_update')
    op.drop_column('blockchain_transactions', 'ai_insights')
    op.drop_column('blockchain_transactions', 'ai_risk_assessment')
    op.drop_column('blockchain_transactions', 'ai_pattern_analysis')
    op.drop_column('blockchain_transactions', 'ai_anomaly_score')
