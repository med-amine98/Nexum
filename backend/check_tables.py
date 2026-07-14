from app.database import SessionLocal
from sqlalchemy import text
db = SessionLocal()
tables = db.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")).fetchall()
print('📊 Tables trouvées:')
for table in tables:
    print(f'  - {table[0]}')
print(f'✅ Total: {len(tables)} tables')
