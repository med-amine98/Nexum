#!/usr/bin/env python
# init_db.py
import sys
import os
import logging

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_database():
    """Initialiser complètement la base de données"""
    logger.info("=" * 50)
    logger.info("Initialisation de la base de données")
    logger.info("=" * 50)
    
    try:
        from app.core.database import engine, Base, check_db_connection
        
        # 1. Vérifier la connexion
        logger.info("1. Vérification de la connexion...")
        if not check_db_connection():
            logger.error("❌ Impossible de se connecter à la base de données")
            return False
        
        # 2. Importer les modèles
        logger.info("2. Importation des modèles...")
        from app.models import scraping
        from app.models.ai_report import AIReport
        
        # 3. Créer les tables
        logger.info("3. Création des tables...")
        Base.metadata.create_all(bind=engine)
        
        # 4. Vérifier les tables créées
        logger.info("4. Vérification des tables...")
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        if tables:
            logger.info(f"✅ {len(tables)} tables créées avec succès:")
            for table in tables:
                logger.info(f"   - {table}")
        else:
            logger.warning("⚠️ Aucune table n'a été créée")
            
        return True
        
    except Exception as e:
        logger.error(f"❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = init_database()
    sys.exit(0 if success else 1)