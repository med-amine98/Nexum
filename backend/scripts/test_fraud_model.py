# scripts/test_fraud_model.py
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import fraud_model
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_model():
    """Tester le modèle IA"""
    logger.info("🧪 Test du modèle IA...")
    
    # Tester avec des données de test
    test_features = {
        'montant_moyen': 2500,
        'nombre_sinistres': 2,
        'delai_moyen': 45,
        'age_client': 28,
        'type_sinistre': 1,
        'prime': 600,
        'risk_score': 45
    }
    
    result = fraud_model.predict(test_features)
    logger.info(f"✅ Résultat: {result}")
    
    # Vérifier si le modèle est chargé
    logger.info(f"📊 Modèle chargé: {fraud_model.is_loaded}")
    logger.info(f"📊 Scaler entraîné: {fraud_model.is_fitted}")

if __name__ == "__main__":
    test_model()