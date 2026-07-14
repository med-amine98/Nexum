#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.services.warranty_ai import warranty_ai

def main():
    logger.info("🤖 Initialisation du modèle IA pour les garanties...")
    db = SessionLocal()
    try:
        warranty_ai.train_from_database(db)
        logger.info("✅ Modèle IA initialisé avec succès!")
        logger.info(f"📊 Statistiques: {warranty_ai.training_stats}")
    except Exception as e:
        logger.error(f"❌ Erreur: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()