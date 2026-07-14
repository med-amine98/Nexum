# app/core/database.py
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import logging

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://odoo:odoo@postgres:5432/erp"
)

# Configuration du moteur
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dépendance pour obtenir une session DB"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Créer toutes les tables dans la base de données dans le bon ordre"""
    try:
        # Désactiver temporairement les contraintes de clés étrangères pour PostgreSQL
        if "postgresql" in DATABASE_URL:
            with engine.connect() as conn:
                conn.execute(text("SET session_replication_role = 'replica';"))
        
        # Importer les modèles dans l'ordre (dépendances d'abord)
        from app.models.scraping import ScrapingTask, ScrapingResult, SocialMention, SentimentAnalysis
        from app.models.ai_report import AIReport
        from app.models.saas import SubscriptionPlan, SaaSPayment
        
        # Créer toutes les tables
        Base.metadata.create_all(bind=engine)
        
        # Créer les tables enregistrées sur la base principale de l'application
        from app.database import Base as AppBase
        import app.enterprise_models
        AppBase.metadata.create_all(bind=engine)
        
        # Réactiver les contraintes
        if "postgresql" in DATABASE_URL:
            with engine.connect() as conn:
                conn.execute(text("SET session_replication_role = 'origin';"))
        
        # Vérifier les tables
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        logger.info(f"✅ Tables créées avec succès: {', '.join(tables)}")
        return True
    except Exception as e:
        logger.error(f"❌ Erreur création tables: {e}")
        return False


def check_db_connection():
    """Vérifier la connexion à la base de données"""
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        logger.info("✅ Base de données connectée")
        return True
    except Exception as e:
        logger.error(f"❌ Base de données non connectée: {e}")
        return False


def reset_database():
    """Réinitialiser complètement la base de données"""
    try:
        # Supprimer toutes les tables
        Base.metadata.drop_all(bind=engine)
        logger.info("✅ Tables supprimées avec succès")
        
        # Recréer les tables
        return create_tables()
    except Exception as e:
        logger.error(f"❌ Erreur lors de la réinitialisation: {e}")
        return False