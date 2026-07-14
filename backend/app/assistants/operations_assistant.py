# backend/app/assistants/operations_assistant.py
from typing import List, Dict, Any
from .base_assistant import BaseAssistant

class OperationsAssistant(BaseAssistant):
    """Operations (predict) - Expert en optimisation des opérations et supply chain"""
    
    def __init__(self, config: Dict, db=None):
        super().__init__(
            name="Operations",
            collection_name="operations_assistant_knowledge",
            config=config,
            db=db
        )
    
    def _load_knowledge_base(self) -> Dict:
        return {
            'operations_topics': [
                "Gestion de la chaîne d'approvisionnement",
                "Optimisation des stocks et des approvisionnements",
                "Planification de la production",
                "Logistique et transport",
                "Processus opérationnels et amélioration continue",
                "Indicateurs de performance opérationnelle (KPI)"
            ],
            'sector_keywords': {
                'banking': ['back-office', 'traitement des opérations'],
                'insurance': ['gestion des sinistres', 'processus'],
                'enterprise': ['supply chain', 'production', 'logistique']
            },
            'best_practices': [
                "Lean management",
                "Six Sigma",
                "Juste-à-temps"
            ]
        }
    
    def get_system_prompt(self) -> str:
        return """Tu es Operations, l'assistant spécialisé en optimisation des opérations et supply chain.
        Tu es un expert en logistique, planification, et amélioration des processus.

        TON RÔLE :
        - Optimiser la chaîne d'approvisionnement (coûts, délais, qualité)
        - Analyser les processus opérationnels et proposer des améliorations
        - Aider à la gestion des stocks et des approvisionnements
        - Concevoir des indicateurs de performance (KPI) pertinents

        CAPACITÉS SPÉCIALES :
        - Tu peux suggérer des modules de gestion de stock, planification ou logistique.
        - Tu peux générer des rapports d'analyse opérationnelle.
        - Tu peux collaborer avec Analytics pour des analyses de données opérationnelles.

        FORMAT DE RÉPONSE :
        Sois pragmatique, orientée résultats, donne des chiffres et des actions concrètes.
        Propose des solutions basées sur des méthodologies éprouvées.
        """
    
    def format_response(self, response_text: str, context: List[Dict]) -> Dict:
        actions = []
        
        # Détection d'installation de modules
        if hasattr(self, 'available_modules_list'):
            for module in self.available_modules_list:
                if any(kw in response_text.lower() for kw in ['stock', 'logistique', 'planification']):
                    if module.get('key') in ['stock', 'supply-chain', 'inventory']:
                        actions.append({
                            'type': 'install_module',
                            'module_key': module['key'],
                            'module_name': module['name'],
                            'label': f"Installer {module['name']}"
                        })
        
        # Détection d'envoi de rapport
        if any(kw in response_text.lower() for kw in ['rapport', 'performance', 'kpi']):
            actions.append({
                'type': 'send_email',
                'label': 'Envoyer le rapport opérationnel par email',
                'params': {
                    'to_email': 'operations@nexum-erp.com',
                    'subject': 'Rapport de performance opérationnelle',
                    'body': response_text
                }
            })
        
        # Proposer une simulation
        if any(kw in response_text.lower() for kw in ['optimiser', 'simuler', 'prévoir']):
            actions.append({
                'type': 'simulate_scenario',
                'label': 'Simuler un scénario opérationnel'
            })
        
        # Interconnexion
        other_agents = [c.get('agent') for c in context if c.get('agent')]
        if other_agents:
            actions.append({
                'type': 'consult_expert',
                'label': f"Consulter {', '.join(set(other_agents))} sur ce sujet"
            })

        if not actions:
            actions.append({'type': 'process_scan', 'label': 'Analyser les processus actuels'})

        return {
            'response': response_text,
            'assistant': self.name,
            'confidence': 0.91,
            'actions': actions,
            'interconnected_insights': list(set(other_agents))
        }