# backend/app/api/assistants.py
from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Optional, Dict, Any, List
from pydantic import BaseModel
from datetime import datetime
from sqlalchemy.orm import Session
import logging

from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.auth import User
from app.assistants.manager import assistant_manager

# Import optionnel du rag_service
try:
    from app.services.rag_service import rag_service
except Exception:
    rag_service = None

router = APIRouter(prefix="/assistants", tags=["Nexum AI Agents"])
logger = logging.getLogger(__name__)


# ── Schémas Pydantic ──────────────────────────────────────────────────────────

class QueryRequest(BaseModel):
    query: str
    context: Optional[Dict[str, Any]] = None
    agent_name: Optional[str] = "copilot"


class TalkRequest(BaseModel):
    source: str
    target: str
    message: str
    context: Optional[dict] = None


class TeamChatRequest(BaseModel):
    speaker: str
    message: str


class ConsultRequest(BaseModel):
    requester: str
    topic: str


class BroadcastRequest(BaseModel):
    source: str
    message: str


class SaveConversationRequest(BaseModel):
    agent_name: str
    title: Optional[str] = None
    messages: List[Dict[str, Any]]


# ── Helper : résoudre le company_id ──────────────────────────────────────────

def _get_company_id(current_user: User) -> str:
    """Retourne le company_id sous forme de string, ou 'default'."""
    return str(current_user.company_id) if current_user.company_id else "default"


def _get_company_id_int(current_user: User) -> Optional[int]:
    """Retourne le company_id en entier ou None."""
    return current_user.company_id if current_user.company_id else None


# ── Endpoint principal : chat ────────────────────────────────────────────────

@router.post("/chat")
async def assistant_chat(
    request: QueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Discuter avec un agent spécifique (Elena, James, Sophie ou Copilot).
    L'isolation par company_id est garantie côté manager et lors de la sauvegarde.
    """
    try:
        assistant_manager.set_db(db)
        company_id = _get_company_id(current_user)

        result = await assistant_manager.intelligent_chat(
            agent_name=request.agent_name,
            query=request.query,
            user_data=request.context,
            company_id=company_id,
        )

        # Sauvegarder automatiquement le message en DB si les modèles sont disponibles
        try:
            from app.models.assistant_models import Conversation, Message
            company_int = _get_company_id_int(current_user)

            convo = Conversation(
                company_id=company_int,
                user_id=current_user.id,
                title=request.query[:100] if len(request.query) > 100 else request.query,
                context={"agent": request.agent_name},
            )
            db.add(convo)
            db.flush()

            # Message utilisateur
            user_msg = Message(
                conversation_id=convo.id,
                company_id=company_int,
                user_id=current_user.id,
                role="user",
                content=request.query,
                metadata={"agent": request.agent_name},
            )
            db.add(user_msg)

            # Message assistant
            response_text = result.get("response", "") if isinstance(result, dict) else str(result)
            assistant_msg = Message(
                conversation_id=convo.id,
                company_id=company_int,
                user_id=current_user.id,
                role="assistant",
                content=response_text,
                metadata={"agent": request.agent_name, "confidence": result.get("confidence", 0)},
            )
            db.add(assistant_msg)
            db.commit()
        except Exception as save_err:
            logger.warning(f"⚠️ Sauvegarde conversation échouée (non bloquant): {save_err}")
            db.rollback()

        return {
            **result,
            "timestamp": datetime.now().isoformat(),
            "company_id": company_id,
        }
    except Exception as e:
        logger.error(f"Chat Error with {request.agent_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Historique des conversations de l'entreprise ─────────────────────────────

@router.get("/conversations")
async def get_company_conversations(
    agent_name: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retourne l'historique des conversations filtrées par company_id.
    Un utilisateur ne voit QUE les conversations de son entreprise.
    """
    try:
        from app.models.assistant_models import Conversation, Message
        company_int = _get_company_id_int(current_user)

        query = db.query(Conversation).filter(
            Conversation.company_id == company_int
        )

        # Filtre optionnel par agent
        if agent_name:
            query = query.filter(
                Conversation.context["agent"].astext == agent_name
            )

        conversations = (
            query.order_by(Conversation.created_at.desc())
            .limit(limit)
            .all()
        )

        result = []
        for c in conversations:
            msgs = db.query(Message).filter(
                Message.conversation_id == c.id,
                Message.company_id == company_int,
            ).order_by(Message.created_at.asc()).all()

            result.append({
                "id": c.id,
                "title": c.title,
                "agent": c.context.get("agent") if c.context else None,
                "created_at": c.created_at.isoformat() if c.created_at else None,
                "messages_count": len(msgs),
                "messages": [
                    {
                        "role": m.role,
                        "content": m.content,
                        "created_at": m.created_at.isoformat() if m.created_at else None,
                    }
                    for m in msgs
                ],
            })

        return {"success": True, "data": result, "company_id": company_int}

    except ImportError:
        # Fallback si les modèles ne sont pas encore migrés
        if rag_service:
            history = rag_service.get_conversation_history(limit)
            return {"success": True, "data": history}
        return {"success": True, "data": [], "message": "Aucun historique disponible"}
    except Exception as e:
        logger.error(f"Erreur get_conversations: {e}")
        return {"success": False, "error": str(e), "data": []}


# ── Mémoire de l'agent ────────────────────────────────────────────────────────

@router.get("/memory")
async def get_agent_memory(
    agent_name: str = "copilot",
    limit: int = 10,
    current_user: User = Depends(get_current_user),
):
    """Récupère l'historique d'apprentissage de l'agent pour cette entreprise."""
    agent = assistant_manager.get_agent(agent_name)
    company_id = _get_company_id(current_user)
    memories = []
    if hasattr(agent, "get_memory"):
        try:
            memories = agent.get_memory(company_id=company_id, limit=limit)
        except Exception as e:
            logger.warning(f"get_memory failed: {e}")
    return {"agent": agent_name, "memories": memories, "company_id": company_id}


# ── Débat collectif ───────────────────────────────────────────────────────────

@router.post("/debate")
async def assistant_debate(
    query: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lance une réflexion collective entre Elena, James et Sophie, synthétisée par Copilot."""
    try:
        assistant_manager.set_db(db)
        company_id = _get_company_id(current_user)

        if hasattr(assistant_manager, "start_debate"):
            result = await assistant_manager.start_debate(query, company_id=company_id)
        else:
            result = {"response": "Débat non disponible dans cette configuration.", "participants": []}

        return {
            **result,
            "type": "collective_intelligence",
            "timestamp": datetime.now().isoformat(),
            "company_id": company_id,
        }
    except Exception as e:
        logger.error(f"Debate Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Statut de l'équipe ────────────────────────────────────────────────────────

@router.get("/team/status")
async def get_team_status():
    """Statut de toute l'équipe d'assistants."""
    try:
        if rag_service and hasattr(rag_service, "get_team_status"):
            status = rag_service.get_team_status()
            return {"success": True, "data": status}
        return {
            "success": True,
            "data": {
                "team_name": "Nexum AI Assistants",
                "director": "Copilot",
                "members": ["copilot", "sophie", "elena", "james", "risk", "growth", "predict"],
                "total_members": 7,
                "status": "active",
            },
        }
    except Exception as e:
        logger.error(f"Erreur get_team_status: {e}")
        return {"success": False, "error": str(e)}


@router.get("/list")
async def get_all_assistants():
    """Liste de tous les assistants disponibles."""
    try:
        if rag_service and hasattr(rag_service, "assistants"):
            assistants = [rag_service.get_assistant_info(name) for name in rag_service.assistants.keys()]
        else:
            assistants = [
                {"name": "copilot", "role": "directeur", "color": "#8b5cf6", "description": "Coordinateur principal"},
                {"name": "sophie", "role": "experte_risques", "color": "#ef4444", "description": "Analyse des risques"},
                {"name": "elena", "role": "experte_croissance", "color": "#52c41a", "description": "Stratégie croissance"},
                {"name": "james", "role": "expert_data", "color": "#1890ff", "description": "Data science"},
                {"name": "risk", "role": "analyste_risque", "color": "#fa8c16", "description": "Évaluation risques"},
                {"name": "growth", "role": "analyste_croissance", "color": "#13c2c2", "description": "Opportunités"},
                {"name": "predict", "role": "specialiste_predictions", "color": "#722ed1", "description": "Modèles prédictifs"},
            ]
        return {"success": True, "data": assistants}
    except Exception as e:
        return {"success": False, "error": str(e), "data": []}


# ── Communication inter-assistants ────────────────────────────────────────────

@router.post("/talk")
async def assistant_talk(request: TalkRequest):
    """Communication directe entre deux assistants."""
    try:
        if rag_service and hasattr(rag_service, "talk"):
            result = rag_service.talk(
                source=request.source, target=request.target,
                message=request.message, context=request.context,
            )
            return {"success": True, "data": result}
        logger.info(f"💬 {request.source} → {request.target}: {request.message}")
        return {
            "success": True,
            "data": {
                "from": request.source, "to": request.target,
                "message": request.message, "simulated": True,
                "timestamp": datetime.now().isoformat(),
            },
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/team-chat")
async def team_chat(request: TeamChatRequest):
    """Parler à toute l'équipe."""
    try:
        if rag_service and hasattr(rag_service, "team_chat"):
            result = rag_service.team_chat(speaker=request.speaker, message=request.message)
            return {"success": True, "data": result}
        assistants = ["copilot", "sophie", "elena", "james", "risk", "growth", "predict"]
        targets = [a for a in assistants if a != request.speaker]
        return {
            "success": True,
            "data": {
                "speaker": request.speaker, "message": request.message,
                "team_size": len(targets), "simulated": True,
                "timestamp": datetime.now().isoformat(),
            },
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/consult")
async def consult_team(request: ConsultRequest):
    """Consulter toute l'équipe sur un sujet."""
    try:
        if rag_service and hasattr(rag_service, "consult"):
            result = rag_service.consult(requester=request.requester, topic=request.topic)
            return {"success": True, "data": result}
        return {
            "success": True,
            "data": {
                "requester": request.requester, "topic": request.topic,
                "consulted_assistants": ["sophie", "elena", "james", "risk", "growth", "predict"],
                "expert_opinions": [], "simulated": True,
                "timestamp": datetime.now().isoformat(),
            },
        }
    except Exception as e:
        return {"success": False, "error": str(e), "data": {}}


@router.post("/broadcast")
async def broadcast_to_all(request: BroadcastRequest):
    """Diffuser un message à TOUS les assistants."""
    try:
        if rag_service and hasattr(rag_service, "broadcast"):
            result = rag_service.broadcast(source=request.source, message=request.message)
            return {"success": True, "data": result}
        assistants = ["copilot", "sophie", "elena", "james", "risk", "growth", "predict"]
        targets = [a for a in assistants if a != request.source]
        return {
            "success": True,
            "data": {
                "source": request.source, "message": request.message,
                "broadcasted_to": targets, "simulated": True,
                "timestamp": datetime.now().isoformat(),
            },
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/search-all")
async def search_all_assistants(query: str, limit: int = 2):
    """Rechercher dans la connaissance de TOUS les assistants."""
    try:
        if rag_service and hasattr(rag_service, "search_all"):
            results = rag_service.search_all(query, limit)
            return {"success": True, "data": results}
        return {"success": True, "data": {}, "message": "RAG service non disponible"}
    except Exception as e:
        return {"success": False, "error": str(e), "data": {}}


@router.get("/{assistant_name}/info")
async def get_assistant_info(assistant_name: str):
    """Informations détaillées sur un assistant."""
    try:
        if rag_service and hasattr(rag_service, "get_assistant_info"):
            info = rag_service.get_assistant_info(assistant_name)
        else:
            assistants_info = {
                "copilot": {"name": "copilot", "role": "directeur", "color": "#8b5cf6", "description": "Coordinateur principal"},
                "sophie": {"name": "sophie", "role": "experte_risques", "color": "#ef4444", "description": "Experte risques"},
                "elena": {"name": "elena", "role": "experte_croissance", "color": "#52c41a", "description": "Experte croissance"},
                "james": {"name": "james", "role": "expert_data", "color": "#1890ff", "description": "Expert data science"},
                "risk": {"name": "risk", "role": "analyste_risque", "color": "#fa8c16", "description": "Évaluation risques"},
                "growth": {"name": "growth", "role": "analyste_croissance", "color": "#13c2c2", "description": "Opportunités"},
                "predict": {"name": "predict", "role": "specialiste_predictions", "color": "#722ed1", "description": "Modèles prédictifs"},
            }
            info = assistants_info.get(assistant_name, {"error": "Assistant non trouvé"})
        return {"success": True, "data": info}
    except Exception as e:
        return {"success": False, "error": str(e)}