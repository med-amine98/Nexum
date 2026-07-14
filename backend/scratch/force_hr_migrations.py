import sys
import os
sys.path.append('/app')
from sqlalchemy import text
from app.core.database import engine

def force_hr_migrations():
    cols = [
        ("hr_employees", "ai_performance_score", "FLOAT"),
        ("hr_employees", "ai_risk_score", "FLOAT"),
        ("hr_employees", "ai_retention_score", "FLOAT"),
        ("hr_employees", "company_id", "INTEGER")
    ]
    
    with engine.connect() as conn:
        for table, col, col_type in cols:
            try:
                logger.info(f"Ensuring {table}.{col} ({col_type})...")
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col} {col_type}"))
                conn.commit()
                logger.info(f"✅ Success")
            except Exception as e:
                logger.warning(f"⚠️ Failed: {e}")

if __name__ == "__main__":
    force_hr_migrations()
