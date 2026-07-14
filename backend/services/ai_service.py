# app/services/ai_service.py
# Wrapper delegating to app.services.ai_service
import logging
import sys
from pathlib import Path

logger = logging.getLogger(__name__)

# Ajouter le chemin pour résoudre l'import d'app
BASE_DIR = Path(__file__).parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

try:
    from app.services.ai_service import AIService as ActualAIService
    
    class AIService(ActualAIService):
        """
        Wrapper delegating to the main app/services/ai_service.py implementation.
        """
        def __init__(self):
            super().__init__()
            logger.info("🤖 AIService wrapper initialisé vers app.services.ai_service")
            
    ai_service = AIService()
    
except Exception as e:
    logger.warning(f"⚠️ AIService: impossible de charger l'implémentation complète: {e}. Activation du mock.")
    
    class AIService:
        def __init__(self):
            logger.info("🤖 AIService (Mock/Fallback) initialisé")
            
        async def process_message(self, message: str, user_id: int, **kwargs) -> dict:
            return {
                "response": f"Réponse simulée pour: {message}",
                "confidence": 0.85
            }
            
    ai_service = AIService()
