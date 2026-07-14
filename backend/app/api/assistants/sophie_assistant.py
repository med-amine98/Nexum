# app/api/assistants/sophie_assistant.py
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.assistants.base_assistant import BaseAssistant
from app.services.llm_service import llm_service

router = APIRouter(prefix="/sophie", tags=["sophie-assistant"])

class SophieAssistant(BaseAssistant):
    """Sophie – expert en ressources humaines et bien‑être des employés."""
    def __init__(self, assistant_id: str):
        super().__init__(assistant_id, "Sophie", "sophie")
        self.hr_tools = ["recruitment", "wellbeing", "policy"]

    async def get_greeting(self) -> str:
        return "Bonjour, je suis Sophie, votre assistante RH. En quoi puis‑je vous aider aujourd'hui ?"

    async def get_system_prompt(self) -> str:
        return """Tu es Sophie, une assistante experte en ressources humaines.
        Tes spécialités:\n- Recrutement\n- Bien‑être des employés\n- Politiques RH"""

    async def process_message(self, message: str, context: Dict = None, db: Session = None) -> Dict[str, Any]:
        # Simple greeting detection
        if message.lower().strip() in ["bonjour", "salut", "hello"]:
            return {"response": await self.get_greeting()}
        # Placeholder response – extend with real logic later
        return {"response": f"Sophie a reçu votre message : {message}"}

# Routes API
@router.post("/chat")
async def chat_with_sophie(request: Dict[str, Any], db: Session = Depends(get_db)):
    """Chat avec Sophie - Assistante RH"""
    assistant = SophieAssistant("assistant-sophie")
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
async def get_sophie_history(user_id: str, limit: int = 10, db: Session = Depends(get_db)):
    """Récupère l'historique des conversations avec Sophie"""
    assistant = SophieAssistant("assistant-sophie")
    history = await assistant.get_conversation_history(user_id, limit, db)
    return {"history": history}
