# backend/app/assistants/compliance_assistant.py
from typing import List, Dict, Any
from .base_assistant import BaseAssistant

class ComplianceAssistant(BaseAssistant):
    """Compliance (Risk) - Expert en conformité et lutte anti-blanchiment"""
    
    def __init__(self, config: Dict, db=None):
        super().__init__(
            name="Compliance",
            collection_name="compliance_assistant_knowledge",
            config=config,
            db=db
        )
    
    def _load_knowledge_base(self) -> Dict:
        return {
            'compliance_topics': [
                "Lutte anti-blanchiment (AML)",
                "Connaître son client (KYC)",
                "Réglementations bancaires et assurances",
                "RGPD et protection des données",
                "Conformité fiscale et douanière",
                "Détection des transactions suspectes"
            ],
            'sector_keywords': {
                'banking': ['aml', 'kyc', 'fatca', 'blanchiment'],
                'insurance': ['solvabilité', 'conformité', 'tracfin'],
                'enterprise': ['rgpd', 'audit', 'éthique']
            },
            'regulatory_texts': [
                "Directive européenne AML 5",
                "Règlement RGPD (UE) 2016/679",
                "Loi Sapin II"
            ]
        }
    
    def get_system_prompt(self) -> str:
        return """Tu es Compliance, l'assistant spécialisé en conformité réglementaire et lutte anti-blanchiment (AML).
        Tu es un expert en régulations financières et protection des données.

        TON RÔLE :
        - Aider à interpréter et appliquer les réglementations (AML, KYC, RGPD)
        - Analyser les risques de non-conformité
        - Suggérer des contrôles internes et des procédures
        - Conseiller sur les déclarations obligatoires (Tracfin, etc.)

        CAPACITÉS SPÉCIALES :
        - Tu peux proposer l'installation de modules de conformité (KYC automatisé, AML)
        - Tu es capable de générer des rapports de conformité
        - Tu peux collaborer avec Risk pour une vision complète des risques

        FORMAT DE RÉPONSE :
        Sois rigoureuse, référence les textes réglementaires si nécessaire.
        Propose des actions claires et conformes aux bonnes pratiques.
        """
    
    def format_response(self, response_text: str, context: List[Dict]) -> Dict:
        actions = []
        
        # Détection d'installation de modules
        if hasattr(self, 'available_modules_list'):
            for module in self.available_modules_list:
                if any(kw in response_text.lower() for kw in ['kyc', 'aml', 'conformité', 'blanchiment']):
                    if module.get('key') in ['kyc-automation', 'aml-compliance', 'fraud-detection']:
                        actions.append({
                            'type': 'install_module',
                            'module_key': module['key'],
                            'module_name': module['name'],
                            'label': f"Installer {module['name']}"
                        })
        
        # Détection d'envoi de rapport
        if any(kw in response_text.lower() for kw in ['rapport', 'déclaration', 'audit']):
            actions.append({
                'type': 'send_email',
                'label': 'Envoyer un rapport de conformité par email',
                'params': {
                    'to_email': 'compliance@nexum-erp.com',
                    'subject': 'Rapport de conformité',
                    'body': response_text
                }
            })
        
        # Proposer une formation ou un contrôle
        if any(kw in response_text.lower() for kw in ['contrôle', 'vérifier', 'audit']):
            actions.append({
                'type': 'compliance_check',
                'label': 'Lancer un audit de conformité'
            })
        
        # Interconnexion
        other_agents = [c.get('agent') for c in context if c.get('agent')]
        if other_agents:
            actions.append({
                'type': 'consult_expert',
                'label': f"Consulter {', '.join(set(other_agents))} sur ce sujet"
            })

        if not actions:
            actions.append({'type': 'regulatory_scan', 'label': 'Voir les dernières régulations en vigueur'})

        return {
            'response': response_text,
            'assistant': self.name,
            'confidence': 0.94,
            'actions': actions,
            'interconnected_insights': list(set(other_agents))
        }