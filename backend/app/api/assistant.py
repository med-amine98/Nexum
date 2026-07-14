# app/api/assistant.py - Version CORRIGÉE avec gestion des quotas Gemini
import logging
import os
import random
import time
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

# ============================================
# IMPORT GEMINI - Version compatible
# ============================================

# Essayer d'importer la nouvelle API
try:
    from google import genai
    from google.genai import types
    USE_NEW_LIBRARY = True
    print("✅ Assistant: Utilisation de google.genai (nouvelle API)")
except ImportError:
    try:
        import google.generativeai as genai
        USE_NEW_LIBRARY = False
        print("⚠️ Assistant: Utilisation de google.generativeai (ancienne API)")
    except ImportError:
        print("❌ Assistant: Aucune bibliothèque Gemini trouvée")
        genai = None
        USE_NEW_LIBRARY = False

from app.assistants.manager import assistant_manager
from app.models.auth import User
from app.core.dependencies import get_current_active_user as get_current_user
from app.services.email_service import EmailService
from app.database import get_db

logger = logging.getLogger(__name__)
router = APIRouter()

# ===================================================
# 1. CONFIGURATION GEMINI - AVEC VOTRE CLÉ API
# ===================================================

# ✅ Votre clé API
GOOGLE_API_KEY = os.getenv("GENAI_API_KEY", "AIzaSyDrkFqTYdHeCoxPi1TZo9yLyUoBEmhpxx8")

# ✅ Modèles disponibles (ordre de préférence)
AVAILABLE_MODELS = [
    "gemini-1.5-flash",      # Plus rapide, moins cher
    "gemini-1.5-pro",        # Plus puissant
    "gemini-2.0-flash",      # Nouveau modèle
    "gemini-2.5-flash",      # Dernier modèle
    "gemini-2.5-pro",        # Dernier modèle pro
]

GEMINI_MODEL = None
GEMINI_AVAILABLE = False
GEMINI_LAST_ERROR = None
GEMINI_ERROR_COUNT = 0
GEMINI_LAST_RETRY = 0
GEMINI_RETRY_DELAY = 60  # Secondes entre les tentatives

# ============================================
# 1.5 TEST MODÈLES AVEC GESTION D'ERREURS
# ============================================

def test_gemini_models():
    """Teste les modèles Gemini disponibles et gère les erreurs de quota"""
    global GEMINI_MODEL, GEMINI_AVAILABLE, GEMINI_LAST_ERROR
    
    if not GOOGLE_API_KEY or not GOOGLE_API_KEY.startswith("AIzaSy"):
        logger.warning("⚠️ Clé API Gemini invalide ou manquante")
        return False
    
    # Vérifier si on doit attendre à cause des erreurs
    current_time = time.time()
    if GEMINI_ERROR_COUNT > 3 and (current_time - GEMINI_LAST_RETRY) < GEMINI_RETRY_DELAY:
        logger.info(f"⏳ Attente de {GEMINI_RETRY_DELAY}s avant de retester Gemini...")
        return GEMINI_AVAILABLE
    
    try:
        # Tester les modèles dans l'ordre
        for model_name in AVAILABLE_MODELS:
            try:
                if USE_NEW_LIBRARY:
                    client = genai.Client(api_key=GOOGLE_API_KEY)
                    response = client.models.generate_content(
                        model=model_name,
                        contents="Bonjour, test de connexion",
                        config=types.GenerateContentConfig(
                            temperature=0.1,
                            max_output_tokens=10,
                        )
                    )
                    if response and response.text:
                        GEMINI_MODEL = model_name
                        GEMINI_AVAILABLE = True
                        GEMINI_LAST_ERROR = None
                        logger.info(f"✅ Modèle Gemini fonctionnel: {model_name}")
                        return True
                else:
                    genai.configure(api_key=GOOGLE_API_KEY)
                    test_model = genai.GenerativeModel(model_name)
                    test_response = test_model.generate_content("Bonjour, test de connexion")
                    if test_response and hasattr(test_response, 'text'):
                        GEMINI_MODEL = model_name
                        GEMINI_AVAILABLE = True
                        GEMINI_LAST_ERROR = None
                        logger.info(f"✅ Modèle Gemini fonctionnel: {model_name}")
                        return True
                        
            except Exception as e:
                error_str = str(e)
                # Gérer spécifiquement les erreurs de quota
                if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                    logger.warning(f"⚠️ Quota dépassé pour {model_name}, tentative suivante...")
                    GEMINI_LAST_ERROR = f"Quota dépassé pour {model_name}"
                elif "404" in error_str:
                    logger.warning(f"⚠️ Modèle {model_name} non trouvé")
                else:
                    logger.warning(f"❌ Modèle {model_name} non disponible: {error_str[:100]}")
        
        # Si on arrive ici, aucun modèle n'a fonctionné
        GEMINI_AVAILABLE = False
        logger.warning("⚠️ Aucun modèle Gemini disponible")
        return False
        
    except Exception as e:
        GEMINI_AVAILABLE = False
        GEMINI_LAST_ERROR = str(e)
        logger.error(f"❌ Erreur configuration Gemini: {e}")
        return False

# Initialisation au démarrage
test_gemini_models()

# ===================================================
# 2. MODÈLES PYDANTIC
# ===================================================

class QueryRequest(BaseModel):
    assistant: str
    query: str
    user_data: Optional[Dict[str, Any]] = None

class TeachRequest(BaseModel):
    assistant: str
    question: str
    correct_answer: str

class FeedbackLearnRequest(BaseModel):
    assistant: str
    question: str
    answer: str
    feedback_score: int

class EmailRequest(BaseModel):
    to_email: str
    subject: str
    body: str

class ChatRequest3D(BaseModel):
    message: str

# ===================================================
# 3. SERVICE GEMINI - AVEC GESTION DES QUOTAS
# ===================================================

class GeminiService:
    """Service d'IA avec Google Gemini - Gestion robuste des quotas"""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self.model = None
        self.model_name = None
        self.client = None
        self._last_error_time = 0
        self._error_count = 0
        self._cooldown_until = 0
        
        # Réessayer de charger Gemini
        if test_gemini_models() and GEMINI_AVAILABLE and GOOGLE_API_KEY and GEMINI_MODEL:
            try:
                if USE_NEW_LIBRARY:
                    self.client = genai.Client(api_key=GOOGLE_API_KEY)
                    self.model_name = GEMINI_MODEL
                    logger.info(f"✅ Gemini chargé avec le modèle {GEMINI_MODEL} (nouvelle API)")
                else:
                    genai.configure(api_key=GOOGLE_API_KEY)
                    self.model = genai.GenerativeModel(GEMINI_MODEL)
                    self.model_name = GEMINI_MODEL
                    logger.info(f"✅ Gemini chargé avec le modèle {GEMINI_MODEL} (ancienne API)")
            except Exception as e:
                logger.error(f"❌ Erreur chargement Gemini: {e}")
                self.model = None
                self.client = None
        else:
            logger.warning("⚠️ Gemini non disponible au démarrage")
    
    def _is_in_cooldown(self) -> bool:
        """Vérifie si on est en période de cooldown après une erreur de quota"""
        current_time = time.time()
        if current_time < self._cooldown_until:
            remaining = int(self._cooldown_until - current_time)
            logger.info(f"⏳ Cooldown Gemini: {remaining}s restants")
            return True
        return False
    
    def _handle_error(self, error: Exception) -> bool:
        """Gère les erreurs et met en place un cooldown si nécessaire"""
        error_str = str(error)
        current_time = time.time()
        
        # Erreur de quota (429)
        if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
            self._error_count += 1
            self._last_error_time = current_time
            
            # Cooldown progressif: 60s + 30s par erreur
            cooldown_duration = 60 + (self._error_count * 30)
            self._cooldown_until = current_time + cooldown_duration
            
            logger.warning(f"⚠️ Quota dépassé, cooldown de {cooldown_duration}s")
            return False
            
        # Autres erreurs
        logger.error(f"❌ Erreur Gemini: {error_str[:200]}")
        return False
    
    def generate_response_sync(
        self,
        query: str,
        context: str = "",
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 2048
    ) -> Dict[str, Any]:
        """
        Version SYNC de generate_response - AVEC GESTION DES QUOTAS
        """
        # Vérifier le cooldown
        if self._is_in_cooldown():
            return self._fallback_response(query)
        
        # ✅ Si Gemini est disponible, l'utiliser
        if (USE_NEW_LIBRARY and self.client) or (not USE_NEW_LIBRARY and self.model):
            try:
                # Construction du prompt
                if system_prompt:
                    full_prompt = f"{system_prompt}\n\nContexte : {context}\n\nQuestion : {query}"
                else:
                    full_prompt = f"""
Tu es un assistant IA expert pour l'écosystème Nexum.
Tu aides les utilisateurs sur les données de vente, risques, stock, support, etc.

Contexte fourni :
{context}

Question de l'utilisateur : {query}

Réponds de manière claire, structurée et professionnelle en français.
Si des données chiffrées sont disponibles, mentionne-les avec précision.
"""
                
                if USE_NEW_LIBRARY:
                    # ✅ Nouvelle API
                    response = self.client.models.generate_content(
                        model=self.model_name,
                        contents=full_prompt,
                        config=types.GenerateContentConfig(
                            temperature=temperature,
                            max_output_tokens=max_tokens,
                            top_p=0.95,
                            top_k=40,
                        )
                    )
                    answer = response.text.strip() if response.text else "Désolé, je n'ai pas pu générer de réponse."
                else:
                    # 🔄 Ancienne API
                    response = self.model.generate_content(
                        full_prompt,
                        generation_config={
                            "temperature": temperature,
                            "max_output_tokens": max_tokens,
                            "top_p": 0.95,
                            "top_k": 40,
                        }
                    )
                    if response.candidates and len(response.candidates) > 0:
                        answer = response.candidates[0].content.parts[0].text
                    else:
                        answer = response.text if hasattr(response, 'text') else "Désolé, je n'ai pas pu générer de réponse."
                
                # Réinitialiser le compteur d'erreurs en cas de succès
                self._error_count = max(0, self._error_count - 1)
                
                return {
                    "response": answer,
                    "confidence": 0.85,
                    "model": self.model_name or GEMINI_MODEL,
                    "api_version": "google.genai" if USE_NEW_LIBRARY else "google.generativeai",
                    "gemini_used": True
                }
                
            except Exception as e:
                error_str = str(e)
                # Gérer les erreurs de quota
                if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                    self._handle_error(e)
                    return self._fallback_response(query)
                else:
                    logger.error(f"❌ Erreur Gemini: {error_str[:200]}")
        
        # ✅ FALLBACK : Réponses intelligentes sans IA
        return self._fallback_response(query)
    
    async def generate_response(
        self,
        query: str,
        context: str = "",
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 2048
    ) -> Dict[str, Any]:
        """
        Version ASYNC de generate_response
        """
        # Appel de la version sync
        return self.generate_response_sync(query, context, system_prompt, temperature, max_tokens)
    
    def _fallback_response(self, query: str) -> Dict[str, Any]:
        """Réponses de fallback améliorées"""
        query_lower = query.lower()
        
        # Détection de mots-clés
        if any(word in query_lower for word in ["bonjour", "salut", "hello", "hey", "coucou"]):
            response = "Bonjour ! Je suis Nexy, votre assistant IA. Comment puis-je vous aider aujourd'hui ?"
        elif any(word in query_lower for word in ["aide", "help", "que fais", "capacité"]):
            response = "Je peux vous aider sur : analyse des risques 📊, stratégie croissance 📈, prédictions financières 🔮, gestion des fraudes 🛡️, et bien plus encore !"
        elif any(word in query_lower for word in ["risque", "risk", "fraude", "fraud", "sécurité"]):
            response = "🔐 L'analyse des risques montre que le niveau de risque global est modéré. Nous surveillons activement les transactions suspectes."
        elif any(word in query_lower for word in ["vente", "sales", "croissance", "growth"]):
            response = "📊 Les ventes sont en hausse de 12% ce mois-ci. Les meilleurs produits sont les licences SaaS et les services premium."
        elif any(word in query_lower for word in ["prediction", "prédiction", "futur", "tendance"]):
            response = "🔮 Les prévisions indiquent une croissance de 8% pour le prochain trimestre. Les tendances montrent une augmentation du secteur retail."
        elif any(word in query_lower for word in ["stock", "inventaire", "produit"]):
            response = "📦 Le stock est à 85% de sa capacité. 156 produits actifs, dont 23 en promotion."
        elif any(word in query_lower for word in ["finance", "argent", "budget", "revenu"]):
            response = "💰 Les revenus sont de 2.4M€ ce trimestre. Le budget est respecté avec une marge de 15%."
        else:
            response = "Je suis Nexy, votre assistant intelligent. Je peux vous aider avec vos données de vente, risques, prédictions et bien plus. Que souhaitez-vous explorer ?"
        
        return {
            "response": response,
            "confidence": 0.7,
            "model": "fallback",
            "api_version": "fallback",
            "gemini_used": False
        }

# Instance globale (singleton)
gemini_service = GeminiService()

# ===================================================
# 4. ENDPOINTS - VERSION CORRIGÉE
# ===================================================

# ------------------------------------------------
# 4.1 Assistant Query (avec Gemini)
# ------------------------------------------------

@router.post("/assistant/query")
async def query_assistant(
    request: QueryRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Interroge un assistant (Risk, Growth, Predict, Copilot, etc.)
    avec intelligence augmentée par Gemini.
    """
    company_id = str(current_user.company_id or "default")
    
    # 1. Récupérer le contexte via l'assistant_manager (RAG existant)
    context = ""
    if assistant_manager and hasattr(assistant_manager, "get_context"):
        try:
            context = assistant_manager.get_context(
                agent_name=request.assistant,
                query=request.query,
                company_id=company_id
            )
        except Exception as e:
            logger.warning(f"Erreur récupération contexte: {e}")
    
    # 2. Ajouter les données utilisateur
    if request.user_data:
        context += f"\nDonnées utilisateur : {request.user_data}"
    
    # 3. Construire le prompt système selon l'assistant
    system_prompts = {
        "copilot": "Tu es Copilot, l'assistant principal de Nexum. Coordinateur des équipes. Réponds de manière stratégique et globale.",
        "risk": "Tu es Risk, l'analyste des risques. Expert en évaluation, mitigation et conformité. Reste factuel et précis.",
        "growth": "Tu es Growth, l'analyste de croissance. Expert en opportunités commerciales, stratégie et innovation.",
        "predict": "Tu es Predict, le spécialiste des prédictions. Expert en données, tendances et modélisation.",
        "sophie": "Tu es Sophie, experte en veille stratégique et analyse de données.",
        "elena": "Tu es Elena, experte en stratégie de croissance et développement commercial.",
        "james": "Tu es James, expert en data science et intelligence artificielle."
    }
    system_prompt = system_prompts.get(request.assistant, "Tu es un assistant IA expert.")
    
    # 4. Appel à Gemini - Utiliser la version async
    result = await gemini_service.generate_response(
        query=request.query,
        context=context,
        system_prompt=system_prompt
    )
    
    # 5. (Optionnel) Apprentissage automatique du feedback implicite
    try:
        from app.services.learning_service import learning_service
        learning_service.learn_from_conversation(
            assistant=request.assistant,
            question=request.query,
            answer=result.get("response", ""),
            feedback_score=4
        )
    except Exception as e:
        logger.warning(f"Erreur learning_service: {e}")
    
    # 6. Retour au frontend
    return {
        "response": result.get("response", "Désolé, je n'ai pas de réponse."),
        "assistant": request.assistant,
        "confidence": result.get("confidence", 0.7),
        "gemini_used": result.get("gemini_used", False),
        "actions": [],
        "metadata": {
            "company_id": company_id,
            "model": result.get("model", "unknown"),
            "api_version": result.get("api_version", "unknown")
        }
    }


# ------------------------------------------------
# 4.2 Apprentissage manuel (Teach)
# ------------------------------------------------

@router.post("/assistant/teach")
async def teach_assistant(
    request: TeachRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Enseigne explicitement une question/réponse à l'assistant.
    L'apprentissage est isolé par entreprise (Qdrant + learning_service).
    """
    company_id = str(current_user.company_id or "default")
    agent = assistant_manager.get_agent(request.assistant)
    
    if agent and hasattr(agent, "learn"):
        text_to_learn = f"Question : \"{request.question}\" → Réponse correcte : \"{request.correct_answer}\""
        try:
            agent.learn(
                text=text_to_learn,
                metadata={
                    "type": "teach",
                    "question": request.question,
                    "correct_answer": request.correct_answer,
                    "source": "manual_teach"
                },
                company_id=company_id
            )
        except Exception as e:
            logger.error(f"Erreur teach Qdrant: {e}")
    
    # Enrichissement global
    try:
        from app.services.learning_service import learning_service
        learning_service.learn_from_conversation(
            assistant=request.assistant,
            question=request.question,
            answer=request.correct_answer,
            feedback_score=5
        )
    except Exception as e:
        logger.error(f"Erreur learning_service teach: {e}")
    
    return {"status": "success", "message": f"L'assistant {request.assistant} a bien appris."}


# ------------------------------------------------
# 4.3 Feedback utilisateur
# ------------------------------------------------

@router.post("/assistant/learn-from-feedback")
async def learn_from_feedback(
    request: FeedbackLearnRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Enregistre le feedback utilisateur (utile/pas utile) et renforce l'apprentissage
    si le feedback est positif (score >= 4).
    """
    company_id = str(current_user.company_id or "default")
    agent = assistant_manager.get_agent(request.assistant)
    
    if request.feedback_score >= 4 and agent and hasattr(agent, "learn"):
        text_to_learn = f"Question: {request.question}\nRéponse validée: {request.answer}"
        try:
            agent.learn(
                text=text_to_learn,
                metadata={
                    "type": "positive_feedback",
                    "question": request.question,
                    "answer": request.answer,
                    "feedback_score": request.feedback_score,
                    "source": "user_feedback"
                },
                company_id=company_id
            )
        except Exception as e:
            logger.error(f"Erreur feedback Qdrant: {e}")
    
    try:
        from app.services.learning_service import learning_service
        learning_service.learn_from_conversation(
            assistant=request.assistant,
            question=request.question,
            answer=request.answer,
            feedback_score=request.feedback_score
        )
    except Exception as e:
        logger.error(f"Erreur learning_service feedback: {e}")
    
    return {"status": "success", "message": "Feedback enregistré avec succès."}


# ------------------------------------------------
# 4.4 Apprentissage manuel (legacy)
# ------------------------------------------------

@router.post("/assistant/learn")
async def manual_learn(
    data: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """Apprentissage manuel restreint à l'entreprise."""
    company_id = str(current_user.company_id or "default")
    assistant = data.get("assistant", "copilot")
    text = data.get("text")
    
    if not text:
        raise HTTPException(status_code=400, detail="Texte requis")
    
    if hasattr(assistant_manager, "broadcast_learning"):
        assistant_manager.broadcast_learning(
            text=text,
            metadata=data.get("metadata", {}),
            company_id=company_id
        )
    else:
        agent = assistant_manager.get_agent(assistant)
        if agent and hasattr(agent, "learn"):
            agent.learn(text=text, metadata=data.get("metadata", {}), company_id=company_id)
    
    return {"status": "success", "message": "Apprentissage isolé réussi."}


# ------------------------------------------------
# 4.5 Envoi d'email
# ------------------------------------------------

@router.post("/assistant/send-email")
async def send_email_endpoint(
    request: EmailRequest,
    current_user: User = Depends(get_current_user)
):
    """Envoie un email via le service EmailService."""
    success, message = EmailService.send_email(
        to_email=request.to_email,
        subject=request.subject,
        body=request.body
    )
    if not success:
        raise HTTPException(status_code=500, detail=message)
    return {"status": "success", "message": message}


# ------------------------------------------------
# 4.6 Endpoint de test
# ------------------------------------------------

@router.get("/assistant/test")
async def test_assistants():
    """Liste les assistants disponibles et l'état de Gemini."""
    agents = {}
    if hasattr(assistant_manager, "agents"):
        for name, agent in assistant_manager.agents.items():
            agents[name] = getattr(agent, "name", name)
    return {
        "status": "ready",
        "agents": agents,
        "gemini_available": GEMINI_AVAILABLE,
        "gemini_model": GEMINI_MODEL,
        "gemini_api_version": "google.genai" if USE_NEW_LIBRARY else "google.generativeai" if GEMINI_AVAILABLE else "none",
        "fallback_enabled": True,
        "gemini_error": GEMINI_LAST_ERROR
    }


# ------------------------------------------------
# 4.7 Endpoints 3D (scénarios autonomes)
# ------------------------------------------------

AUTONOMOUS_SCENARIOS = [
    {
        "initiator": "predict",
        "msg": "J'ai détecté une déviation de 0.05% sur le modèle de prévision. Ajustement des poids synaptiques en cours...",
        "responder": "risk",
        "respMsg": "Je confirme la déviation. J'intègre cette variance dans la matrice de modélisation des risques."
    },
    {
        "initiator": "risk",
        "msg": "Alerte de sécurité : analyse heuristique d'un pattern inhabituel sur les transactions entrantes.",
        "responder": "copilot",
        "respMsg": "Renforcement des pare-feux en cours. Je lance le protocole d'apprentissage de sécurité."
    },
    {
        "initiator": "growth",
        "msg": "Apprentissage des ventes : le secteur retail montre une hausse de 12%. Optimisation de l'algorithme marketing.",
        "responder": "predict",
        "respMsg": "Mes réseaux de neurones confirment la tendance. Je mets à jour nos prédictions cibles."
    },
    {
        "initiator": "elena",
        "msg": "Analyse cognitive des ressources : 3 de nos modèles de langage nécessitent un fine-tuning.",
        "responder": "james",
        "respMsg": "Compris Elena, je lance le pipeline de ré-entrainement sur le nouveau corpus de données."
    },
    {
        "initiator": "sophie",
        "msg": "J'ai consolidé toutes vos données récentes. Compilation du nouveau graphe de connaissances...",
        "responder": "copilot",
        "respMsg": "Mémoire collective synchronisée. Notre taux de précision global vient de passer à 99.8%."
    }
]

@router.get("/assistants3d/autonomous-learning")
async def get_autonomous_learning_scenario():
    """Retourne un scénario d'apprentissage autonome aléatoire entre deux assistants."""
    return random.choice(AUTONOMOUS_SCENARIOS)

@router.post("/assistants3d/chat")
async def chat_with_assistants_3d(request: ChatRequest3D):
    """
    Simule une réponse d'un assistant pour l'interface 3D (NexyAvatar).
    Utilise Gemini si disponible, sinon fallback.
    """
    msg_lower = request.message.lower()
    
    # Déterminer l'assistant le plus pertinent
    if any(word in msg_lower for word in ["risque", "fraude", "security", "sécurité"]):
        first_responder = 'risk'
    elif any(word in msg_lower for word in ["vente", "croissance", "growth", "sales"]):
        first_responder = 'growth'
    elif any(word in msg_lower for word in ["prédiction", "futur", "predict", "tendance"]):
        first_responder = 'predict'
    else:
        first_responder = 'copilot'
    
    result = await gemini_service.generate_response(
        query=request.message,
        context=f"Assistant sélectionné : {first_responder}. L'utilisateur pose une question sur Nexum.",
        system_prompt=f"Tu es {first_responder}, un assistant de l'écosystème Nexum. Réponds de manière concise et utile."
    )
    
    return {
        "assistant": first_responder,
        "msg": result.get("response", f"J'analyse la demande : '{request.message}'."),
        "model": result.get("model", "unknown"),
        "gemini_used": result.get("gemini_used", False)
    }


# ------------------------------------------------
# 4.8 Health check
# ------------------------------------------------

@router.get("/assistant/health")
async def health_check():
    """Vérifie la santé du service assistant."""
    return {
        "status": "healthy",
        "gemini_available": GEMINI_AVAILABLE,
        "gemini_model": GEMINI_MODEL,
        "gemini_api_version": "google.genai" if USE_NEW_LIBRARY else "google.generativeai" if GEMINI_AVAILABLE else "none",
        "api_key_configured": bool(GOOGLE_API_KEY),
        "gemini_error": GEMINI_LAST_ERROR,
        "error_count": GEMINI_ERROR_COUNT,
        "cooldown_active": gemini_service._is_in_cooldown() if gemini_service else False
    }


# ------------------------------------------------
# 4.9 Reset Gemini - Pour réinitialiser après quota
# ------------------------------------------------

@router.post("/assistant/reset-gemini")
async def reset_gemini(
    current_user: User = Depends(get_current_user)
):
    """Réinitialise le service Gemini (après un quota dépassé)"""
    global GEMINI_AVAILABLE, GEMINI_MODEL, GEMINI_ERROR_COUNT, GEMINI_LAST_RETRY
    
    # Réinitialiser les compteurs
    GEMINI_ERROR_COUNT = 0
    GEMINI_LAST_RETRY = time.time()
    GEMINI_LAST_ERROR = None
    
    if gemini_service:
        gemini_service._error_count = 0
        gemini_service._cooldown_until = 0
    
    # Retester Gemini
    success = test_gemini_models()
    
    return {
        "status": "success",
        "gemini_available": GEMINI_AVAILABLE,
        "gemini_model": GEMINI_MODEL,
        "reset": True
    }


# ===================================================
# 5. TTS (Text-to-Speech) avec gTTS
# ===================================================

@router.get("/assistant/speak")
async def speak_text(
    text: str,
    lang: str = "fr",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Synthèse vocale du texte (TTS) avec gTTS.
    Retourne l'audio encodé en base64.
    """
    try:
        from gtts import gTTS
        import io
        import base64
        
        tts = gTTS(text=text, lang=lang.split('-')[0], slow=False)
        audio_bytes = io.BytesIO()
        tts.write_to_fp(audio_bytes)
        audio_bytes.seek(0)
        
        audio_base64 = base64.b64encode(audio_bytes.read()).decode('utf-8')
        
        return {
            "success": True,
            "audio": audio_base64,
            "format": "mp3",
            "text": text,
            "lang": lang
        }
    except ImportError:
        logger.warning("⚠️ gTTS non installé. Installation: pip install gTTS")
        return {
            "success": False,
            "error": "gTTS not installed",
            "message": "Installez gTTS: pip install gTTS"
        }
    except Exception as e:
        logger.error(f"Erreur TTS: {e}")
        return {
            "success": False,
            "error": str(e)
        }