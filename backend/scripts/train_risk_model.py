# scripts/train_model.py
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
from app.services.risk_model import rf_model

def train_model():
    """Entraîner le modèle avec des données synthétiques"""
    
    # Générer des données d'entraînement
    np.random.seed(42)
    n_samples = 2000
    
    # Features: [age, income, credit_score, claims, value, has_family, location, health_status]
    X = np.random.rand(n_samples, 8)
    X[:, 0] = X[:, 0] * 80 + 18  # age 18-98
    X[:, 1] = X[:, 1] * 180000 + 20000  # income 20k-200k
    X[:, 2] = X[:, 2] * 500 + 300  # credit_score 300-800
    X[:, 3] = X[:, 3] * 5  # claims 0-5
    X[:, 4] = X[:, 4] * 500000  # value 0-500k
    X[:, 5] = (X[:, 5] > 0.5).astype(int)  # has_family
    X[:, 6] = X[:, 6] * 3  # location 0-3
    X[:, 7] = X[:, 7] * 4  # health_status 0-4
    
    # Calculer les scores de risque cibles
    y_risk = (
        (X[:, 0] < 30) * 20 + (X[:, 0] > 60) * 15 +
        (X[:, 1] < 30000) * 25 + (X[:, 1] > 150000) * (-15) +
        (X[:, 2] < 600) * 30 + (X[:, 2] > 750) * (-20) +
        X[:, 3] * 12 +
        (X[:, 4] > 300000) * 10 +
        (1 - X[:, 5]) * 10 +
        X[:, 6] * 12 +
        X[:, 7] * 8
    )
    y_risk = np.clip(y_risk, 0, 100)
    
    # Calculer les primes cibles
    y_premium = 30 + y_risk * 1.2 + X[:, 4] / 10000 + np.random.randn(n_samples) * 10
    y_premium = np.clip(y_premium, 20, 300)
    
    # Entraîner
    rf_model.train(X, y_risk, y_premium)
    logger.info(f"✅ Modèle entraîné sur {n_samples} échantillons")
    return rf_model.is_trained

if __name__ == "__main__":
    train_model()