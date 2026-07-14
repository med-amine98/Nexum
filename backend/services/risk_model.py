# app/services/risk_model.py
import numpy as np
import joblib
import os
import logging
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)

class RiskModel:
    """Modèle Random Forest pour l'évaluation des risques"""
    
    def __init__(self):
        self.risk_model = None
        self.premium_model = None
        self.scaler = StandardScaler()
        self.is_trained = False
        self.model_path = "models/risk_model.pkl"
        
    def train(self, X_train, y_risk, y_premium):
        """Entraîner les modèles Random Forest"""
        try:
            os.makedirs("models", exist_ok=True)
            X_scaled = self.scaler.fit_transform(X_train)
            
            self.risk_model = RandomForestRegressor(
                n_estimators=100, max_depth=10, min_samples_split=5, random_state=42, n_jobs=-1
            )
            self.risk_model.fit(X_scaled, y_risk)
            
            self.premium_model = RandomForestRegressor(
                n_estimators=100, max_depth=10, random_state=42, n_jobs=-1
            )
            self.premium_model.fit(X_scaled, y_premium)
            
            self.is_trained = True
            self._save_model()
            logger.info("✅ Modèles Random Forest entraînés avec succès")
            return True
        except Exception as e:
            logger.error(f"Erreur entraînement: {e}")
            self.is_trained = False
            return False
    
    def predict_risk(self, features):
        """Prédire le score de risque"""
        if not self.is_trained or self.risk_model is None:
            return self._rule_based_risk(features)
        try:
            if len(features.shape) == 1:
                features = features.reshape(1, -1)
            features_scaled = self.scaler.transform(features)
            return float(self.risk_model.predict(features_scaled)[0])
        except Exception as e:
            logger.error(f"Erreur prédiction risque: {e}")
            return self._rule_based_risk(features)
    
    def predict_premium(self, features):
        """Prédire la prime personnalisée"""
        if not self.is_trained or self.premium_model is None:
            return self._rule_based_premium(features)
        try:
            if len(features.shape) == 1:
                features = features.reshape(1, -1)
            features_scaled = self.scaler.transform(features)
            return float(self.premium_model.predict(features_scaled)[0])
        except Exception as e:
            logger.error(f"Erreur prédiction prime: {e}")
            return self._rule_based_premium(features)
    
    def _rule_based_risk(self, features):
        """Fallback basé sur des règles"""
        try:
            if len(features.shape) > 1:
                features = features[0]
            age, income, credit_score, claims, value, has_family, location, health = features
            score = 50
            if age < 25: score += 15
            if income < 30000: score += 20
            if credit_score < 600: score += 25
            score += claims * 15
            if has_family: score -= 10
            if location > 1: score += 20
            return max(0, min(100, score))
        except:
            return 50
    
    def _rule_based_premium(self, features):
        """Fallback pour la prime"""
        try:
            if len(features.shape) > 1:
                features = features[0]
            return 50 + features[0] * 0.5
        except:
            return 75
    
    def _save_model(self):
        """Sauvegarder le modèle"""
        try:
            joblib.dump({
                'risk_model': self.risk_model,
                'premium_model': self.premium_model,
                'scaler': self.scaler
            }, self.model_path)
            logger.info("✅ Modèle sauvegardé")
        except Exception as e:
            logger.error(f"Erreur sauvegarde: {e}")
    
    def load_model(self):
        """Charger le modèle sauvegardé"""
        try:
            if os.path.exists(self.model_path):
                data = joblib.load(self.model_path)
                self.risk_model = data['risk_model']
                self.premium_model = data['premium_model']
                self.scaler = data['scaler']
                self.is_trained = True
                logger.info("✅ Modèle chargé avec succès")
                return True
        except Exception as e:
            logger.error(f"Erreur chargement: {e}")
        return False


# Instance globale
risk_model = RiskModel()


def init_risk_model():
    """Initialiser le modèle Random Forest"""
    if not risk_model.load_model():
        logger.info("Entraînement du modèle Random Forest...")
        np.random.seed(42)
        n_samples = 2000
        
        X = np.random.rand(n_samples, 8)
        X[:, 0] = X[:, 0] * 80 + 18
        X[:, 1] = X[:, 1] * 180000 + 20000
        X[:, 2] = X[:, 2] * 500 + 300
        X[:, 3] = X[:, 3] * 5
        X[:, 4] = X[:, 4] * 500000
        X[:, 5] = (X[:, 5] > 0.5).astype(int)
        X[:, 6] = X[:, 6] * 3
        X[:, 7] = X[:, 7] * 4
        
        y_risk = np.clip(
            (X[:, 0] < 30) * 20 + (X[:, 0] > 60) * 15 +
            (X[:, 1] < 30000) * 25 + (X[:, 1] > 150000) * (-15) +
            (X[:, 2] < 600) * 30 + (X[:, 2] > 750) * (-20) +
            X[:, 3] * 12 + (X[:, 4] > 300000) * 10 +
            (1 - X[:, 5]) * 10 + X[:, 6] * 12 + X[:, 7] * 8, 0, 100)
        
        y_premium = np.clip(30 + y_risk * 1.2 + X[:, 4] / 10000 + np.random.randn(n_samples) * 10, 20, 300)
        
        risk_model.train(X, y_risk, y_premium)
    return risk_model