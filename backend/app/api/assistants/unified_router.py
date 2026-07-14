# app/api/assistants/unified_router.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any

# Import individual assistant routers
from .predict_assistant import router as predict_router
from .risk_assistant import router as risk_router
from .growth_assistant import router as growth_router
from .copilot_assistant import router as copilot_router
from .elena_assistant import router as elena_router
from .james_assistant import router as james_router
from .sophie_assistant import router as sophie_router

# Import assistant classes for dynamic delegation
from .predict_assistant import PredictAssistant
from .risk_assistant import RiskAssistant
from .growth_assistant import GrowthAssistant
from .copilot_assistant import CopilotAssistant
from .elena_assistant import ElenaAssistant
from .james_assistant import JamesAssistant
from .sophie_assistant import SophieAssistant

router = APIRouter(prefix="/assistants", tags=["All Assistants"])

# Include individual routers under the unified prefix
router.include_router(predict_router)
router.include_router(risk_router)
router.include_router(growth_router)
router.include_router(copilot_router)
router.include_router(elena_router)
router.include_router(james_router)
router.include_router(sophie_router)

# Mapping of assistant name to its class for chat delegation
assistant_classes = {
    "predict": PredictAssistant,
    "risk": RiskAssistant,
    "growth": GrowthAssistant,
    "copilot": CopilotAssistant,
    "elena": ElenaAssistant,
    "james": JamesAssistant,
    "sophie": SophieAssistant,
}

@router.get("/list")
async def list_assistants():
    """Return available assistants with brief description"""
    return {
        "assistants": [
            {"name": "predict", "description": "Expert en banque et finance"},
            {"name": "risk", "description": "Expert en assurance et risques"},
            {"name": "growth", "description": "Expert en croissance"},
            {"name": "copilot", "description": "Assistant principal orchestrateur"},
            {"name": "elena", "description": "Assistante support client"},
            {"name": "james", "description": "Support technique & infra-cloud"},
            {"name": "sophie", "description": "Assistante RH"},
        ]
    }

@router.post("/chat")
async def chat_assistant(payload: Dict[str, Any], db: Session = Depends(get_db)):
    """Delegate chat to the specified assistant"""
    assistant_name = payload.get("assistant_name")
    message = payload.get("message", "")
    context = payload.get("context")
    if assistant_name not in assistant_classes:
        raise HTTPException(status_code=400, detail="Assistant not found")
    assistant = assistant_classes[assistant_name](f"assistant-{assistant_name}")
    response = await assistant.process_message(message=message, context=context, db=db)
    return response
