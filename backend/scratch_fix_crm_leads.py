import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine
from sqlalchemy import text

def fix_crm_leads():
    columns = [
        ("ai_lead_score", "FLOAT DEFAULT 0.0"),
        ("ai_next_action", "VARCHAR(500)"),
        ("ai_sentiment_analysis", "TEXT"),
        ("ai_risk_tags", "JSON"),
        ("converted_at", "TIMESTAMP")
    ]
    
    logger.info("Fixing crm_leads table...")
    db = SessionLocal()
    for col_name, col_type in columns:
        try:
            # Check if column exists first
            # PostgreSQL specific check
            check_sql = f"SELECT column_name FROM information_schema.columns WHERE table_name='crm_leads' AND column_name='{col_name}';"
            res = db.execute(text(check_sql)).fetchone()
            
            if not res:
                logger.info(f"Adding column {col_name}...")
                db.execute(text(f"ALTER TABLE crm_leads ADD COLUMN {col_name} {col_type};"))
                db.commit()
                logger.info(f"✅ Added {col_name}")
            else:
                logger.info(f"ℹ️ Column {col_name} already exists")
        except Exception as e:
            db.rollback()
            logger.error(f"❌ Error adding {col_name}: {e}")
    
    db.close()
    logger.info("Done.")

if __name__ == "__main__":
    fix_crm_leads()
