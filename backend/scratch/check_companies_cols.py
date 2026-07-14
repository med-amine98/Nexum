import sys
import os
sys.path.append('/app')
from sqlalchemy import text
from app.core.database import engine

def check_columns():
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'companies'"))
            columns = [row[0] for row in result]
            logger.info(f"Columns in 'companies': {columns}")
            
            needed = ['grace_period_until', 'subscription_tier', 'subscription_expires']
            for col in needed:
                if col in columns:
                    logger.info(f"✅ Column {col} exists")
                else:
                    logger.error(f"❌ Column {col} MISSING")
    except Exception as e:
        logger.error(f"Error: {e}")

if __name__ == "__main__":
    check_columns()
