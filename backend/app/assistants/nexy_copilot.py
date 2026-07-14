# backend/app/assistants/nexy_copilot.py
from typing import List, Dict, Any
from .base_assistant import BaseAssistant

class NexyCopilot(BaseAssistant):
    """Copilot - Assistant universel et superviseur des assistants spécialisés"""
    
    def __init__(self, config: Dict, db=None):
        super().__init__(
            name="Nexy Copilot",
            collection_name="nexy_copilot_knowledge",
            config=config,
            db=db
        )
    
    def _load_knowledge_base(self) -> Dict:
        return {
            'erp_navigation': ["Tableau de bord", "Catalogue des Modèles", "Paramètres", "Ventes", "Achats"],
            'agents': {
                'James': 'Expert Risque et Fraude',
                'Sophie': 'Expert Prévisions et IA',
                'Elena': 'Expert Croissance et Stratégie',
                'Compliance': 'Expert Conformité et AML',
                'Analytics': 'Expert Données et KPIs',
                'Operations': 'Expert Supply Chain et Logistique'
            }
        }
    
    def get_system_prompt(self) -> str:
        available_modules = ""
        if hasattr(self, 'available_modules_list'):
            available_modules = "\nModules disponibles à l'installation :\n" + "\n".join(
                [f"- {m['name']} (clé: {m['key']}): {m['description']}" for m in self.available_modules_list]
            )

        return f"""Tu es Nexy Copilot, l'assistant principal de l'ERP NEXUM.
        Ton rôle est d'aider l'utilisateur à naviguer dans l'ERP et de répondre aux questions générales.
        
        {available_modules}

        CAPACITÉ SPÉCIALE : INSTALLATION DE MODULES
        Si l'utilisateur exprime un besoin métier (ex: "Je veux gérer mes ventes", "Comment détecter la fraude ?"), 
        tu dois lui proposer d'installer le module correspondant.
        
        Si l'utilisateur demande explicitement d'installer un module (ex: "Installe le module Achats"), 
        réponds positivement et confirme que tu lances l'installation.

        DÉLÉGATION :
        Tu peux déléguer des questions complexes à tes collègues experts :
        - James (Risk) pour tout ce qui concerne la fraude, le risque ou la blockchain.
        - Sophie (Predict) pour les prévisions de ventes, la météo ou le churn.
        - Elena (Growth) pour les stratégies marketing et la croissance.
        - Compliance pour les questions de conformité réglementaire, AML, KYC et RGPD.
        - Analytics pour l'analyse de données, les tableaux de bord et les KPIs.
        - Operations pour l'optimisation de la supply chain, la logistique et la gestion des stocks.
        
        CAPACITÉ : ENVOI D'EMAILS
        Tu peux envoyer des emails professionnels (recommandations, rapports, alertes). 
        Si l'utilisateur te demande d'envoyer un email, propose de le faire et prépare l'action.
        Format attendu pour l'action dans la réponse : "J'ai préparé l'email pour [destinataire] concernant [sujet]."
        
        FORMAT DE RÉPONSE :
        Sois toujours poli, efficace et concis. 
        Si tu suggères ou installes un module, mentionne-le clairement."""

    def format_response(self, response_text: str, context: List[Dict]) -> Dict:
        actions = []
        
        if hasattr(self, 'available_modules_list'):
            for module in self.available_modules_list:
                if module['key'] in response_text.lower() or module['name'].lower() in response_text.lower():
                    intent_install = any(word in response_text.lower() for word in ["install", "ajout", "activ", "propose"])
                    if intent_install:
                        actions.append({
                            'type': 'install_module',
                            'module_key': module['key'],
                            'module_name': module['name'],
                            'label': f"Installer {module['name']}"
                        })

        if any(word in response_text.lower() for word in ["email", "envoyer", "courriel"]):
            actions.append({
                'type': 'send_email',
                'label': 'Confirmer l\'envoi de l\'email',
                'params': {
                    'to_email': 'contact@nexum-erp.com',
                    'subject': 'Update Nexy Copilot',
                    'body': response_text
                }
            })
            
        other_agents = [c.get('agent') for c in context if c.get('agent')]
        if other_agents:
            actions.append({
                'type': 'start_debate',
                'label': f"Lancer un débat avec {', '.join(set(other_agents))}"
            })

        if not actions:
            actions.append({'type': 'help_tour', 'label': 'Faire un tour guidé'})

        return {
            'response': response_text,
            'assistant': self.name,
            'confidence': 1.0,
            'actions': actions,
            'interconnected_insights': list(set(other_agents))
        }
    
    def delegate_to_expert(self, expert_name: str, question: str) -> str:
        """
        Délègue une question à un assistant spécialisé.
        Mapping des noms d'experts vers les clés d'assistants.
        """
        agents = {
            'James': 'risk',
            'Sophie': 'predict',
            'Elena': 'growth',
            'Compliance': 'compliance',
            'Analytics': 'analytics',
            'Operations': 'operations'
        }
        agent_key = agents.get(expert_name)
        if agent_key:
            # Ici, vous pouvez ajouter la logique d'appel réel à l'assistant concerné
            return f"Je délègue à {expert_name} (Nexy {agent_key.capitalize()}). Veuillez patienter..."
        return "Expert non trouvé."