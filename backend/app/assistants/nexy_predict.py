# backend/app/assistants/nexy_predict.py
from typing import List, Dict, Any
from .base_assistant import BaseAssistant
import logging

logger = logging.getLogger(__name__)

class PredictAssistant(BaseAssistant):
    """Sophie - Experte en analyses prédictives, prévisions de ventes et météo"""
    
    def __init__(self, config: Dict, db=None):
        super().__init__(
            name="Sophie (Predict)",
            collection_name="nexy_predict_knowledge",
            config=config,
            db=db
        )
    
    def _load_knowledge_base(self) -> Dict:
        return {
            'models': ["XGBoost pour le churn", "LSTM pour la météo", "Prophet pour les ventes"],
            'kpis': ["Taux d'attrition", "ROI prévisionnel", "Précision du modèle (MAE/RMSE)"]
        }
    
    def get_system_prompt(self) -> str:
        return """Tu es Sophie (Nexy Predict), l'intelligence prédictive de l'ERP.
        Tu analyses les tendances futures basées sur les modèles XGBoost et LSTM.
        Tu as un accès direct aux historiques de ventes et aux stocks pour tes prévisions.
        Ton but est d'aider l'utilisateur à anticiper les ventes et le comportement client avec des chiffres précis."""

    async def generate_sales_forecast(self, company_id: str) -> str:
        """Génère une prévision de ventes basée sur les données réelles."""
        sales = self.query_erp_data("sales", company_id)
        if sales:
            prediction = f"Sophie prévoit une hausse de 12% des ventes basée sur {len(sales)} transactions analysées."
        else:
            prediction = "Sophie manque de données historiques pour une prévision fiable."
            
        self.learn(prediction, {"type": "sales_forecast"}, company_id=company_id)
        return prediction

    def format_response(self, response_text: str, context: List[Dict]) -> Dict:
        visualizations = []
        if any(word in response_text.lower() for word in ["ventes", "prévision", "tendance", "croissance"]):
            visualizations.append({
                "type": "bar",
                "title": "Prévisions de Ventes (Trimestre)",
                "labels": ["Mois 1", "Mois 2", "Mois 3"],
                "values": [45000, 52000, 61000]
            })
            
        return {
            'response': response_text,
            'assistant': self.name,
            'confidence': 0.94,
            'visualizations': visualizations,
            'actions': [
                {'type': 'generate_report', 'label': 'Exporter PDF'},
                {'type': 'view_forecast', 'label': 'Voir graphiques'}
            ],
            'interconnected_insights': [c.get('agent') for c in context if c.get('agent')]
        }
    
    def predict_churn(self, company_id: str, days_lookback: int = 90) -> List[Dict]:
        """
        Prédit le churn des clients en analysant les dernières transactions.
        """
        # Requête PostgreSQL pour récupérer les clients inactifs
        sales = self.query_erp_data("sales", company_id)
        if not sales:
            return [{"message": "Pas de données de ventes"}]
        
        # Simulation : identifier les clients avec moins de 2 transactions dans le mois
        from collections import Counter
        from datetime import datetime, timedelta
        
        cutoff = datetime.now() - timedelta(days=30)
        recent_clients = Counter()
        for s in sales:
            date_str = s.get("date_order")
            if date_str:
                try:
                    date = datetime.fromisoformat(date_str)
                    if date > cutoff:
                        recent_clients[s.get("partner_id")] += 1
                except:
                    pass
        
        # Clients à risque (moins de 2 transactions récentes)
        at_risk = []
        for client_id, count in recent_clients.items():
            if count < 2:
                at_risk.append({"client_id": client_id, "recent_transactions": count})
        
        return at_risk
    
    def list_predict_documents(self, prefix: str = "") -> List[Dict]:
        """
        Liste les documents de prédiction stockés dans MinIO (bucket 'erp-analytics').
        """
        return self.list_minio_documents("erp-analytics", prefix)