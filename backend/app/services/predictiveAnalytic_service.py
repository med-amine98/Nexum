# app/services/predictiveAnalytic_service.py
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.predictive_analytics import (
    HistoricalData, MetricType
)
from app.services.predictive_ml_service import get_predictive_ml_service

logger = logging.getLogger(__name__)

class PredictiveAnalyticService:
    """Service d'analytics prédictif avec IA Random Forest"""
    
    def __init__(self):
        self.ml_service = get_predictive_ml_service()
    
    def get_dashboard_data(self, db: Session) -> Dict[str, Any]:
        """Récupère toutes les données du tableau de bord"""
        try:
            current_metrics = self.get_current_metrics(db)
            sales_forecast = self.generate_future_forecast(db, 12)
            metric_predictions = self.predict_future_metrics(db)
            
            return {
                "current_metrics": current_metrics,
                "sales_forecast": sales_forecast,
                "metric_predictions": metric_predictions,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Erreur dashboard: {e}")
            return {
                "current_metrics": {},
                "sales_forecast": [],
                "metric_predictions": [],
                "timestamp": datetime.now().isoformat()
            }
    
    def get_current_metrics(self, db: Session) -> Dict[str, float]:
        """Récupère les métriques actuelles depuis la base de données"""
        try:
            metrics = {}
            
            for metric in MetricType:
                latest = db.query(HistoricalData).filter(
                    HistoricalData.metric == metric
                ).order_by(HistoricalData.date.desc()).first()
                
                if latest:
                    metrics[metric.value] = latest.value
            
            return metrics
        except Exception as e:
            logger.error(f"Erreur get_current_metrics: {e}")
            return {}
    
    def generate_future_forecast(self, db: Session, steps: int = 12) -> List[Dict[str, Any]]:
        """Génère des prévisions futures avec Random Forest"""
        try:
            return self.ml_service.predict_future(db, MetricType.REVENUE, steps)
        except Exception as e:
            logger.error(f"Erreur generate_future_forecast: {e}")
            return []
    
    def predict_future_metrics(self, db: Session) -> List[Dict[str, Any]]:
        """Prédit toutes les métriques futures"""
        try:
            predictions = []
            
            for metric in MetricType:
                latest = db.query(HistoricalData).filter(
                    HistoricalData.metric == metric
                ).order_by(HistoricalData.date.desc()).first()
                
                if not latest:
                    continue
                
                current_value = latest.value
                future_pred = self.ml_service.predict_future(db, metric, 1)
                
                if future_pred:
                    predicted_value = future_pred[0]["predicted_value"]
                    confidence = future_pred[0]["confidence"]
                else:
                    continue
                
                trend = ((predicted_value / current_value) - 1) * 100 if current_value > 0 else 0
                
                units = {
                    "revenue": "€",
                    "orders": "commandes",
                    "avg_basket": "€",
                    "conversion": "%",
                    "new_clients": "entreprises"
                }
                
                predictions.append({
                    "metric_name": metric.value,
                    "current_value": round(current_value, 2),
                    "predicted_value": round(predicted_value, 2),
                    "growth_rate": round(trend / 100, 4),
                    "confidence": round(confidence * 100, 1) if confidence else 0,
                    "unit": units.get(metric.value, "")
                })
            
            return predictions
            
        except Exception as e:
            logger.error(f"Erreur predict_future_metrics: {e}")
            return []
    
    def run_simulation(self, db: Session, scenario_id: Optional[int], custom_params: Dict) -> Dict:
        """Exécute une simulation avec un scénario donné"""
        try:
            from app.models.predictive_analytics import SimulationScenario
            
            metrics = self.get_current_metrics(db)
            current_revenue = metrics.get("revenue", 0)
            
            if current_revenue == 0:
                return {
                    "scenario_name": "Données insuffisantes",
                    "projected_revenue": 0,
                    "variation": 0,
                    "confidence": 0,
                    "recommendation": "Ajoutez des données historiques pour les simulations"
                }
            
            scenario = None
            if scenario_id:
                scenario = db.query(SimulationScenario).filter(
                    SimulationScenario.id == scenario_id
                ).first()
            
            impact = custom_params.get("impact", 0)
            if scenario and not custom_params.get("impact"):
                impact = scenario.impact or 0
            
            impact_factor = 1 + (impact / 100)
            projected_revenue = current_revenue * impact_factor
            variation = (impact_factor - 1) * 100
            
            return {
                "scenario_name": scenario.name if scenario else "Scénario personnalisé",
                "projected_revenue": round(projected_revenue, 2),
                "variation": round(variation, 1),
                "confidence": 85,
                "recommendation": self._generate_recommendation(variation)
            }
            
        except Exception as e:
            logger.error(f"Erreur run_simulation: {e}")
            return {
                "scenario_name": "Erreur",
                "projected_revenue": 0,
                "variation": 0,
                "confidence": 0,
                "recommendation": "Erreur lors de la simulation"
            }
    
    def _generate_recommendation(self, variation: float) -> str:
        """Génère une recommandation basée sur la variation"""
        if variation > 15:
            return "Augmenter les investissements marketing et R&D"
        elif variation > 5:
            return "Maintenir la stratégie et investir dans l'innovation"
        elif variation > 0:
            return "Optimiser les coûts et améliorer l'efficacité"
        elif variation > -5:
            return "Surveiller les indicateurs et ajuster progressivement"
        else:
            return "Réduire les coûts et diversifier les sources de revenus"

predictive_service = PredictiveAnalyticService()