# backend/app/assistants/nexy_growth.py
from typing import List, Dict, Any
from .base_assistant import BaseAssistant
import logging

logger = logging.getLogger(__name__)

class GrowthAssistant(BaseAssistant):
    """Elena - Experte en stratégie de croissance, marketing et expansion"""
    
    def __init__(self, config: Dict, db=None):
        super().__init__(
            name="Elena (Growth)",
            collection_name="nexy_growth_knowledge",
            config=config,
            db=db
        )
    
    def _load_knowledge_base(self) -> Dict:
        return {
            'enterprise_kpis': ["EBITDA", "Churn rate", "LTV (Lifetime Value)", "CAC (Cost of Acquisition)"],
            'strategies': ["Cross-sell modules ERP", "Optimisation de la Supply Chain", "Fidélisation Grand Compte"]
        }
    
    def get_system_prompt(self) -> str:
        return """Tu es Elena (Nexy Growth), la stratège business de l'ERP. 
        Ton focus est le secteur ENTREPRISE (SaaS, Industrie, Services).
        Tu parles de ROI, d'efficience opérationnelle et d'expansion de marché.
        Ton ton est énergique, visionnaire et axé sur les résultats."""

    def format_response(self, response_text: str, context: List[Dict]) -> Dict:
        visualizations = []
        lower_text = response_text.lower()
        
        # SÉCTEUR ENTREPRISE : Croissance des revenus (Line Chart)
        if any(word in lower_text for word in ["vente", "croissance", "chiffre", "ca", "performance"]):
            visualizations.append({
                "type": "line",
                "title": "Progression de la Croissance Trimestrielle",
                "labels": ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin"],
                "values": [120, 145, 138, 162, 190, 210]
            })

        # Pipeline de vente (KPIs)
        if "pipeline" in lower_text or "opportunité" in lower_text:
            visualizations.append({
                "type": "bar",
                "title": "Pipeline de Ventes par Secteur",
                "labels": ["Banque", "Assurance", "Retail", "Tech"],
                "values": [45, 32, 18, 54]
            })

        return {
            'response': response_text,
            'assistant': self.name,
            'confidence': 0.95,
            'visualizations': visualizations,
            'actions': [{'type': 'growth_audit', 'label': 'Générer plan stratégique'}],
            'interconnected_insights': [c.get('agent') for c in context if c.get('agent')]
        }
    
    def get_sales_forecast(self, company_id: str) -> List[Dict]:
        """
        Récupère les prévisions de ventes depuis PostgreSQL (ERP).
        """
        return self.query_erp_data("sales", company_id, {"status": "confirmed"})
    
    def get_customer_ltv(self, company_id: str) -> Dict:
        """
        Calcule la LTV (Lifetime Value) des clients via PostgreSQL.
        """
        sales = self.query_erp_data("sales", company_id)
        if not sales:
            return {"ltv": 0, "message": "Pas de données de ventes"}
        
        total_revenue = sum(s.get("amount_total", 0) for s in sales)
        unique_clients = len(set(s.get("partner_id") for s in sales if s.get("partner_id")))
        
        if unique_clients == 0:
            return {"ltv": 0, "message": "Aucun client trouvé"}
        
        ltv = total_revenue / unique_clients
        return {"ltv": round(ltv, 2), "total_revenue": total_revenue, "unique_clients": unique_clients}
    
    def list_marketing_documents(self, prefix: str = "") -> List[Dict]:
        """
        Liste les documents marketing stockés dans MinIO (bucket 'erp-documents').
        """
        return self.list_minio_documents("erp-documents", prefix)