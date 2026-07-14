# backend/app/assistants/nexy_compliance.py
from typing import List, Dict, Any
from .base_assistant import BaseAssistant
import logging

logger = logging.getLogger(__name__)

class ComplianceAssistant(BaseAssistant):
    """Compliance - Expert en conformité réglementaire et lutte anti-blanchiment"""
    
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
        
        FORMAT DE RÉPONSE :
        Sois rigoureuse, référence les textes réglementaires si nécessaire.
        Propose des actions claires et conformes aux bonnes pratiques.
        """
    
    def format_response(self, response_text: str, context: List[Dict]) -> Dict:
        actions = []
        if hasattr(self, 'available_modules_list'):
            for module in self.available_modules_list:
                if any(kw in response_text.lower() for kw in ['kyc', 'aml', 'conformité']):
                    if module.get('key') in ['kyc-automation', 'aml-compliance']:
                        actions.append({
                            'type': 'install_module',
                            'module_key': module['key'],
                            'module_name': module['name'],
                            'label': f"Installer {module['name']}"
                        })
        if any(kw in response_text.lower() for kw in ['rapport', 'déclaration']):
            actions.append({
                'type': 'send_email',
                'label': 'Envoyer un rapport de conformité',
                'params': {'to_email': 'compliance@nexum-erp.com', 'subject': 'Rapport de conformité', 'body': response_text}
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
            'confidence': 0.94,
            'actions': actions,
            'interconnected_insights': list(set(other_agents))
        }
    
    def check_aml_compliance(self, company_id: str, transaction_data: List[Dict]) -> Dict:
        """
        Vérifie la conformité AML des transactions.
        """
        suspicious = []
        for tx in transaction_data:
            if tx.get('amount', 0) > 10000:
                suspicious.append({
                    'transaction_id': tx.get('id'),
                    'amount': tx.get('amount'),
                    'reason': 'Montant élevé (> 10 000€)'
                })
        return {
            'total_transactions': len(transaction_data),
            'suspicious_count': len(suspicious),
            'suspicious_transactions': suspicious
        }
    
    def list_compliance_documents(self, prefix: str = "") -> List[Dict]:
        """
        Liste les documents de conformité stockés dans MinIO (bucket 'erp-documents').
        """
        return self.list_minio_documents("erp-documents", prefix)