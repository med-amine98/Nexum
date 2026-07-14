import numpy as np
import pandas as pd
from typing import Dict, Any
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score
import os
import joblib

class ClaimPredictionModel:
    """Modèle de prédiction des sinistres (XGBoost)"""
    
    def __init__(self):
        self.model = None
        self.feature_names = [
            'client_age', 'property_age', 'claim_history', 
            'weather_risk', 'crime_rate', 'prevention_score'
        ]
        
    def train(self, data: pd.DataFrame) -> Dict[str, Any]:
        """Entraîne le modèle XGBoost sur les données fournies"""
        X = data[self.feature_names]
        y = data['claims_next_30days']
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        self.model = xgb.XGBClassifier(
            n_estimators=100,
            learning_rate=0.1,
            max_depth=5,
            use_label_encoder=False,
            eval_metric='logloss'
        )
        
        self.model.fit(X_train, y_train)
        
        y_pred = self.model.predict_proba(X_test)[:, 1]
        auc = roc_auc_score(y_test, y_pred)
        
        # Importance des features
        importance = dict(zip(self.feature_names, self.model.feature_importances_.tolist()))
        
        return {
            'auc_roc': float(auc),
            'feature_importance': importance,
            'status': 'trained'
        }
        
    def predict_risk(self, client_data: Dict[str, Any]) -> Dict[str, Any]:
        """Prédit le risque pour un client en utilisant le modèle entraîné"""
        if self.model is None:
            # Fallback si le modèle n'est pas chargé
            return self._fallback_predict(client_data)
            
        # Préparer les données pour l'inférence
        df = pd.DataFrame([client_data])[self.feature_names]
        
        probability = float(self.model.predict_proba(df)[:, 1][0])
        risk_score = round(probability * 100, 2)
        
        # Déterminer le verdict et l'urgence
        if risk_score > 0.8:
            verdict = "REJECTED_HIGH_RISK"
            urgency = 5 # Critique
        elif risk_score > 0.5:
            verdict = "PENDING_REVIEW"
            urgency = 3 # Moyen
        else:
            verdict = "APPROVED_AUTO"
            urgency = 1 # Faible
            
        return {
            "risk_score": float(risk_score),
            "verdict": verdict,
            "urgency": urgency,
            "timestamp": datetime.now().isoformat(),
            "metadata": {
                "model": "XGBoost_Sinistre_V2",
                "features_analyzed": list(df.columns),
                "ui_hint": "highlight_security" if urgency > 3 else "standard"
            }
        }

    def _fallback_predict(self, client_data: Dict[str, Any]) -> Dict[str, Any]:
        """Méthode de secours si le modèle n'est pas encore entraîné"""
        score = (client_data.get('claim_history', 0) * 0.1) + (client_data.get('weather_risk', 0) / 100 * 0.5)
        prob = min(0.99, max(0.01, score))
        return {
            'risk_probability': prob,
            'risk_level': "low" if prob < 0.3 else "medium" if prob < 0.7 else "high",
            'risk_score': round(prob * 100, 2),
            'method': 'fallback_heuristic'
        }

# Instance globale
claim_model = ClaimPredictionModel()