import sys
import os
sys.path.append('/app')
from sqlalchemy import text
from app.core.database import engine

def force_migrations():
    cols = [
        ("companies", "subscription_tier", "VARCHAR(50)"),
        ("companies", "subscription_expires", "TIMESTAMP"),
        ("companies", "grace_period_until", "TIMESTAMP"),
        ("companies", "is_active", "BOOLEAN"),
        ("companies", "primary_color", "VARCHAR(20)")
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
    force_migrations()
