# scripts/create_quote_tables.py
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import engine
from app.models.quote import Base

def create_tables():
    logger.info("📋 Création des tables de devis...")
    Base.metadata.create_all(bind=engine)
    logger.info("✅ Tables créées avec succès!")

if __name__ == "__main__":
    create_tables()