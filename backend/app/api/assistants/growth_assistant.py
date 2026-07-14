# app/api/assistants/growth_assistant.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.core.database import get_db
from app.api.assistants.base_assistant import BaseAssistant  # ← Import de BaseAssistant
from app.services.llm_service import llm_service

router = APIRouter(prefix="/growth", tags=["growth-assistant"])

class GrowthAssistant(BaseAssistant):  # ← Définition de la classe ici
    """Nexy Growth - Expert en développement commercial"""
    
    def __init__(self, assistant_id: str):
        super().__init__(assistant_id, "Nexy Growth", "growth")
        self.growth_tools = ["sales_optimization", "churn_prediction", "cross_selling"]

    async def get_greeting(self) -> str:
        """Return a friendly greeting for the Growth assistant."""
        return "Bonjour, je suis Nexy Growth, votre expert en développement commercial. Comment puis-je vous assister aujourd'hui ?"

    
    async def get_system_prompt(self) -> str:
        return """Tu es Nexy Growth, un expert en développement commercial.
Tes spécialités:
- Optimisation des ventes et du pipeline commercial
- Prédiction et prévention de l'attrition clients
- Recommandations cross-selling et up-selling
- Analyse de performance commerciale"""

    async def get_response(self, user_message: str) -> str:
        """Generate a simple response based on user message."""
        return f"Voici votre réponse concernant: {user_message}"


    async def process_message(self, message: str, context: Dict = None, db: Session = None) -> Dict[str, Any]:
        memory = await self.retrieve_memory(message)
        system_prompt = await self.get_system_prompt()
        # Simple greeting detection
        if message.lower().strip() in ["bonjour", "salut", "hello"]:
            return {"response": await self.get_greeting()}
        
        if "vente" in message.lower() or "sales" in message.lower():
            return await self._handle_sales_analysis(message)
        elif "attrition" in message.lower() or "churn" in message.lower():
            return await self._handle_churn_prediction(message)
        elif "cross" in message.lower():
            return await self._handle_cross_selling(message)
        else:
            prompt = self._build_prompt(message, memory)
            response = await llm_service.generate_response(prompt, system_prompt)
            return {"response": response["text"]}
    
    async def _handle_sales_analysis(self, message: str) -> Dict:
        return {
            "action": "sales_analysis",
            "metrics": {
                "total_revenue": 128000,
                "growth": "+15%",
                "top_products": ["Produit A", "Produit B"]
            },
            "opportunities": 23,
            "recommendations": ["Lancer campagne", "Contacter leads chauds"]
        }
    
    async def _handle_churn_prediction(self, message: str) -> Dict:
        return {
            "action": "churn_prediction",
            "at_risk_clients": 15,
            "value_at_risk": 345000,
            "risk_factors": ["Baisse commandes", "Réclamations"],
            "recommendations": ["Offre fidélisation", "Contact prioritaire"]
        }
    
    async def _handle_cross_selling(self, message: str) -> Dict:
        return {
            "action": "cross_selling",
            "opportunities": 8,
            "potential_value": 45000,
            "recommendations": [
                {"client": "Client A", "product": "Premium", "value": 5000},
                {"client": "Client B", "product": "Extension", "value": 3000}
            ]
        }
    
    def _build_prompt(self, message: str, memory: list) -> str:
        if memory:
            context = "\n".join([f"- {m['text']}" for m in memory])
            return f"Contexte commercial:\n{context}\n\nQuestion: {message}"
        return message

# Routes API
@router.post("/chat")
async def chat_with_growth(
    request: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """Chat avec Nexy Growth - Expert Commercial"""
    assistant = GrowthAssistant("assistant-growth")
    
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
async def get_growth_history(
    user_id: str,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Récupère l'historique des conversations avec Growth"""
    assistant = GrowthAssistant("assistant-growth")
    history = await assistant.get_conversation_history(user_id, limit, db)
    return {"history": history}