# scripts/init_claim_tracking.py
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import engine, Base
from app.models.claim_tracking import (
    ClaimTracking, 
    ClaimTrackingStep, 
    ClaimTrackingNotification, 
    ClaimTrackingDocument, 
    ClaimTrackingMessage, 
    Expert
)

def init_tables():
    """Crée les tables claim_tracking dans la base de données"""
    logger.info("🚀 Création des tables claim_tracking...")
    
    try:
        # Créer les tables
        Base.metadata.create_all(bind=engine, tables=[
            ClaimTracking.__table__,
            ClaimTrackingStep.__table__,
            ClaimTrackingNotification.__table__,
            ClaimTrackingDocument.__table__,
            ClaimTrackingMessage.__table__,
            Expert.__table__
        ])
        logger.info("✅ Tables claim_tracking créées avec succès")
        
    except Exception as e:
        logger.error(f"❌ Erreur lors de la création des tables: {e}")

if __name__ == "__main__":
    init_tables()