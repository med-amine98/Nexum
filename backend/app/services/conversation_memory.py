import json
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.conversation import Conversation, Message
from app.schemas.ai_assistant import MessageResponse

logger = logging.getLogger(__name__)

class ConversationMemory:
    
    async def create_conversation(
        self,
        user_id: int,
        metadata: Optional[Dict] = None
    ) -> Conversation:
        """
        Crée une nouvelle conversation
        """
        db = SessionLocal()
        try:
            conversation = Conversation(
                user_id=user_id,
                title=f"Conversation {datetime.now().strftime('%d/%m/%Y %H:%M')}",
                metadata=metadata or {}
            )
            db.add(conversation)
            db.commit()
            db.refresh(conversation)
            
            logger.info(f"✅ Conversation créée: {conversation.id}")
            return conversation
        finally:
            db.close()
    
    async def add_message(
        self,
        conversation_id: int,
        role: str,
        content: str,
        metadata: Optional[Dict] = None
    ) -> Message:
        """
        Ajoute un message à une conversation
        """
        db = SessionLocal()
        try:
            # Compter les tokens approximativement
            tokens = len(content.split()) * 1.3
            
            message = Message(
                conversation_id=conversation_id,
                role=role,
                content=content,
                tokens=int(tokens),
                metadata=metadata or {}
            )
            db.add(message)
            
            # Mettre à jour le timestamp de la conversation
            db.query(Conversation).filter(Conversation.id == conversation_id).update(
                {"updated_at": datetime.utcnow()}
            )
            
            db.commit()
            db.refresh(message)
            
            return message
        finally:
            db.close()
    
    async def get_conversation_history(
        self,
        conversation_id: int,
        limit: int = 50
    ) -> List[Message]:
        """
        Récupère l'historique d'une conversation
        """
        db = SessionLocal()
        try:
            messages = db.query(Message)\
                .filter(Message.conversation_id == conversation_id)\
                .order_by(Message.created_at.asc())\
                .limit(limit)\
                .all()
            return messages
        finally:
            db.close()
    
    async def get_user_conversations(
        self,
        user_id: int,
        limit: int = 10,
        active_only: bool = True
    ) -> List[Conversation]:
        """
        Récupère les conversations d'un utilisateur
        """
        db = SessionLocal()
        try:
            query = db.query(Conversation).filter(Conversation.user_id == user_id)
            
            if active_only:
                query = query.filter(Conversation.is_active == True)
            
            conversations = query.order_by(Conversation.updated_at.desc()).limit(limit).all()
            return conversations
        finally:
            db.close()
    
    async def add_feedback(
        self,
        message_id: int,
        feedback: str  # 'positive' ou 'negative'
    ):
        """
        Ajoute un feedback utilisateur sur une réponse
        """
        db = SessionLocal()
        try:
            db.query(Message).filter(Message.id == message_id).update(
                {"feedback": feedback}
            )
            db.commit()
            logger.info(f"✅ Feedback {feedback} pour message {message_id}")
        finally:
            db.close()
    
    async def summarize_conversation(self, conversation_id: int) -> str:
        """
        Génère un résumé de la conversation (utile pour le contexte long)
        """
        db = SessionLocal()
        try:
            messages = db.query(Message)\
                .filter(Message.conversation_id == conversation_id)\
                .order_by(Message.created_at.asc())\
                .all()
            
            if not messages:
                return ""
            
            # Prendre les premiers messages pour contexte
            intro = messages[0].content if messages[0].role == "user" else ""
            
            # Dernier échange important
            last_exchange = ""
            if len(messages) >= 2:
                last_user = next((m for m in reversed(messages) if m.role == "user"), None)
                last_ai = next((m for m in reversed(messages) if m.role == "assistant"), None)
                if last_user and last_ai:
                    last_exchange = f"Q: {last_user.content[:100]}... R: {last_ai.content[:100]}..."
            
            return f"Intro: {intro[:100]}... Dernier échange: {last_exchange}"
        finally:
            db.close()
    
    async def cleanup_old_conversations(self, days: int = 30):
        """
        Archive les conversations anciennes
        """
        db = SessionLocal()
        try:
            cutoff = datetime.utcnow() - timedelta(days=days)
            old = db.query(Conversation)\
                .filter(Conversation.updated_at < cutoff)\
                .filter(Conversation.is_active == True)\
                .all()
            
            for conv in old:
                conv.is_active = False
                logger.info(f"📦 Conversation {conv.id} archivée")
            
            db.commit()
        finally:
            db.close()