from app.database import engine, Base
from app.models import *  # Importez tous vos modèles
import os

def clean_database():
    """Supprime et recrée toutes les tables"""
    logger.info("🗑️  Suppression de toutes les tables...")
    Base.metadata.drop_all(bind=engine)
    logger.info("✅ Tables supprimées")
    
    logger.info("🏗️  Création des nouvelles tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("✅ Tables créées")

if __name__ == "__main__":
    response = input("⚠️  Cela va supprimer TOUTES les données. Continuer? (o/n): ")
    if response.lower() == 'o':
        clean_database()
    else:
        logger.info("Opération annulée")