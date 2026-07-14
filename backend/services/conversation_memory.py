# app/services/conversation_memory.py
# Wrapper delegating to app.services.conversation_memory
import logging
import sys
from pathlib import Path

logger = logging.getLogger(__name__)

# Ajouter le chemin pour résoudre l'import d'app
BASE_DIR = Path(__file__).parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

try:
    from app.services.conversation_memory import ConversationMemory as ActualConversationMemory
    
    class ConversationMemory(ActualConversationMemory):
        """
        Wrapper delegating to the main app/services/conversation_memory.py implementation.
        """
        def __init__(self):
            super().__init__()
            logger.info("💾 ConversationMemory wrapper initialisé vers app.services.conversation_memory")
            
    conversation_memory = ConversationMemory()
    
except Exception as e:
    logger.warning(f"⚠️ ConversationMemory: impossible de charger l'implémentation complète: {e}. Activation du mock.")
    
    class ConversationMemory:
        def __init__(self):
            logger.info("💾 ConversationMemory (Mock/Fallback) initialisé")
            
        async def create_conversation(self, user_id: int, metadata: dict = None):
            return {"id": 1, "user_id": user_id, "is_active": True}
            
        async def add_message(self, conversation_id: int, role: str, content: str, metadata: dict = None):
            return {"id": 1, "conversation_id": conversation_id, "role": role, "content": content}
            
    conversation_memory = ConversationMemory()
