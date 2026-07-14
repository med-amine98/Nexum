# app/api/assistants/predict_assistant.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.core.database import get_db
from app.api.assistants.base_assistant import BaseAssistant  # ← Import de BaseAssistant, pas PredictAssistant
from app.services.llm_service import llm_service

router = APIRouter(prefix="/predict", tags=["predict-assistant"])

class PredictAssistant(BaseAssistant):  # ← Définition de la classe ici
    """Nexy Predict - Expert en banque et finance"""
    

    async def get_greeting(self) -> str:
        """Return a friendly greeting for the Predict assistant."""
        return "Bonjour, je suis Nexy Predict, votre expert en finance et banque. Comment puis-je vous aider aujourd'hui ?"

    async def get_response(self, user_message: str) -> str:
        """Generate a simple response based on user message for Predict assistant."""
        return f"Voici votre réponse concernant: {user_message}"

    
    async def get_system_prompt(self) -> str:
        return """Tu es Nexy Predict, un expert en banque et finance.
Tes spécialités:
- Scoring crédit et analyse de solvabilité
- Détection de fraudes financières
- Prévisions financières et analyses de trésorerie
- Conformité AML et gestion des risques"""

    async def process_message(self, message: str, context: Dict = None, db: Session = None) -> Dict[str, Any]:
        memory = await self.retrieve_memory(message)
        system_prompt = await self.get_system_prompt()
        # Simple greeting detection
        if message.lower().strip() in ["bonjour", "salut", "hello"]:
            return {"response": await self.get_greeting()}
        
        if "scoring" in message.lower() or "crédit" in message.lower():
            return await self._handle_credit_scoring(message)
        elif "fraude" in message.lower():
            return await self._handle_fraud_detection(message)
        else:
            prompt = self._build_prompt(message, memory)
            response = await llm_service.generate_response(prompt, system_prompt)
            return {"response": response["text"]}
    
    async def _handle_credit_scoring(self, message: str) -> Dict:
        return {
            "action": "credit_scoring",
            "score": 750,
            "recommendation": "Approuvé",
            "details": {
                "probability_default": 0.02,
                "suggested_limit": 50000
            }
        }
    
    async def _handle_fraud_detection(self, message: str) -> Dict:
        return {
            "action": "fraud_detection",
            "risk_level": "low",
            "alerts": [],
            "recommendations": ["Surveillance normale"]
        }
    
    def _build_prompt(self, message: str, memory: list) -> str:
        if memory:
            context = "\n".join([f"- {m['text']}" for m in memory])
            return f"Contexte:\n{context}\n\nQuestion: {message}"
        return message

# Routes API
@router.post("/chat")
async def chat_with_predict(
    request: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """Chat avec Nexy Predict - Expert Banque & Finance"""
    assistant = PredictAssistant("assistant-predict")
    
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
async def get_predict_history(
    user_id: str,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Récupère l'historique des conversations avec Predict"""
    assistant = PredictAssistant("assistant-predict")
    history = await assistant.get_conversation_history(user_id, limit, db)
    return {"history": history}