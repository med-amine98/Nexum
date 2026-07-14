import sys
import os
from dotenv import load_dotenv

sys.path.append(os.path.abspath('.'))
load_dotenv(os.path.join(os.path.abspath('.'), '.env'))

from app.database import engine
from sqlalchemy import MetaData, text

def migrate():
    metadata = MetaData()
    metadata.reflect(bind=engine)

    with engine.connect() as conn:
        for table_name in metadata.tables:
            table = metadata.tables[table_name]
            if 'company_id' in table.columns:
                print(f"Migrating table {table_name}...")
                conn.execute(text(f"UPDATE {table_name} SET company_id = 1 WHERE company_id IS NULL"))
        conn.commit()
    print("Migration completed successfully.")

if __name__ == "__main__":
    migrate()
