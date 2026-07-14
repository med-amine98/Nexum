import os
import sys
import traceback
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from sqlalchemy import text

def run_migration():
    columns_to_add = [
        "first_name VARCHAR(100)",
        "last_name VARCHAR(100)",
        "position VARCHAR(100)",
        "bio TEXT",
        "website VARCHAR(200)",
        "github VARCHAR(100)",
        "linkedin VARCHAR(200)",
        "twitter VARCHAR(100)",
        "avatar VARCHAR(500)",
        "two_factor_enabled BOOLEAN DEFAULT FALSE",
        "email_verified BOOLEAN DEFAULT FALSE",
        "notification_settings JSON",
        "security_settings JSON"
    ]
    
    logger.info("Migrating DB...")
    for col in columns_to_add:
        db = SessionLocal()
        try:
            db.execute(text(f"ALTER TABLE users ADD COLUMN {col};"))
            db.commit()
            logger.info(f"✅ Added {col.split(' ')[0]}")
        except Exception as e:
            db.rollback()
            logger.error(f"ℹ️ Error with {col.split(' ')[0]}: {e}")
        finally:
            db.close()

if __name__ == "__main__":
    run_migration()
