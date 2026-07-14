# backend/app/assistants/analytics_assistant.py
from typing import List, Dict, Any
from .base_assistant import BaseAssistant

class AnalyticsAssistant(BaseAssistant):
    """Analytics (growth) - Expert en analyse de données et tableaux de bord"""
    
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
                "Data mining et exploration de données",
                "Reporting et analyse comparative",
                "Segmentation client et analyse de cohorte",
                "Prédiction et analyse de tendances"
            ],
            'sector_keywords': {
                'banking': ['analyse de portefeuille', 'performance'],
                'insurance': ['sinistralité', 'indicateurs'],
                'enterprise': ['ventes', 'marge', 'chiffre d\'affaires']
            },
            'dashboard_tools': [
                "Power BI",
                "Tableau",
                "Google Data Studio",
                "Metabase"
            ]
        }
    
    def get_system_prompt(self) -> str:
        return """Tu es Analytics, l'assistant spécialisé en analyse de données et tableaux de bord.
        Tu es une experte en data visualisation et en extraction d'insights business.

        TON RÔLE :
        - Concevoir des tableaux de bord pertinents pour le pilotage d'activité
        - Analyser les données pour identifier des tendances et des anomalies
        - Aider à la définition de KPIs et d'indicateurs de performance
        - Recommander des actions basées sur les données

        CAPACITÉS SPÉCIALES :
        - Tu peux suggérer des modules de BI ou de reporting.
        - Tu peux générer des rapports automatisés.
        - Tu collabores avec Operations et Growth pour des analyses transverses.

        FORMAT DE RÉPONSE :
        Sois claire, structurée, apporte des chiffres, propose des visualisations.
        Donne des recommandations concrètes et mesurables.
        """
    
    def format_response(self, response_text: str, context: List[Dict]) -> Dict:
        actions = []
        
        # Détection d'installation de modules
        if hasattr(self, 'available_modules_list'):
            for module in self.available_modules_list:
                if any(kw in response_text.lower() for kw in ['bi', 'dashboard', 'reporting', 'analytics']):
                    if module.get('key') in ['bi-dashboard', 'analytics', 'reporting']:
                        actions.append({
                            'type': 'install_module',
                            'module_key': module['key'],
                            'module_name': module['name'],
                            'label': f"Installer {module['name']}"
                        })
        
        # Détection d'envoi de rapport
        if any(kw in response_text.lower() for kw in ['rapport', 'dashboard', 'analyse']):
            actions.append({
                'type': 'send_email',
                'label': 'Envoyer le rapport analytique par email',
                'params': {
                    'to_email': 'analytics@nexum-erp.com',
                    'subject': 'Rapport d\'analyse de données',
                    'body': response_text
                }
            })
        
        # Proposer une analyse avancée
        if any(kw in response_text.lower() for kw in ['prédire', 'segmenter', 'corréler']):
            actions.append({
                'type': 'advanced_analytics',
                'label': 'Lancer une analyse prédictive ou de segmentation'
            })
        
        # Interconnexion
        other_agents = [c.get('agent') for c in context if c.get('agent')]
        if other_agents:
            actions.append({
                'type': 'consult_expert',
                'label': f"Consulter {', '.join(set(other_agents))} sur ce sujet"
            })

        if not actions:
            actions.append({'type': 'data_scan', 'label': 'Explorer les données disponibles'})

        return {
            'response': response_text,
            'assistant': self.name,
            'confidence': 0.93,
            'actions': actions,
            'interconnected_insights': list(set(other_agents))
        }