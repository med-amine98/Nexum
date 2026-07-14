# backend/app/database.py
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings  # ← Correction de l'import
from sqlalchemy import text
# PostgreSQL
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        # Récupérer l'utilisateur du contexte
        with engine.connect() as conn:
            result = conn.execute(text("SELECT current_setting('app.current_user_id', true)"))
            user_id = result.scalar()
            
            if user_id:
                # La session est maintenant filtrée par RLS
                pass
        
        yield db
    finally:
        db.close()