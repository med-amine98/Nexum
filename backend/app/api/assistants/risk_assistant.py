# app/api/assistants/risk_assistant.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.core.database import get_db
from app.api.assistants.base_assistant import BaseAssistant  # ← Import de BaseAssistant, pas RiskAssistant
from app.services.llm_service import llm_service

router = APIRouter(prefix="/risk", tags=["risk-assistant"])

class RiskAssistant(BaseAssistant):  # ← Définition de la classe ici
    """Nexy Risk - Expert en assurance et gestion des risques"""
    
    def __init__(self, assistant_id: str):
        super().__init__(assistant_id, "Nexy Risk", "risk")
        self.risk_tools = ["claims_processing", "risk_scoring", "catastrophe_modeling"]

    async def get_greeting(self) -> str:
        """Return a friendly greeting for the Risk assistant."""
        return "Bonjour, je suis Nexy Risk, votre expert en assurance et gestion des risques. Comment puis-je vous aider aujourd'hui ?"
    
    async def get_system_prompt(self) -> str:
        return """Tu es Nexy Risk, un expert en assurance et gestion des risques.
Tes spécialités:
- Traitement et évaluation des sinistres
- Scoring des risques clients
- Modélisation des catastrophes naturelles
- Détection de fraudes à l'assurance"""

    async def process_message(self, message: str, context: Dict = None, db: Session = None) -> Dict[str, Any]:
        memory = await self.retrieve_memory(message)
        system_prompt = await self.get_system_prompt()

        # Simple greeting detection
        if message.lower().strip() in ["bonjour", "salut", "hello"]:
            return {"response": await self.get_greeting()}

        if "sinistre" in message.lower():
            return await self._handle_claim(message)
        elif "risque" in message.lower():
            return await self._handle_risk_scoring(message)
        elif "catastrophe" in message.lower():
            return await self._handle_catastrophe(message)
        else:
            prompt = self._build_prompt(message, memory)
            response = await llm_service.generate_response(prompt, system_prompt)
            return {"response": response["text"]}
    
    async def _handle_claim(self, message: str) -> Dict:
        return {
            "action": "claim_processing",
            "claim_id": "CLM-2024-001",
            "estimated_amount": 12500,
            "fraud_probability": 0.02,
            "recommendations": ["Approuver", "Programmer expertise"]
        }
    
    async def _handle_risk_scoring(self, message: str) -> Dict:
        return {
            "action": "risk_scoring",
            "score": 67,
            "level": "medium",
            "factors": {
                "stability": "good",
                "claims": "low",
                "location": "medium"
            }
        }
    
    async def _handle_catastrophe(self, message: str) -> Dict:
        return {
            "action": "catastrophe_modeling",
            "risk_areas": ["Zone A", "Zone B"],
            "probability": 0.23,
            "recommendations": ["Ajuster primes +8%", "Proposer prévention"]
        }
    
    def _build_prompt(self, message: str, memory: list) -> str:
        if memory:
            context = "\n".join([f"- {m['text']}" for m in memory])
            return f"Contexte:\n{context}\n\nQuestion: {message}"
        return message

# Routes API
@router.post("/chat")
async def chat_with_risk(
    request: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """Chat avec Nexy Risk - Expert Assurance & Risques"""
    assistant = RiskAssistant("assistant-risk")
    
    response = await assistant.process_message(
        message=request.get("message", ""),
        context=request.get("context"),
        db=db
    )
    
    if "user_id" in request:
        await assistant.save_conversation(
            user_id=request["user_id"],
            message=request["message"],
            response=response.get("response", ""),
            db=db
        )
    
    return response

@router.get("/history/{user_id}")
async def get_risk_history(
    user_id: str,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Récupère l'historique des conversations avec Risk"""
    assistant = RiskAssistant("assistant-risk")
    history = await assistant.get_conversation_history(user_id, limit, db)
    return {"history": history}