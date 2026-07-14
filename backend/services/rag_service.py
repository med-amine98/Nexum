# app/services/rag_service.py
# Wrapper delegating to app.services.rag_service
import logging
import sys
from pathlib import Path

logger = logging.getLogger(__name__)

# Ajouter le chemin pour résoudre l'import d'app
BASE_DIR = Path(__file__).parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

try:
    from app.services.rag_service import RAGService as ActualRAGService
    
    class RAGService(ActualRAGService):
        """
        Wrapper delegating to the main app/services/rag_service.py implementation.
        """
        def __init__(self):
            super().__init__()
            logger.info("🧠 RAGService wrapper initialisé vers app.services.rag_service")
            
    # Instance globale
    rag_service = RAGService()
    
except Exception as e:
    logger.warning(f"⚠️ RAGService: impossible de charger l'implémentation complète: {e}. Activation du mock.")
    
    class RAGService:
        def __init__(self):
            logger.info("🧠 RAGService (Mock/Fallback) initialisé")
            
        def search(self, query: str, limit: int = 5) -> list:
            return [{"content": f"Résultat simulé pour: {query}", "score": 0.9}]
            
    rag_service = RAGService()
