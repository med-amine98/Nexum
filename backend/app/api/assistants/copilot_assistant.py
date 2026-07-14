# app/api/assistants/copilot_assistant.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, List
import uuid

from app.core.database import get_db
from app.api.assistants.base_assistant import BaseAssistant  # ← Import de BaseAssistant
from app.services.llm_service import llm_service
from app.models.assistant_models import Task

router = APIRouter(prefix="/copilot", tags=["copilot-assistant"])

class CopilotAssistant(BaseAssistant):  # ← Définition de la classe ici
    """Copilot - Assistant principal et orchestrateur"""

    def __init__(self, assistant_id: str):
        super().__init__(assistant_id, "Copilot", "copilot")
        self.assistants_map = {
            "predict": "Nexy Predict",
            "risk": "Nexy Risk",
            "growth": "Nexy Growth"
        }

    async def get_greeting(self) -> str:
        """Simple greeting for Copilot"""
        return "Bonjour, je suis Copilot, votre assistant principal. Comment puis‑je vous aider aujourd'hui ?"

    async def get_system_prompt(self) -> str:
        return """Tu es Copilot, l'assistant principal et orchestrateur.
Ton rôle:
- Comprendre les demandes complexes des utilisateurs
- Déléguer les tâches aux assistants spécialisés (Predict, Risk, Growth)
- Synthétiser les informations pour l'utilisateur
- Assurer la coordination entre les différents assistants"""

    async def process_message(self, message: str, context: Dict = None, db: Session = None) -> Dict[str, Any]:
        # Simple greeting detection
        if message.lower().strip() in ["bonjour", "salut", "hello"]:
            return {"response": await self.get_greeting()}
        # Analyser l'intention
        intent = await self._analyze_intent(message)

        if intent["needs_specialist"]:
            # Déléguer à un assistant spécialisé
            result = await self._delegate_to_specialist(intent["specialist"], message, intent, db)
            return result
        else:
            # Traiter directement
            memory = await self.retrieve_memory(message)
            prompt = self._build_prompt(message, memory, intent)
            response = await llm_service.generate_response(
                prompt=prompt,
                system_prompt=await self.get_system_prompt()
            )

            return {
                "response": response["text"],
                "intent": intent,
                "delegated": False
            }

    async def _analyze_intent(self, message: str) -> Dict:
        """Analyse l'intention du message"""
        msg_lower = message.lower()

        if any(word in msg_lower for word in ["crédit", "banque", "finance", "fraude", "transaction"]):
            return {
                "needs_specialist": True,
                "specialist": "predict",
                "domain": "finance",
                "confidence": 0.9
            }
        elif any(word in msg_lower for word in ["sinistre", "assurance", "risque", "catastrophe"]):
            return {
                "needs_specialist": True,
                "specialist": "risk",
                "domain": "insurance",
                "confidence": 0.9
            }
        elif any(word in msg_lower for word in ["vente", "commercial", "client", "croissance"]):
            return {
                "needs_specialist": True,
                "specialist": "growth",
                "domain": "commercial",
                "confidence": 0.9
            }
        else:
            return {
                "needs_specialist": False,
                "domain": "general",
                "confidence": 0.7
            }

    async def _delegate_to_specialist(self, specialist: str, message: str, intent: Dict, db: Session) -> Dict:
        """Délègue une tâche à un assistant spécialisé"""
        task = {
            "type": "delegation",
            "original_message": message,
            "intent": intent,
            "priority": "high"
        }

        task_record = Task(
            id=uuid.uuid4(),
            from_assistant=uuid.UUID(self.assistant_id),
            to_assistant=uuid.UUID(f"assistant-{specialist}"),
            task_type="delegation",
            input_data=task,
            priority=1
        )
        db.add(task_record)
        db.commit()

        return {
            "response": f"J'ai délégué votre demande à {self.assistants_map[specialist]}. Il va vous répondre sous peu.",
            "delegated": True,
            "to": specialist,
            "task_id": str(task_record.id)
        }

    async def get_pending_tasks(self, db: Session) -> List[Dict]:
        """Récupère les tâches en attente"""
        tasks = db.query(Task).filter(
            Task.to_assistant == uuid.UUID(self.assistant_id),
            Task.status == "pending"
        ).all()

        return [
            {
                "id": str(t.id),
                "from": str(t.from_assistant),
                "type": t.task_type,
                "input": t.input_data,
                "created": t.created_at.isoformat()
            }
            for t in tasks
        ]

    def _build_prompt(self, message: str, memory: list, intent: Dict) -> str:
        base = f"Question: {message}\\n"
        if memory:
            base += "\\nContexte pertinent:\\n" + "\\n".join([f"- {m['text']}" for m in memory])
        return base

# Routes API
@router.post("/chat")
async def chat_with_copilot(
    request: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """Chat avec Copilot - Assistant principal"""
    assistant = CopilotAssistant("assistant-copilot")

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

@router.post("/delegate")
async def delegate_task(
    request: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """Délègue une tâche à un assistant spécialisé"""
    copilot = CopilotAssistant("assistant-copilot")

    task = await copilot._delegate_to_specialist(
        specialist=request.get("to"),
        message=request.get("message"),
        intent=request.get("intent", {}),
        db=db
    )

    return task

@router.get("/tasks")
async def get_pending_tasks(
    db: Session = Depends(get_db)
):
    """Récupère les tâches en attente"""
    copilot = CopilotAssistant("assistant-copilot")
    tasks = await copilot.get_pending_tasks(db)
    return {"tasks": tasks}

@router.get("/history/{user_id}")
async def get_copilot_history(user_id: str, limit: int = 10, db: Session = Depends(get_db)):
    """Récupère l'historique des conversations avec Copilot"""
    assistant = CopilotAssistant("assistant-copilot")
    history = await assistant.get_conversation_history(user_id, limit, db)
    return {"history": history}