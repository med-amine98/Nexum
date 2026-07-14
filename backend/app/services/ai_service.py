"""
Service IA simplifié sans dépendance à OpenAI
"""
import logging
from typing import Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self):
        logger.info("✅ Service IA simplifié initialisé")
    
    async def process_message(
        self,
        message: str,
        user_id: int,
        conversation_id: Optional[int] = None,
        tools: Optional[list] = None,
        context: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Version simplifiée sans OpenAI
        """
        # Réponses basées sur des mots-clés
        msg_lower = message.lower()
        
        if "bonjour" in msg_lower or "salut" in msg_lower:
            response = "Bonjour ! Comment puis-je vous aider aujourd'hui ?"
        elif "facture" in msg_lower:
            response = "Je peux vous aider avec les factures. Voulez-vous :\n• Voir les factures impayées\n• Générer une facture\n• Consulter l'historique ?"
        elif "stock" in msg_lower:
            response = "Le stock est géré dans le module Inventaire. Voulez-vous voir les produits en stock faible ?"
        elif "client" in msg_lower:
            response = "La gestion des clients est disponible dans le module CRM. Puis-je vous aider à rechercher un client spécifique ?"
        elif "aide" in msg_lower or "help" in msg_lower:
            response = "Je peux vous aider avec :\n📊 Les factures\n📦 Le stock\n👥 Les clients\n📈 Les ventes\n\nQue souhaitez-vous faire ?"
        else:
            response = f"J'ai bien reçu votre message. Comment puis-je vous aider plus précisément ?"
        
        return {
            "id": 1,
            "conversation_id": conversation_id or 1,
            "response": response,
            "sources": [],
            "tool_calls": [],
            "tokens_used": 0,
            "processing_time_ms": 100
        }