# scripts/train_models.py
import pandas as pd
import numpy as np
from app.models.claim_prediction import claim_model
from app.models.weather_forecast import weather_predictor

# 1. Générer données d'entraînement (10000 clients)
np.random.seed(42)
training_data = pd.DataFrame({
    'client_age': np.random.randint(18, 80, 10000),
    'property_age': np.random.randint(0, 100, 10000),
    'claim_history': np.random.poisson(0.5, 10000),
    'weather_risk': np.random.uniform(0, 100, 10000),
    'crime_rate': np.random.uniform(0, 100, 10000),
    'prevention_score': np.random.uniform(0, 100, 10000),
    'claims_next_30days': np.random.choice([0, 1], 10000, p=[0.85, 0.15])
})

# 2. Entraîner le modèle de prédiction
logger.info("Entraînement du modèle de prédiction des sinistres...")
results = claim_model.train(training_data)
logger.info(f"✅ AUC-ROC: {results['auc_roc']:.3f}")
logger.info(f"📊 Importance des features: {results['feature_importance']}")

# 3. Sauvegarder le modèle
import joblib
joblib.dump(claim_model.model, 'models/claim_predictor.pkl')

# 4. Entraîner le modèle météo
logger.info("\nEntraînement du modèle météo...")
historical_weather = np.random.rand(1000, 5)
weather_predictor.build_model()
weather_predictor.train(historical_weather)
weather_predictor.model.save('models/weather_predictor.h5')

logger.info("✅ Tous les modèles entraînés et sauvegardés !")