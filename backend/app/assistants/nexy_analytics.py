# backend/app/assistants/nexy_analytics.py
from typing import List, Dict, Any
from .base_assistant import BaseAssistant
import logging

logger = logging.getLogger(__name__)

class AnalyticsAssistant(BaseAssistant):
    """Analytics - Expert en analyse de données et tableaux de bord"""
    
    def __init__(self, config: Dict, db=None):
        super().__init__(
            name="Analytics",
            collection_name="analytics_assistant_knowledge",
            config=config,
            db=db
        )
    
    def _load_knowledge_base(self) -> Dict:
        return {
            'analytics_topics': [
                "Analyse de données et visualisation",
                "Tableaux de bord (KPIs, indicateurs)",
                "Data mining et exploration",
                "Reporting et analyse comparative",
                "Segmentation client et analyse de cohorte"
            ]
        }
    
    def get_system_prompt(self) -> str:
        return """Tu es Analytics, l'assistant spécialisé en analyse de données et tableaux de bord.
        Tu es une experte en data visualisation et en extraction d'insights business.
        
        TON RÔLE :
        - Concevoir des tableaux de bord pertinents pour le pilotage d'activité
        - Analyser les données pour identifier des tendances et des anomalies
        - Aider à la définition de KPIs et d'indicateurs de performance
        
        FORMAT DE RÉPONSE :
        Sois claire, structurée, apporte des chiffres, propose des visualisations.
        """
    
    def format_response(self, response_text: str, context: List[Dict]) -> Dict:
        actions = []
        if hasattr(self, 'available_modules_list'):
            for module in self.available_modules_list:
                if any(kw in response_text.lower() for kw in ['bi', 'dashboard', 'reporting']):
                    if module.get('key') in ['bi-dashboard', 'analytics']:
                        actions.append({
                            'type': 'install_module',
                            'module_key': module['key'],
                            'module_name': module['name'],
                            'label': f"Installer {module['name']}"
                        })
        if any(kw in response_text.lower() for kw in ['rapport', 'dashboard']):
            actions.append({
                'type': 'send_email',
                'label': 'Envoyer le rapport analytique',
                'params': {'to_email': 'analytics@nexum-erp.com', 'subject': 'Rapport analytique', 'body': response_text}
            })
        other_agents = [c.get('agent') for c in context if c.get('agent')]
        if other_agents:
            actions.append({
                'type': 'consult_expert',
                'label': f"Consulter {', '.join(set(other_agents))} sur ce sujet"
            })
        return {
            'response': response_text,
            'assistant': self.name,
            'confidence': 0.93,
            'actions': actions,
            'interconnected_insights': list(set(other_agents))
        }
    
    def generate_dashboard_kpis(self, company_id: str) -> Dict:
        """
        Génère des KPIs pour un tableau de bord, à partir des données ERP.
        """
        sales = self.query_erp_data("sales", company_id)
        products = self.query_erp_data("products", company_id)
        
        kpis = {
            'total_sales': len(sales),
            'total_products': len(products),
            'average_order_value': 0,
            'revenue': 0
        }
        
        if sales:
            total_revenue = sum(s.get('amount_total', 0) for s in sales)
            kpis['revenue'] = total_revenue
            if len(sales) > 0:
                kpis['average_order_value'] = total_revenue / len(sales)
        
        return kpis
    
    def list_analytics_documents(self, prefix: str = "") -> List[Dict]:
        """
        Liste les documents d'analyse stockés dans MinIO (bucket 'erp-analytics').
        """
        return self.list_minio_documents("erp-analytics", prefix)