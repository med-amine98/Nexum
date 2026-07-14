# app/api/assistants/base_assistant.py
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
import uuid
import logging
from datetime import datetime
from sqlalchemy.orm import Session

from app.core.qdrant_client import qdrant_manager
from app.services.rag_service import rag_service
from app.services.llm_service import llm_service
from app.services.embedding_service import embedding_service
from app.models.assistant_models import Assistant, Conversation, Message, Task

logger = logging.getLogger(__name__)

class BaseAssistant(ABC):
    def __init__(self, assistant_id: str, name: str, assistant_type: str):
        self.assistant_id = assistant_id
        self.name = name
        self.type = assistant_type
        self.context = {}
        self.memory_limit = 10
        
    @abstractmethod
    async def process_message(self, message: str, context: Dict = None, db: Session = None) -> Dict[str, Any]:
        """Traite un message utilisateur"""
        pass
    
    @abstractmethod
    async def get_system_prompt(self) -> str:
        """Retourne le prompt système spécifique à l'assistant"""
        pass
    
    async def retrieve_memory(self, query: str, limit: int = 5) -> List[Dict]:
        """Récupère la mémoire pertinente depuis Qdrant"""
        return await rag_service.retrieve_context(self.assistant_id, query, limit)
    
    async def store_memory(self, text: str, metadata: Dict = None):
        """Stocke une information en mémoire"""
        return await rag_service.store_knowledge(self.assistant_id, text, metadata)
    
    async def delegate_task(self, to_assistant: str, task: Dict, db: Session) -> Dict:
        """Délègue une tâche à un autre assistant"""
        task_record = Task(
            id=uuid.uuid4(),
            from_assistant=uuid.UUID(self.assistant_id),
            to_assistant=uuid.UUID(to_assistant),
            task_type=task.get("type", "delegation"),
            input_data=task,
            priority=task.get("priority", 1)
        )
        db.add(task_record)
        db.commit()
        
        logger.info(f"Tâche {task_record.id} déléguée à {to_assistant}")
        return {"task_id": str(task_record.id), "status": "delegated"}
    
    async def save_conversation(self, user_id: str, message: str, response: str, db: Session):
        """Sauvegarde une conversation en base"""
        conv = db.query(Conversation).filter(
            Conversation.assistant_id == uuid.UUID(self.assistant_id),
            Conversation.user_id == uuid.UUID(user_id),
            Conversation.status == "active"
        ).first()
        
        if not conv:
            conv = Conversation(
                id=uuid.uuid4(),
                assistant_id=uuid.UUID(self.assistant_id),
                user_id=uuid.UUID(user_id)
            )
            db.add(conv)
            db.commit()
        
        user_msg = Message(
            id=uuid.uuid4(),
            conversation_id=conv.id,
            sender_type="user",
            sender_id=uuid.UUID(user_id),
            content=message
        )
        assistant_msg = Message(
            id=uuid.uuid4(),
            conversation_id=conv.id,
            sender_type="assistant",
            sender_id=uuid.UUID(self.assistant_id),
            content=response
        )
        
        db.add(user_msg)
        db.add(assistant_msg)
        db.commit()
        
        return conv.id
    
    async def get_conversation_history(self, user_id: str, limit: int = 10, db: Session = None) -> List[Dict]:
        """Récupère l'historique des conversations"""
        messages = db.query(Message).join(
            Conversation
        ).filter(
            Conversation.user_id == uuid.UUID(user_id),
            Conversation.assistant_id == uuid.UUID(self.assistant_id)
        ).order_by(
            Message.created_at.desc()
        ).limit(limit).all()
        
        return [
            {
                "sender": m.sender_type,
                "content": m.content,
                "time": m.created_at.isoformat()
            }
            for m in reversed(messages)
        ]