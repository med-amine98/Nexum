
import psycopg2

DATABASE_URL = "postgresql://odoo:odoo@localhost:5432/erp"

try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    # Add columns to modules table
    cur.execute("ALTER TABLE modules ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT TRUE")
    cur.execute("ALTER TABLE modules ADD COLUMN IF NOT EXISTS price FLOAT DEFAULT 0.0")
    cur.execute("ALTER TABLE modules ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'EUR'")
    
    # Add columns to user_modules table
    cur.execute("ALTER TABLE user_modules ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE")
    cur.execute("ALTER TABLE user_modules ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP")
    
    conn.commit()
    logger.info("Columns added successfully")
    cur.close()
    conn.close()
except Exception as e:
    logger.error(f"Error: {e}")
