from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any
import uuid

from ..core.database import get_db
from ..api.assistants.predict_assistant import PredictAssistant
from ..api.assistants.risk_assistant import RiskAssistant
from ..api.assistants.growth_assistant import GrowthAssistant
from ..api.assistants.copilot_assistant import CopilotAssistant
from ..models.assistant_models import Assistant

router = APIRouter(prefix="/api/v1/assistants", tags=["assistants"])

# Factory pour obtenir l'assistant approprié
def get_assistant(assistant_type: str, assistant_id: str):
    assistants = {
        "predict": PredictAssistant,
        "risk": RiskAssistant,
        "growth": GrowthAssistant,
        "copilot": CopilotAssistant
    }
    return assistants.get(assistant_type)(assistant_id)

@router.post("/{assistant_type}/chat")
async def chat_with_assistant(
    assistant_type: str,
    request: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """Chat avec un assistant spécifique"""
    assistant = get_assistant(assistant_type, f"assistant-{assistant_type}")
    
    response = await assistant.process_message(
        message=request.get("message"),
        context=request.get("context"),
        db=db
    )
    
    # Sauvegarder la conversation
    if "user_id" in request:
        await assistant.save_conversation(
            user_id=request["user_id"],
            message=request["message"],
            response=response.get("response", ""),
            db=db
        )
    
    return response

@router.get("/{assistant_type}/history/{user_id}")
async def get_conversation_history(
    assistant_type: str,
    user_id: str,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Récupère l'historique des conversations"""
    assistant = get_assistant(assistant_type, f"assistant-{assistant_type}")
    history = await assistant.get_conversation_history(user_id, limit, db)
    return {"history": history}

@router.post("/copilot/delegate")
async def delegate_task(
    request: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """Délègue une tâche via le Copilot"""
    copilot = CopilotAssistant("assistant-copilot")
    
    task = await copilot._delegate_to_specialist(
        specialist=request.get("to"),
        message=request.get("message"),
        intent=request.get("intent", {}),
        db=db
    )
    
    return task

@router.get("/copilot/tasks")
async def get_pending_tasks(
    db: Session = Depends(get_db)
):
    """Récupère les tâches en attente du Copilot"""
    copilot = CopilotAssistant("assistant-copilot")
    tasks = await copilot.get_pending_tasks(db)
    return {"tasks": tasks}

@router.post("/memory/{assistant_type}/store")
async def store_memory(
    assistant_type: str,
    request: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """Stocke une information en mémoire"""
    assistant = get_assistant(assistant_type, f"assistant-{assistant_type}")
    result = await assistant.store_memory(
        text=request.get("text"),
        metadata=request.get("metadata")
    )
    return {"memory_id": result}

@router.post("/memory/{assistant_type}/retrieve")
async def retrieve_memory(
    assistant_type: str,
    request: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """Récupère des informations de la mémoire"""
    assistant = get_assistant(assistant_type, f"assistant-{assistant_type}")
    memories = await assistant.retrieve_memory(
        query=request.get("query"),
        limit=request.get("limit", 5)
    )
    return {"memories": memories}