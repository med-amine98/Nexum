# backend/app/assistants/manager.py

from typing import Dict, Any, Optional
import os
import logging
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# Tentative d'import des assistants avec gestion d'erreur
try:
    from .nexy_risk import NexyRiskAssistant
except ImportError as e:
    logger.warning(f"Could not import NexyRiskAssistant: {e}")
    NexyRiskAssistant = None

try:
    from .nexy_predict import NexyPredictAssistant
except ImportError as e:
    logger.warning(f"Could not import NexyPredictAssistant: {e}")
    NexyPredictAssistant = None

try:
    from .nexy_growth import NexyGrowthAssistant
except ImportError as e:
    logger.warning(f"Could not import NexyGrowthAssistant: {e}")
    NexyGrowthAssistant = None

try:
    from .nexy_copilot import NexyCopilot
except ImportError as e:
    logger.warning(f"Could not import NexyCopilot: {e}")
    NexyCopilot = None


class GlobalAssistantManager:
    """Gestionnaire centralisé pour Elena, Sophie, James et Copilot"""

    def __init__(self, db_session: Optional[Session] = None):
        self.db = db_session
        self.agents = {}
        self.james = None
        self.sophie = None
        self.elena = None
        self.copilot = None

        config = {
            "QDRANT_HOST": os.environ.get("QDRANT_HOST", "qdrant"),
            "QDRANT_PORT": int(os.environ.get("QDRANT_PORT", 6333)),
            "NEO4J_URI": os.environ.get("NEO4J_URI", "bolt://neo4j:7687"),
            "NEO4J_USER": os.environ.get("NEO4J_USER", "neo4j"),
            "NEO4J_PASSWORD": os.environ.get("NEO4J_PASSWORD", "neo4j123"),
            "OPENAI_API_KEY": os.environ.get("OPENAI_API_KEY", ""),
            "EMBEDDING_MODEL": os.environ.get(
                "EMBEDDING_MODEL",
                "sentence-transformers/all-MiniLM-L6-v2"
            ),
        }

        # Initialisation des assistants avec gestion d'erreur
        self._init_assistants(config)
        
        # Initialisation Qdrant (optionnelle)
        self._init_shared_intelligence(config)

    def _init_assistants(self, config: Dict):
        """Initialise les assistants avec gestion d'erreur"""
        
        # Vérifier si sentence-transformers est disponible
        try:
            import sentence_transformers
            logger.info(f"✅ sentence-transformers version: {sentence_transformers.__version__}")
        except ImportError as e:
            logger.error(f"❌ sentence-transformers not installed: {e}")
            logger.warning("Assistants will run in limited mode without embeddings")
            return

        # Vérifier si l'embedding model peut être chargé
        try:
            from sentence_transformers import SentenceTransformer
            test_model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
            logger.info("✅ Embedding model loaded successfully")
        except Exception as e:
            logger.error(f"❌ Failed to load embedding model: {e}")
            logger.warning("Assistants will run in limited mode")

        # Initialisation de chaque assistant
        if NexyRiskAssistant is not None:
            try:
                self.james = NexyRiskAssistant(config, self.db)
                self.agents["james"] = self.james
                logger.info("✅ James (NexyRiskAssistant) initialized")
            except Exception as e:
                logger.error(f"❌ Failed to initialize James: {e}")
                self._create_mock_assistant("james")
        
        if NexyPredictAssistant is not None:
            try:
                self.sophie = NexyPredictAssistant(config, self.db)
                self.agents["sophie"] = self.sophie
                logger.info("✅ Sophie (NexyPredictAssistant) initialized")
            except Exception as e:
                logger.error(f"❌ Failed to initialize Sophie: {e}")
                self._create_mock_assistant("sophie")
        
        if NexyGrowthAssistant is not None:
            try:
                self.elena = NexyGrowthAssistant(config, self.db)
                self.agents["elena"] = self.elena
                logger.info("✅ Elena (NexyGrowthAssistant) initialized")
            except Exception as e:
                logger.error(f"❌ Failed to initialize Elena: {e}")
                self._create_mock_assistant("elena")
        
        if NexyCopilot is not None:
            try:
                self.copilot = NexyCopilot(config, self.db)
                self.agents["copilot"] = self.copilot
                logger.info("✅ Copilot (NexyCopilot) initialized")
            except Exception as e:
                logger.error(f"❌ Failed to initialize Copilot: {e}")
                self._create_mock_assistant("copilot")
    
    def _create_mock_assistant(self, name: str):
        """Crée un assistant mock pour éviter les erreurs"""
        class MockAssistant:
            def __init__(self):
                self.db = None
                self.available_modules_list = []
            
            def retrieve_context(self, query, company_id=None):
                return []
            
            def generate_response(self, query, context, user_data=None):
                return {
                    "response": f"L'assistant {name} est temporairement indisponible. Services techniques en cours d'intervention.",
                    "confidence": 0.0,
                    "sources": []
                }
            
            def save_memory(self, company_id, query, response, metadata=None):
                pass
            
            async def process_query(self, query, user_data=None):
                return self.generate_response(query, [])
        
        mock = MockAssistant()
        self.agents[name] = mock
        setattr(self, name, mock)
        logger.warning(f"⚠️ Mock assistant created for {name}")

    # -------------------------
    # QDRANT SHARED MEMORY
    # -------------------------
    def _init_shared_intelligence(self, config: Dict):
        """Initialise la mémoire partagée Qdrant (optionnelle)"""
        try:
            import qdrant_client
            from qdrant_client.models import VectorParams, Distance

            client = qdrant_client.QdrantClient(
                host=config["QDRANT_HOST"],
                port=config["QDRANT_PORT"],
                timeout=10,  # Ajout d'un timeout
            )

            # Vérifier si la collection existe
            try:
                collections = client.get_collections().collections
                collection_names = [c.name for c in collections]
                
                if "nexy_shared_intelligence" not in collection_names:
                    client.create_collection(
                        collection_name="nexy_shared_intelligence",
                        vectors_config=VectorParams(
                            size=384,
                            distance=Distance.COSINE
                        ),
                    )
                    logger.info("✅ Created Qdrant collection: nexy_shared_intelligence")
                else:
                    logger.info("✅ Qdrant collection already exists")
            except Exception as e:
                logger.warning(f"Could not create Qdrant collection: {e}")

        except ImportError as e:
            logger.warning(f"Qdrant client not available: {e}")
        except Exception as e:
            logger.warning(f"Qdrant init skipped: {e}")

    # -------------------------
    # AGENTS
    # -------------------------
    def get_agent(self, name: str):
        """Récupère un agent par son nom"""
        agent_key = name.lower()
        if agent_key in self.agents:
            return self.agents[agent_key]
        return self.agents.get("copilot", None)

    def set_db(self, db_session):
        """Configure la session DB pour tous les agents"""
        self.db = db_session
        for agent in self.agents.values():
            if hasattr(agent, 'db'):
                agent.db = db_session
        return self

    def broadcast_learning(self, text: str, metadata: Optional[Dict] = None, company_id: str = "default"):
        """Diffuse une information/connaissance apprise à tous les agents avec isolation par entreprise"""
        logger.info(f"📢 Diffusion de l'apprentissage à tous les agents : {text[:60]}... (company_id: {company_id})")
        for name, agent in self.agents.items():
            if hasattr(agent, "learn"):
                try:
                    agent.learn(text, metadata, company_id)
                except Exception as e:
                    logger.error(f"Erreur lors de la diffusion de l'apprentissage à l'agent {name}: {e}")


    # -------------------------
    # INTELLIGENCE CORE
    # -------------------------
    async def intelligent_chat(
        self,
        agent_name: str,
        query: str,
        user_data: Dict = None,
        company_id: str = "default",
    ):
        """Chat intelligent avec un agent"""
        agent = self.get_agent(agent_name)
        
        if agent is None:
            return {
                "response": "Assistant non disponible. Veuillez réessayer plus tard.",
                "error": True,
                "confidence": 0.0
            }

        # Modules (optionnel)
        if self.db and hasattr(agent, 'available_modules_list'):
            try:
                from app.services.module_service import ModuleService
                service = ModuleService(self.db)
                modules = service.get_all_modules()
                agent.available_modules_list = [
                    {
                        "key": m.key,
                        "name": m.name,
                        "description": m.description,
                    }
                    for m in modules
                ]
            except Exception as e:
                logger.warning(f"Module loading failed: {e}")

        # Context retrieval (avec gestion d'erreur)
        context = []
        if hasattr(agent, 'retrieve_context'):
            try:
                context = agent.retrieve_context(query, company_id=company_id)
            except Exception as e:
                logger.warning(f"Context retrieval failed: {e}")

        # Shared memory search (optionnel)
        shared_context = []
        if hasattr(agent, 'qdrant_client'):
            try:
                embedding_model = getattr(agent, 'embedding_model', None)
                if embedding_model:
                    query_embedding = embedding_model.encode(query).tolist()
                    
                    from qdrant_client.models import Filter, FieldCondition, MatchValue
                    
                    search_filter = Filter(
                        must=[
                            FieldCondition(
                                key="company_id",
                                match=MatchValue(value=str(company_id)),
                            )
                        ]
                    )
                    
                    results = agent.qdrant_client.search(
                        collection_name="nexy_shared_intelligence",
                        query_vector=query_embedding,
                        query_filter=search_filter,
                        limit=3,
                    )
                    
                    shared_context = [
                        {
                            "content": r.payload.get("content", ""),
                            "agent": r.payload.get("agent_name"),
                        }
                        for r in results
                    ]
            except Exception as e:
                logger.warning(f"Shared context search failed: {e}")

        full_context = context + shared_context

        # Generation de réponse
        if hasattr(agent, 'generate_response'):
            try:
                result = agent.generate_response(query, full_context, user_data or {})
            except Exception as e:
                logger.error(f"Response generation failed: {e}")
                result = {
                    "response": "Désolé, je rencontre une difficulté technique. Veuillez réessayer.",
                    "confidence": 0.0,
                    "error": True
                }
        else:
            result = {
                "response": "Assistant non configuré correctement.",
                "confidence": 0.0,
                "error": True
            }

        # Memory save (optionnel)
        if hasattr(agent, 'save_memory'):
            try:
                response_text = (
                    result.get("response", "")
                    if isinstance(result, dict)
                    else str(result)
                )
                agent.save_memory(
                    company_id,
                    query,
                    response_text,
                    {"type": "conversation"},
                )
            except Exception as e:
                logger.warning(f"Memory save failed: {e}")

        return result


# Global instance with lazy initialization
assistant_manager = None

def get_assistant_manager():
    """Retourne l'instance du gestionnaire d'assistants (lazy loading)"""
    global assistant_manager
    if assistant_manager is None:
        try:
            assistant_manager = GlobalAssistantManager()
        except Exception as e:
            logger.error(f"Failed to initialize assistant manager: {e}")
            # Créer un gestionnaire vide pour éviter les crashes
            assistant_manager = GlobalAssistantManager.__new__(GlobalAssistantManager)
            assistant_manager.agents = {}
            assistant_manager.james = None
            assistant_manager.sophie = None
            assistant_manager.elena = None
            assistant_manager.copilot = None
            assistant_manager.db = None
    return assistant_manager

# Pour la compatibilité avec l'ancien code
assistant_manager = get_assistant_manager()