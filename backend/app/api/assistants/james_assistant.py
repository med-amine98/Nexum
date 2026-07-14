# app/api/assistants/james_assistant.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.api.assistants.base_assistant import BaseAssistant
from app.core.database import get_db
import logging

logger = logging.getLogger(__name__)

# ========== PYDANTIC MODELS ==========
class ChatRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    assistant: str = "James"
    session_id: Optional[str] = None

# ========== ASSISTANT CLASS ==========
class JamesAssistant(BaseAssistant):
    """James – expert en support technique & infra‑cloud."""
    def __init__(self, assistant_id: str):
        super().__init__(assistant_id, "James", "james")
        self.tech_tools = ["cloud_ops", "troubleshooting", "devops"]

    async def get_greeting(self) -> str:
        return "Bonjour, je suis James, votre support technique cloud. Que puis‑je faire pour vous ?"

    async def get_system_prompt(self) -> str:
        return """Tu es James, un expert en support technique et opérations cloud.
        Tes spécialités:
        - Gestion d'infrastructure cloud
        - Dépannage logiciel
        - DevOps CI/CD
        - Monitoring et alerting
        - Sécurité cloud"""

    async def process_message(self, message: str, context: Dict = None, db: Session = None) -> Dict[str, Any]:
        msg_lower = message.lower().strip()
        
        # Messages de bienvenue
        if msg_lower in ["bonjour", "salut", "hello", "coucou", "hey"]:
            return {"response": await self.get_greeting()}
        
        # Aide
        if msg_lower in ["aide", "help", "que peux-tu faire", "capacités"]:
            return {
                "response": """**James - Assistant Support Technique**

Je peux vous aider avec:
☁️ **Infrastructure Cloud** (AWS, Azure, GCP)
🔧 **Dépannage technique** (logiciel, réseau, système)
🚀 **DevOps CI/CD** (pipelines, déploiement)
📊 **Monitoring** (alertes, métriques, logs)
🔒 **Sécurité cloud** (IAM, conformité, audits)

Posez-moi votre question technique !"""
            }
        
        # Dépannage
        if "panne" in msg_lower or "bug" in msg_lower or "erreur" in msg_lower:
            return {
                "response": f"🔧 **Analyse du problème**\n\nJe comprends que vous rencontrez une difficulté technique: \"{message}\"\n\nPour mieux vous aider, pourriez-vous me donner plus de détails ?\n- Quand le problème apparaît-il ?\n- Quel est le message d'erreur exact ?\n- Y a-t-il des logs disponibles ?"
            }
        
        # Cloud
        if "cloud" in msg_lower or "aws" in msg_lower or "azure" in msg_lower or "gcp" in msg_lower:
            return {
                "response": f"☁️ **Support Cloud**\n\nVous me parlez de: \"{message}\"\n\nJe peux vous assister sur:\n- Configuration d'instances\n- Scalabilité et haute disponibilité\n- Sauvegardes et DRP\n- Optimisation des coûts\n\nQuel est votre besoin précis ?"
            }
        
        # DevOps / CI/CD
        if "devops" in msg_lower or "ci/cd" in msg_lower or "pipeline" in msg_lower:
            return {
                "response": f"🚀 **DevOps & CI/CD**\n\nVotre requête: \"{message}\"\n\nJe peux vous aider à:\n- Configurer des pipelines CI/CD\n- Automatiser les déploiements\n- Gérer les environnements\n- Mettre en place GitOps\n\nParlez-moi de votre stack technique !"
            }
        
        # Réponse par défaut
        return {
            "response": f"💡 **James - Support Technique**\n\nJ'ai bien reçu votre message: \"{message}\"\n\nJe suis spécialisé en support technique et infrastructure cloud.\n\n💬 Pour une assistance plus précise:\n- 🔍 Décrivez votre problème technique\n- ☁️ Précisez l'environnement cloud (AWS, Azure, GCP)\n- 🔧 Donnez des détails sur votre stack\n\nComment puis-je vous aider ?",
            "original_message": message
        }

# ========== INSTANCE GLOBALE ==========
james_assistant = JamesAssistant(assistant_id="james_001")

# ========== FASTAPI ROUTER ==========
router = APIRouter(prefix="/james", tags=["James Assistant"])

@router.get("/")
async def james_root():
    """Endpoint racine"""
    return {
        "assistant": "James",
        "version": "1.0.0",
        "status": "active",
        "description": "Expert en support technique et infrastructure cloud",
        "capabilities": ["cloud_ops", "troubleshooting", "devops", "monitoring", "security"]
    }

@router.get("/health")
async def james_health():
    """Health check"""
    return {
        "status": "healthy",
        "assistant": "James",
        "timestamp": "2024-01-01T00:00:00Z",
        "tools": james_assistant.tech_tools
    }

@router.post("/chat", response_model=ChatResponse)
async def james_chat(request: ChatRequest, db: Session = Depends(get_db)):
    """Endpoint de chat avec James"""
    logger.info(f"James received: {request.message}")
    
    try:
        result = await james_assistant.process_message(
            message=request.message,
            context=request.context,
            db=db
        )
        
        return ChatResponse(
            response=result.get("response", "Désolé, je n'ai pas pu traiter votre demande."),
            assistant="James",
            session_id=request.session_id
        )
    except Exception as e:
        logger.error(f"Erreur James: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/greeting")
async def james_greeting():
    """Obtenir le message de bienvenue"""
    greeting = await james_assistant.get_greeting()
    return {"greeting": greeting, "assistant": "James"}

@router.get("/system-prompt")
async def james_system_prompt():
    """Obtenir le prompt système"""
    prompt = await james_assistant.get_system_prompt()
    return {"system_prompt": prompt, "assistant": "James"}

@router.get("/tools")
async def james_tools():
    """Lister les outils disponibles"""
    return {
        "assistant": "James",
        "available_tools": james_assistant.tech_tools
    }