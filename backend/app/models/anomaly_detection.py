# app/models/anomaly_detection.py
from sklearn.ensemble import IsolationForest
import numpy as np
import pandas as pd

class RiskAnomalyDetector:
    """Détecte les comportements à risque anormaux"""
    
    def __init__(self, contamination=0.1):
        self.model = IsolationForest(
            contamination=contamination,
            random_state=42,
            n_estimators=100
        )
        
    def train(self, normal_behavior: pd.DataFrame):
        """Entraîne sur des comportements normaux"""
        self.model.fit(normal_behavior)
        
    def detect_anomalies(self, current_behavior: pd.DataFrame) -> list:
        """Détecte les comportements anormaux"""
        predictions = self.model.predict(current_behavior)
        scores = self.model.score_samples(current_behavior)
        
        anomalies = []
        for i, (pred, score) in enumerate(zip(predictions, scores)):
            if pred == -1:  # Anomalie détectée
                anomalies.append({
                    'index': i,
                    'anomaly_score': float(score),
                    'risk_level': 'high' if score < -0.3 else 'medium',
                    'data': current_behavior.iloc[i].to_dict()
                })
        
        return anomalies

anomaly_detector = RiskAnomalyDetector()