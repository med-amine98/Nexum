# app/services/risk_model.py
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
import joblib
import os
import logging

logger = logging.getLogger(__name__)

class RandomForestModel:
    """Véritable modèle Random Forest pour l'évaluation des risques"""
    
    def __init__(self):
        self.risk_model = None
        self.premium_model = None
        self.scaler = StandardScaler()
        self.is_trained = False
        self.model_path = "models/risk_model.pkl"
        
    def train(self, X_train, y_risk, y_premium):
        """Entraîner les modèles Random Forest"""
        try:
            # Normaliser les données
            X_scaled = self.scaler.fit_transform(X_train)
            
            # Modèle pour le score de risque
            self.risk_model = RandomForestRegressor(
                n_estimators=100,
                max_depth=10,
                min_samples_split=5,
                random_state=42,
                n_jobs=-1
            )
            self.risk_model.fit(X_scaled, y_risk)
            
            # Modèle pour la prime
            self.premium_model = RandomForestRegressor(
                n_estimators=100,
                max_depth=10,
                random_state=42,
                n_jobs=-1
            )
            self.premium_model.fit(X_scaled, y_premium)
            
            self.is_trained = True
            self._save_model()
            logger.info("✅ Modèles Random Forest entraînés avec succès")
            
        except Exception as e:
            logger.error(f"Erreur entraînement: {e}")
            self.is_trained = False
    
    def predict_risk(self, features):
        """Prédire le score de risque"""
        if not self.is_trained or self.risk_model is None:
            return self._rule_based_risk(features)
        
        try:
            features_scaled = self.scaler.transform(features.reshape(1, -1))
            return float(self.risk_model.predict(features_scaled)[0])
        except:
            return self._rule_based_risk(features)
    
    def predict_premium(self, features):
        """Prédire la prime personnalisée"""
        if not self.is_trained or self.premium_model is None:
            return self._rule_based_premium(features)
        
        try:
            features_scaled = self.scaler.transform(features.reshape(1, -1))
            return float(self.premium_model.predict(features_scaled)[0])
        except:
            return self._rule_based_premium(features)
    
    def _rule_based_risk(self, features):
        """Fallback basé sur des règles"""
        age, income, credit_score, claims, value, has_family, location, health = features
        score = 50
        if age < 25: score += 15
        if income < 30000: score += 20
        if credit_score < 600: score += 25
        score += claims * 15
        return max(0, min(100, score))
    
    def _rule_based_premium(self, features):
        """Fallback pour la prime"""
        return 50 + features[0] * 0.5
    
    def _save_model(self):
        """Sauvegarder le modèle"""
        os.makedirs("models", exist_ok=True)
        joblib.dump({
            'risk_model': self.risk_model,
            'premium_model': self.premium_model,
            'scaler': self.scaler
        }, self.model_path)
    
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
rf_model = RandomForestModel()