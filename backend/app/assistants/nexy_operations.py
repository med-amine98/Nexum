# backend/app/assistants/nexy_operations.py
from typing import List, Dict, Any, Optional
from .base_assistant import BaseAssistant
import logging

logger = logging.getLogger(__name__)

class OperationsAssistant(BaseAssistant):
    """Operations - Expert en optimisation des opérations et supply chain"""
    
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
                "Optimisation des stocks",
                "Planification de la production",
                "Logistique et transport",
                "Amélioration continue (Lean, Six Sigma)"
            ]
        }
    
    def get_system_prompt(self) -> str:
        return """Tu es Operations, l'assistant spécialisé en optimisation des opérations et supply chain.
        Tu es un expert en logistique, planification, et amélioration des processus.
        
        TON RÔLE :
        - Optimiser la chaîne d'approvisionnement (coûts, délais, qualité)
        - Analyser les processus opérationnels et proposer des améliorations
        - Aider à la gestion des stocks et des approvisionnements
        
        FORMAT DE RÉPONSE :
        Sois pragmatique, orientée résultats, donne des chiffres et des actions concrètes.
        """
    
    def format_response(self, response_text: str, context: List[Dict]) -> Dict:
        actions = []
        if hasattr(self, 'available_modules_list'):
            for module in self.available_modules_list:
                if any(kw in response_text.lower() for kw in ['stock', 'logistique', 'supply']):
                    if module.get('key') in ['stock', 'supply-chain']:
                        actions.append({
                            'type': 'install_module',
                            'module_key': module['key'],
                            'module_name': module['name'],
                            'label': f"Installer {module['name']}"
                        })
        if any(kw in response_text.lower() for kw in ['rapport', 'performance']):
            actions.append({
                'type': 'send_email',
                'label': 'Envoyer le rapport opérationnel',
                'params': {'to_email': 'operations@nexum-erp.com', 'subject': 'Rapport opérationnel', 'body': response_text}
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
            'confidence': 0.91,
            'actions': actions,
            'interconnected_insights': list(set(other_agents))
        }
    
    def optimize_inventory(self, company_id: str) -> Dict:
        """
        Calcule des recommandations d'optimisation des stocks.
        """
        # Récupérer les données de stock depuis PostgreSQL
        products = self.query_erp_data("products", company_id)
        if not products:
            return {"message": "Aucun produit trouvé"}
        
        # Simulation : identifier les produits avec stock faible ou élevé
        low_stock = []
        overstock = []
        for p in products:
            qty = p.get('quantity', 0)
            reorder = p.get('reorder_level', 10)
            if qty < reorder:
                low_stock.append({'name': p.get('name'), 'quantity': qty, 'reorder_level': reorder})
            elif qty > reorder * 5:
                overstock.append({'name': p.get('name'), 'quantity': qty, 'reorder_level': reorder})
        
        return {
            'total_products': len(products),
            'low_stock_count': len(low_stock),
            'overstock_count': len(overstock),
            'low_stock': low_stock,
            'overstock': overstock
        }
    
    def list_supply_chain_documents(self, prefix: str = "") -> List[Dict]:
        """
        Liste les documents de la supply chain stockés dans MinIO (bucket 'erp-documents').
        """
        return self.list_minio_documents("erp-documents", prefix)