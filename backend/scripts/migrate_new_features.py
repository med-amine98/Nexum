import sys
import os

# Ajouter le chemin du projet au PYTHONPATH
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.database import engine, Base
from app.models.project import KanbanTask
from app.models.settings import UserPreference
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def force_create_tables():
    logger.info("🛠️ Tentative de création forcée des nouvelles tables...")
    try:
        # Créer spécifiquement les tables qui pourraient manquer
        KanbanTask.__table__.create(bind=engine, checkfirst=True)
        UserPreference.__table__.create(bind=engine, checkfirst=True)
        
        # Ou tout créer via Base
        Base.metadata.create_all(bind=engine)
        
        logger.info("✅ Nouvelles tables créées ou déjà existantes : kanban_tasks, settings_user_preferences")
    except Exception as e:
        logger.error(f"❌ Erreur lors de la création des tables : {e}")

if __name__ == "__main__":
    force_create_tables()
