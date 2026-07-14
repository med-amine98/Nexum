
from sqlalchemy import create_engine, MetaData, Table, Column, Boolean, Float, String

# URL from .env (fallback to localhost if needed for the script to run locally)
DATABASE_URL = "postgresql://odoo:odoo@localhost:5432/erp"

engine = create_engine(DATABASE_URL)
metadata = MetaData()

# Define the table manually to avoid app imports
modules = Table('modules', metadata,
    Column('id', primary_key=True),
    Column('key', String),
    Column('is_free', Boolean),
    Column('price', Float)
)

paid_modules = {
    "ai-report-generator": 49.99,
    "ai-quote-generator": 29.99,
    "cyber-shield": 99.99,
    "digital-twin": 149.99,
    "fraud-detection-banking": 199.99,
    "fraud-detection-insurance": 199.99,
    "catastrophe-modeling": 299.99,
    "damage-auto-estimation": 79.99,
    "nexy-ai": 39.99
}

try:
    with engine.connect() as conn:
        # Reset all
        conn.execute(modules.update().values(is_free=True, price=0.0))
        
        # Set paid
        for key, price in paid_modules.items():
            conn.execute(modules.update().where(modules.c.key == key).values(is_free=False, price=price))
            logger.info(f"Module {key} -> {price}")
        
        conn.commit()
    logger.info("Success")
except Exception as e:
    logger.error(f"Error: {e}")
