from sqlalchemy import create_engine, text
import os

# Database URL from environment or fallback
DATABASE_URL = "postgresql://odoo:odoo@localhost:5432/erp"

engine = create_engine(DATABASE_URL)

tables_to_fix = [
    "blockchain_transactions",
    "blockchain_blocks",
    "smart_contracts",
    "blockchain_nodes",
    "blockchain_fraud_alerts",
    "insurance_fraud_alerts",
    "insurance_claims",
    "churn_predictions"
]

with engine.connect() as conn:
    for table in tables_to_fix:
        try:
            logger.info(f"Checking table {table}...")
            # Check if company_id exists
            result = conn.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name='{table}' AND column_name='company_id'"))
            if not result.fetchone():
                logger.info(f"Adding company_id to {table}...")
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN company_id INTEGER"))
                # To make it nullable=False later, we need to fill it with a default value
                # For now, let's just make it nullable or fill it if companies exist
                conn.execute(text(f"UPDATE {table} SET company_id = (SELECT id FROM companies LIMIT 1) WHERE company_id IS NULL"))
                # conn.execute(text(f"ALTER TABLE {table} ALTER COLUMN company_id SET NOT NULL"))
                logger.info(f"Successfully added company_id to {table}")
            else:
                logger.info(f"Column company_id already exists in {table}")
        except Exception as e:
            logger.error(f"Error fixing table {table}: {e}")
    conn.commit()
