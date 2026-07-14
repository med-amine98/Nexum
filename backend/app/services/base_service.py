# app/services/base_service.py
from sqlalchemy.orm import Session
from sqlalchemy import inspect
from sqlalchemy.orm import clear_mappers
import logging

logger = logging.getLogger(__name__)

class BaseService:
    def __init__(self, db: Session):
        self.db = db
        self._refresh_metadata()
    
    def _refresh_metadata(self):
        """Force le rechargement des métadonnées SQLAlchemy"""
        try:
            clear_mappers()
            inspector = inspect(self.db.bind)
            tables = inspector.get_table_names()
            logger.debug(f"Tables disponibles: {tables}")
            return True
        except Exception as e:
            logger.error(f"❌ Erreur refresh metadata: {e}")
            return False
    
    def _ensure_table_exists(self, model_class, table_name: str):
        """Vérifie que la table existe et la crée si nécessaire"""
        try:
            inspector = inspect(self.db.bind)
            if table_name not in inspector.get_table_names():
                logger.warning(f"⚠️ Table {table_name} manquante, création...")
                model_class.__table__.create(self.db.bind)
                return True
            return False
        except Exception as e:
            logger.error(f"❌ Erreur création table {table_name}: {e}")
            return False
    
    def safe_query(self, model_class):
        """Effectue une requête sécurisée avec rechargement des métadonnées"""
        self._refresh_metadata()
        return self.db.query(model_class)