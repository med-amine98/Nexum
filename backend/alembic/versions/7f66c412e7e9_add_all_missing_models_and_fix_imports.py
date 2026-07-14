"""Add all missing models and fix imports

Revision ID: 7f66c412e7e9
Revises: 001
Create Date: 2026-03-21 14:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '7f66c412e7e9'
down_revision = '001'
branch_labels = None
depends_on = None

def upgrade():
    # Supprimer d'abord les tables avec dépendances
    op.execute('DROP TABLE IF EXISTS risk_actions CASCADE')
    op.execute('DROP TABLE IF EXISTS risks CASCADE')
    op.execute('DROP TABLE IF EXISTS fraud_insurance_claims CASCADE')
    op.execute('DROP TABLE IF EXISTS fraud_cases CASCADE')
    op.execute('DROP TABLE IF EXISTS fraud_insurance_networks CASCADE')
    op.execute('DROP TABLE IF EXISTS fraud_insurance_indicators CASCADE')
    op.execute('DROP TABLE IF EXISTS fraud_insurance_rules CASCADE')
    
    # Supprimer toutes les autres tables
    op.execute('DROP TABLE IF EXISTS email_verifications CASCADE')
    op.execute('DROP TABLE IF EXISTS audit_logs CASCADE')
    op.execute('DROP TABLE IF EXISTS risk_incidents CASCADE')
    op.execute('DROP TABLE IF EXISTS fraud_alerts CASCADE')
    op.execute('DROP TABLE IF EXISTS error_logs CASCADE')
    op.execute('DROP TABLE IF EXISTS products CASCADE')
    op.execute('DROP TABLE IF EXISTS invoices CASCADE')
    op.execute('DROP TABLE IF EXISTS metric_predictions CASCADE')
    op.execute('DROP TABLE IF EXISTS leaves CASCADE')
    op.execute('DROP TABLE IF EXISTS activities CASCADE')
    op.execute('DROP TABLE IF EXISTS projects CASCADE')
    op.execute('DROP TABLE IF EXISTS user_sessions CASCADE')
    op.execute('DROP TABLE IF EXISTS payments CASCADE')
    op.execute('DROP TABLE IF EXISTS fraud_banking_stats CASCADE')
    op.execute('DROP TABLE IF EXISTS system_metrics CASCADE')
    op.execute('DROP TABLE IF EXISTS user_modules CASCADE')
    op.execute('DROP TABLE IF EXISTS alerts CASCADE')
    op.execute('DROP TABLE IF EXISTS suppliers CASCADE')
    op.execute('DROP TABLE IF EXISTS transactions CASCADE')
    op.execute('DROP TABLE IF EXISTS employees CASCADE')
    op.execute('DROP TABLE IF EXISTS blocks CASCADE')
    op.execute('DROP TABLE IF EXISTS performance_metrics CASCADE')
    op.execute('DROP TABLE IF EXISTS performance_history CASCADE')
    op.execute('DROP TABLE IF EXISTS password_resets CASCADE')
    op.execute('DROP TABLE IF EXISTS locations CASCADE')
    op.execute('DROP TABLE IF EXISTS fraud_banking_alerts CASCADE')
    op.execute('DROP TABLE IF EXISTS accounts CASCADE')
    op.execute('DROP TABLE IF EXISTS companies CASCADE')
    op.execute('DROP TABLE IF EXISTS market_trends CASCADE')
    op.execute('DROP TABLE IF EXISTS prediction_results CASCADE')
    op.execute('DROP TABLE IF EXISTS fraud_transactions CASCADE')
    op.execute('DROP TABLE IF EXISTS purchase_orders CASCADE')
    op.execute('DROP TABLE IF EXISTS sales_predictions CASCADE')
    op.execute('DROP TABLE IF EXISTS tasks CASCADE')
    op.execute('DROP TABLE IF EXISTS request_logs CASCADE')
    op.execute('DROP TABLE IF EXISTS module_categories CASCADE')
    op.execute('DROP TABLE IF EXISTS stock_movements CASCADE')
    op.execute('DROP TABLE IF EXISTS users CASCADE')
    op.execute('DROP TABLE IF EXISTS invoice_lines CASCADE')
    op.execute('DROP TABLE IF EXISTS smart_contracts CASCADE')
    op.execute('DROP TABLE IF EXISTS taxes CASCADE')
    op.execute('DROP TABLE IF EXISTS sale_order_lines CASCADE')
    op.execute('DROP TABLE IF EXISTS fraud_banking_rules CASCADE')
    op.execute('DROP TABLE IF EXISTS customers CASCADE')
    op.execute('DROP TABLE IF EXISTS fraud_rules CASCADE')
    op.execute('DROP TABLE IF EXISTS prediction_models CASCADE')
    op.execute('DROP TABLE IF EXISTS sale_orders CASCADE')
    op.execute('DROP TABLE IF EXISTS notifications CASCADE')
    op.execute('DROP TABLE IF EXISTS modules CASCADE')
    op.execute('DROP TABLE IF EXISTS pipeline_stages CASCADE')
    op.execute('DROP TABLE IF EXISTS insights CASCADE')
    op.execute('DROP TABLE IF EXISTS module_tags CASCADE')
    op.execute('DROP TABLE IF EXISTS departments CASCADE')
    op.execute('DROP TABLE IF EXISTS nodes CASCADE')
    op.execute('DROP TABLE IF EXISTS categories CASCADE')
    op.execute('DROP TABLE IF EXISTS leads CASCADE')
    op.execute('DROP TABLE IF EXISTS partners CASCADE')
    op.execute('DROP TABLE IF EXISTS purchase_order_lines CASCADE')
    op.execute('DROP TABLE IF EXISTS keywords CASCADE')
    op.execute('DROP TABLE IF EXISTS service_status CASCADE')
    op.execute('DROP TABLE IF EXISTS transaction_history CASCADE')

def downgrade():
    pass
