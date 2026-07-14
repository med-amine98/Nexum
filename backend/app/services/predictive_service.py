# app/services/predictive_service.py
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import PolynomialFeatures
from datetime import datetime, timedelta
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)

class PredictiveService:
    """Service de prédiction basé sur des modèles ML réels"""
    
    @staticmethod
    def predict_trends(historical_data: List[float], days_ahead: int = 30) -> Dict[str, Any]:
        if len(historical_data) < 3:
            return {
                "prediction": historical_data[-1] if historical_data else 0,
                "trend": 0,
                "confidence": 0.5,
                "next_values": []
            }
        
        try:
            X = np.arange(len(historical_data)).reshape(-1, 1)
            y = np.array(historical_data)
            
            poly = PolynomialFeatures(degree=2)
            X_poly = poly.fit_transform(X)
            
            model = LinearRegression()
            model.fit(X_poly, y)
            
            future_X = np.arange(len(historical_data), len(historical_data) + days_ahead).reshape(-1, 1)
            future_X_poly = poly.transform(future_X)
            predictions = model.predict(future_X_poly)
            
            trend = ((predictions[-1] - historical_data[-1]) / historical_data[-1]) * 100 if historical_data[-1] != 0 else 0
            
            y_pred = model.predict(X_poly)
            ss_res = np.sum((y - y_pred) ** 2)
            ss_tot = np.sum((y - np.mean(y)) ** 2)
            r2 = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0
            
            return {
                "prediction": float(predictions[-1]),
                "trend": float(trend),
                "confidence": float(max(0, min(1, r2))),
                "next_values": [float(v) for v in predictions[:7]],
                "growth_rate": float(trend / 100)
            }
        except Exception as e:
            logger.error(f"Erreur predict_trends: {e}")
            return {
                "prediction": historical_data[-1] if historical_data else 0,
                "trend": 0,
                "confidence": 0,
                "next_values": []
            }
    
    @staticmethod
    def calculate_health_score(project_data: Dict[str, Any]) -> Dict[str, Any]:
        weights = {
            "performance": 0.3,
            "security": 0.25,
            "growth": 0.25,
            "innovation": 0.2
        }
        
        performance_score = PredictiveService._calculate_performance_score(project_data)
        security_score = PredictiveService._calculate_security_score(project_data)
        growth_score = PredictiveService._calculate_growth_score(project_data)
        innovation_score = PredictiveService._calculate_innovation_score(project_data)
        
        total_score = (
            performance_score * weights["performance"] +
            security_score * weights["security"] +
            growth_score * weights["growth"] +
            innovation_score * weights["innovation"]
        )
        
        return {
            "score": round(total_score, 2),
            "metrics": {
                "performance": round(performance_score, 2),
                "securite": round(security_score, 2),
                "croissance": round(growth_score, 2),
                "innovation": round(innovation_score, 2)
            },
            "status": "critical" if total_score < 40 else "warning" if total_score < 70 else "good" if total_score < 90 else "excellent"
        }
    
    @staticmethod
    def _calculate_performance_score(project_data: Dict) -> float:
        progress = project_data.get('progress', 0)
        kpi_revenue = project_data.get('kpi_revenue', 0)
        kpi_orders = project_data.get('kpi_orders', 0)
        
        progress_score = progress / 100
        revenue_score = min(1, kpi_revenue / 1000000) if kpi_revenue > 0 else 0
        orders_score = min(1, kpi_orders / 500) if kpi_orders > 0 else 0
        
        return (progress_score * 0.4 + revenue_score * 0.35 + orders_score * 0.25) * 100
    
    @staticmethod
    def _calculate_security_score(project_data: Dict) -> float:
        kpi_alerts = project_data.get('kpi_alerts', 0)
        
        if kpi_alerts == 0:
            security_score = 100
        elif kpi_alerts < 5:
            security_score = 85
        elif kpi_alerts < 10:
            security_score = 70
        elif kpi_alerts < 20:
            security_score = 50
        else:
            security_score = max(0, 100 - kpi_alerts)
        
        return security_score
    
    @staticmethod
    def _calculate_growth_score(project_data: Dict) -> float:
        kpi_trends = project_data.get('kpi_trends', {})
        
        revenue_trend = abs(kpi_trends.get('revenue_trend', 0))
        orders_trend = abs(kpi_trends.get('orders_trend', 0))
        clients_trend = abs(kpi_trends.get('clients_trend', 0))
        
        avg_trend = (revenue_trend + orders_trend + clients_trend) / 3 if any([revenue_trend, orders_trend, clients_trend]) else 0
        
        return min(100, avg_trend * 2)
    
    @staticmethod
    def _calculate_innovation_score(project_data: Dict) -> float:
        modules = project_data.get('modules', [])
        if not modules:
            return 50
        
        innovative_modules = ['IA', 'Blockchain', 'Machine Learning', 'IoT', 'Sécurité']
        innovative_count = sum(1 for m in modules if m.get('name') in innovative_modules)
        
        return (innovative_count / max(1, len(modules))) * 100
    
    @staticmethod
    def generate_insights(project_data: Dict, health_data: Dict) -> List[Dict]:
        insights = []
        
        if health_data['metrics']['performance'] < 60:
            insights.append({
                "type": "warning",
                "title": "Performance à améliorer",
                "description": f"Score de performance à {health_data['metrics']['performance']}%.",
                "priority": "high",
                "impact": "Élevé",
                "action_path": "/performance/analysis"
            })
        elif health_data['metrics']['performance'] > 85:
            insights.append({
                "type": "success",
                "title": "Performance exceptionnelle",
                "description": f"Score de performance à {health_data['metrics']['performance']}%.",
                "priority": "low",
                "impact": "Positif",
                "action_path": "/performance/best-practices"
            })
        
        if health_data['metrics']['securite'] < 50:
            insights.append({
                "type": "critical",
                "title": "Risque de sécurité critique",
                "description": f"Score sécurité bas ({health_data['metrics']['securite']}%).",
                "priority": "critical",
                "impact": "Critique",
                "action_path": "/security/fraud"
            })
        
        revenue_trend = project_data.get('kpi_trends', {}).get('revenue_trend', 0)
        if revenue_trend > 15:
            insights.append({
                "type": "opportunity",
                "title": "Croissance accélérée",
                "description": f"Chiffre d'affaires en hausse de {revenue_trend:.1f}%.",
                "priority": "medium",
                "impact": "Élevé",
                "action_path": "/analytics/predictive"
            })
        
        return insights

logger.info("✅ Service de prédiction ML chargé")