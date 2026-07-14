# backend/app/api/assistant_routes.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime
from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer

from app.core.dependencies import get_current_active_user as get_current_user
from app.models.auth import User

# ============================================
# CONFIGURATION QDRANT
# ============================================
QDRANT_HOST = "neura-qdrant"
QDRANT_PORT = 6333
MODEL_NAME = "all-MiniLM-L6-v2"

qdrant_client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)
embedding_model = SentenceTransformer(MODEL_NAME)

router = APIRouter(prefix="/assistants", tags=["assistants"])

class ChatRequest(BaseModel):
    agent_name: str
    query: str
    user_id: Optional[int] = None
    context: Optional[dict] = None

class TeachRequest(BaseModel):
    assistant: str
    question: str
    correct_answer: str

class FeedbackRequest(BaseModel):
    assistant: str
    question: str
    answer: str
    feedback_score: int

# ============================================
# IMPORT DES ASSISTANTS (avec fallback)
# ============================================
class DummyAssistant:
    def __init__(self, config, db=None):
        self.name = "Dummy"
    def retrieve_context(self, query, company_id, limit):
        return []
    def generate_response(self, query, context, user_data):
        return {"response": f"Bonjour, je suis un assistant factice. Vous avez demandé : {query}"}
    def save_memory(self, company_id, query, response, context):
        pass

try:
    from app.assistants.nexy_risk import RiskAssistant
except ImportError:
    RiskAssistant = None
    print("⚠️ RiskAssistant non disponible")

try:
    from app.assistants.nexy_growth import GrowthAssistant
except ImportError:
    GrowthAssistant = None
    print("⚠️ GrowthAssistant non disponible")

try:
    from app.assistants.nexy_predict import PredictAssistant
except ImportError:
    PredictAssistant = None
    print("⚠️ PredictAssistant non disponible")

try:
    from app.assistants.nexy_copilot import NexyCopilot
except ImportError:
    NexyCopilot = None
    print("⚠️ NexyCopilot non disponible")

# ============================================
# FONCTION get_assistant_instance
# ============================================
def get_assistant_instance(agent_name: str):
    assistants_map = {
        "risk": RiskAssistant,
        "growth": GrowthAssistant,
        "predict": PredictAssistant,
        "copilot": NexyCopilot,
    }
    cls = assistants_map.get(agent_name.lower())
    if cls is None:
        # Fallback sur DummyAssistant pour éviter 404
        print(f"⚠️ Assistant '{agent_name}' non trouvé, utilisation de DummyAssistant")
        return DummyAssistant(config={})
        # Ou si vous préférez lever une erreur :
        # raise HTTPException(404, f"Assistant '{agent_name}' non disponible")
    config = {'QDRANT_HOST': QDRANT_HOST, 'QDRANT_PORT': QDRANT_PORT, 'EMBEDDING_MODEL': MODEL_NAME}
    return cls(config=config, db=None)

# ============================================
# ROUTES
# ============================================

@router.get("/test")
async def test_assistant_route():
    return {"status": "ok", "message": "Assistant router is working"}

@router.post("/chat")
async def chat(request: ChatRequest, current_user: User = Depends(get_current_user)):
    assistant = get_assistant_instance(request.agent_name)
    company_id = str(current_user.company_id) if current_user.company_id else "default"
    sector = getattr(current_user.company, "sector", "entreprise") if hasattr(current_user, "company") and current_user.company else "entreprise"
    
    # Enrichir la requête avec le secteur d'activité
    enriched_query = f"[Contexte: L'utilisateur appartient au secteur d'activité '{sector}'] {request.query}"
    
    context = assistant.retrieve_context(enriched_query, company_id=company_id, limit=5)
    result = assistant.generate_response(enriched_query, context, {"user_id": current_user.id, "company_id": company_id, "sector": sector})
    assistant.save_memory(company_id, request.query, result.get("response", ""), {"agent": request.agent_name})
    return result

@router.post("/teach")
async def teach_assistant(data: TeachRequest, current_user = Depends(get_current_user)):
    return {"success": True, "message": "Connaissance ajoutée (simulation)"}

@router.post("/learn-from-feedback")
async def learn_from_feedback(data: FeedbackRequest, current_user = Depends(get_current_user)):
    return {"success": True, "message": "Feedback enregistré (simulation)"}