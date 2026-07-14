# app/api/assistants/elena_assistant.py
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.assistants.base_assistant import BaseAssistant

router = APIRouter(prefix="/elena", tags=["elena-assistant"])

class ElenaAssistant(BaseAssistant):
    """Elena – assistante polyvalente pour le support client."""
    def __init__(self, assistant_id: str):
        super().__init__(assistant_id, "Elena", "elena")
        self.support_tools = ["faq", "ticketing", "live_chat"]

    async def get_greeting(self) -> str:
        return "Bonjour, je suis Elena, votre assistante support. Comment puis‑je vous aider aujourd'hui ?"

    async def get_system_prompt(self) -> str:
        return """Tu es Elena, une assistante experte en support client.
        Tes spécialités:\n- FAQ handling\n- Ticket management\n- Live chat assistance"""

    async def process_message(self, message: str, context: Dict = None, db: Session = None) -> Dict[str, Any]:
        if message.lower().strip() in ["bonjour", "salut", "hello"]:
            return {"response": await self.get_greeting()}
        return {"response": f"Elena a reçu votre message : {message}"}

@router.post("/chat")
async def chat_with_elena(request: Dict[str, Any], db: Session = Depends(get_db)):
    assistant = ElenaAssistant("assistant-elena")
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
async def get_elena_history(user_id: str, limit: int = 10, db: Session = Depends(get_db)):
    assistant = ElenaAssistant("assistant-elena")
    history = await assistant.get_conversation_history(user_id, limit, db)
    return {"history": history}
