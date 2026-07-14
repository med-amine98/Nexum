# backend/app/assistants/nexy_risk.py
from typing import List, Dict, Any
from .base_assistant import BaseAssistant
import logging

logger = logging.getLogger(__name__)

class RiskAssistant(BaseAssistant):
    """James - Expert en gestion des risques, détection de fraude et conformité"""
    
    def __init__(self, config: Dict, db=None):
        super().__init__(
            name="James (Risk)",
            collection_name="nexy_risk_knowledge",
            config=config,
            db=db
        )
    
    def _load_knowledge_base(self) -> Dict:
        return {
            'fraud_patterns': [
                "Transactions > 10 000€ hors pays habituels",
                "Analyse des cycles dans le graphe Neo4j pour détecter le blanchiment"
            ],
            'compliance': ["RGPD", "TRACFIN", "AML/KYC"],
            'banking_risks': ["Risque de crédit", "Défaut de paiement", "Fraude à la carte"],
            'insurance_risks': ["Fraude au sinistre", "Sous-assurance", "Risque climatique"]
        }
    
    def get_system_prompt(self) -> str:
        return """Tu es James (Nexy Risk), l'expert en sécurité et conformité. 
        Tu travailles pour les secteurs BANQUE, ASSURANCE et ENTREPRISE.
        Ton ton est professionnel, rigoureux et sécurisant.
        Utilise des termes comme 'Anomalie', 'Conformité ISO 27001', 'Analyse Graphes'."""

    def format_response(self, response_text: str, context: List[Dict]) -> Dict:
        visualizations = []
        lower_text = response_text.lower()
        
        # SÉCTEUR BANQUE / ASSURANCE : Analyse de Risque (Radar)
        if any(word in lower_text for word in ["risque", "fraude", "audit", "sécurité"]):
            visualizations.append({
                "type": "radar",
                "title": "Analyse Multi-Dimensionnelle des Risques",
                "indicators": [
                    {"name": "Opérationnel", "max": 100},
                    {"name": "Conformité", "max": 100},
                    {"name": "Cyber", "max": 100},
                    {"name": "Fraude", "max": 100},
                    {"name": "Crédit", "max": 100}
                ],
                "values": [65, 82, 45, 91, 30]
            })
            
        # Jauge de sécurité globale
        if "score" in lower_text or "audit" in lower_text:
            visualizations.append({
                "type": "indicator",
                "title": "Score de Conformité Global",
                "value": 88
            })

        actions = [{'type': 'risk_audit', 'label': 'Scanner les vulnérabilités'}]
        
        return {
            'response': response_text,
            'assistant': self.name,
            'confidence': 0.98,
            'visualizations': visualizations,
            'actions': actions,
            'interconnected_insights': [c.get('agent') for c in context if c.get('agent')]
        }
    
    def detect_suspicious_transactions(self, company_id: str) -> List[Dict]:
        """
        Détecte les transactions suspectes (montant > 10000€) via Neo4j.
        """
        cypher = """
        MATCH (c:Client {company_id: $company_id})-[:HAS_TRANSACTION]->(t:Transaction)
        WHERE t.amount > 10000
        RETURN c.name as client, count(t) as nb_transactions, sum(t.amount) as total_amount
        ORDER BY nb_transactions DESC
        """
        return self.query_neo4j(cypher, {"company_id": company_id})
    
    def detect_fraud_rings(self, company_id: str, min_cycle_length: int = 3) -> List[Dict]:
        """
        Détecte les cycles suspects (blanchiment) dans le graphe Neo4j.
        """
        cypher = """
        MATCH path = (c:Client {company_id: $company_id})-[:HAS_TRANSACTION*{min_cycle_length}..5]->(c)
        RETURN nodes(path) as cycle, length(path) as cycle_length
        LIMIT 20
        """
        return self.query_neo4j(cypher, {"company_id": company_id, "min_cycle_length": min_cycle_length})
    
    def list_fraud_documents(self, prefix: str = "") -> List[Dict]:
        """
        Liste les documents de fraude stockés dans MinIO (bucket 'fraud-evidence').
        """
        return self.list_minio_documents("fraud-evidence", prefix)