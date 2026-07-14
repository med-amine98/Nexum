# app/ml/insider_threat.py
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from typing import List, Dict, Tuple
import logging

logger = logging.getLogger(__name__)

class InsiderThreatDetector:
    """
    Détection des menaces internes basée sur l'analyse comportementale
    et la psychologie organisationnelle
    """
    
    def __init__(self):
        self.scaler = StandardScaler()
        self.isolation_forest = IsolationForest(contamination=0.1, random_state=42)
        self.behavioral_baseline = {}
        
    def extract_behavioral_features(self, employee_data: Dict) -> np.ndarray:
        """
        Extrait les features comportementales
        """
        features = []
        
        # Facteurs psychologiques
        features.append(employee_data.get('stress_level', 50) / 100)  # 0-1
        features.append((100 - employee_data.get('satisfaction', 50)) / 100)  # Insatisfaction
        features.append(employee_data.get('anxiety_level', 30) / 100)  # Anxiété
        features.append(employee_data.get('engagement', 70) / 100)  # Engagement inversé
        
        # Facteurs comportementaux
        features.append(min(employee_data.get('access_anomalies', 0) / 10, 1.0))
        features.append(min(employee_data.get('overtime_ratio', 0) / 100, 1.0))
        features.append(min(employee_data.get('data_transfer_anomaly', 0) / 100, 1.0))
        features.append(min(employee_data.get('login_anomalies', 0) / 20, 1.0))
        
        # Facteurs relationnels
        features.append(employee_data.get('isolation_score', 0))
        features.append(employee_data.get('conflict_frequency', 0) / 10)
        
        return np.array(features).reshape(1, -1)
    
    def calculate_psychological_risk(self, employee: Dict) -> Dict:
        """
        Calcule le risque psychologique basé sur des modèles de stress et satisfaction
        """
        stress = employee.get('stress_level', 50)
        satisfaction = employee.get('satisfaction', 50)
        social_isolation = employee.get('social_isolation', 0)
        
        # Modèle de burnout (Maslach)
        burnout_risk = (stress * 0.5 + (100 - satisfaction) * 0.3 + social_isolation * 0.2) / 100
        
        # Modèle de frustration
        frustration = (stress - satisfaction) / 100 if stress > satisfaction else 0
        
        # Modèle de désengagement
        disengagement = (100 - satisfaction) / 100 * (1 - employee.get('engagement', 70) / 100)
        
        return {
            'burnout_risk': min(burnout_risk, 1.0),
            'frustration': max(frustration, 0),
            'disengagement': min(disengagement, 1.0),
            'overall_psychological_risk': min((burnout_risk + frustration + disengagement) / 3, 1.0)
        }
    
    def detect_anomalies(self, employee_data: List[Dict]) -> List[Dict]:
        """
        Détecte les comportements anormaux avec Isolation Forest
        """
        if len(employee_data) < 10:
            return []
        
        # Extraction des features
        features = []
        for emp in employee_data:
            feat = self.extract_behavioral_features(emp).flatten()
            features.append(feat)
        
        features = np.array(features)
        
        # Standardisation
        features_scaled = self.scaler.fit_transform(features)
        
        # Détection des anomalies
        predictions = self.isolation_forest.fit_predict(features_scaled)
        
        anomalies = []
        for i, (emp, pred) in enumerate(zip(employee_data, predictions)):
            if pred == -1:  # Anomalie détectée
                risk_score = self.calculate_psychological_risk(emp)['overall_psychological_risk'] * 100
                
                anomalies.append({
                    'employee_id': emp.get('id'),
                    'name': emp.get('name'),
                    'risk_score': risk_score,
                    'indicators': self._get_indicators(emp),
                    'recommendation': self._get_recommendation(risk_score, emp)
                })
        
        return sorted(anomalies, key=lambda x: x['risk_score'], reverse=True)
    
    def _get_indicators(self, employee: Dict) -> List[str]:
        """
        Identifie les indicateurs de risque
        """
        indicators = []
        
        if employee.get('stress_level', 50) > 70:
            indicators.append("Stress chronique élevé")
        if employee.get('satisfaction', 50) < 30:
            indicators.append("Insatisfaction sévère")
        if employee.get('access_anomalies', 0) > 3:
            indicators.append("Accès non autorisés répétés")
        if employee.get('overtime_ratio', 0) > 50:
            indicators.append("Heures supplémentaires excessives")
        if employee.get('data_transfer_anomaly', 0) > 50:
            indicators.append("Transferts de données suspects")
        if employee.get('login_anomalies', 0) > 5:
            indicators.append("Connexions hors horaires")
        if employee.get('social_isolation', 0) > 70:
            indicators.append("Isolement social")
        
        return indicators
    
    def _get_recommendation(self, risk_score: float, employee: Dict) -> str:
        """
        Génère une recommandation basée sur le score de risque
        """
        if risk_score > 80:
            return "Action immédiate: Entretien disciplinaire, suspension des accès, enquête RH"
        elif risk_score > 60:
            return "Surveillance renforcée: Entretien avec manager, contrôle des accès, suivi psychologique"
        elif risk_score > 40:
            return "Action préventive: Entretien RH, coaching, réduction de la charge de travail"
        elif risk_score > 20:
            return "Surveillance normale: Point régulier avec manager, check-in hebdomadaire"
        else:
            return "Risque acceptable: Surveillance de routine"