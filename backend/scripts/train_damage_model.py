# scripts/train_damage_model.py
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.damage_ai_service import train_damage_model, get_damage_model, get_cost_estimator
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    """Entraîner les modèles IA"""
    logger.info("🚀 Démarrage de l'entraînement des modèles...")
    
    # 1. Créer les dossiers nécessaires
    os.makedirs("models", exist_ok=True)
    os.makedirs("data/training", exist_ok=True)
    
    # 2. Entraîner le modèle de détection
    logger.info("📊 Entraînement du modèle de détection...")
    train_damage_model("data/training", epochs=50, batch_size=32)
    
    # 3. Initialiser l'estimateur de coûts (s'entraîne automatiquement)
    logger.info("💰 Initialisation de l'estimateur de coûts...")
    estimator = get_cost_estimator()
    
    # 4. Vérifier que les modèles sont chargés
    model = get_damage_model()
    if model.is_loaded:
        logger.info("✅ Modèles entraînés et chargés avec succès!")
    else:
        logger.error("❌ Erreur lors de l'entraînement des modèles")
    
    logger.info("🎯 Entraînement terminé!")

if __name__ == "__main__":
    main()