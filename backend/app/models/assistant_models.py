# app/models/assistant_models.py
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, Boolean, JSON, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class Assistant(Base):
    __tablename__ = "assistants"
    __table_args__ = (
        Index('idx_assistants_company_id', 'company_id'),
        Index('idx_assistants_type', 'type'),
        {'extend_existing': True}
    )

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    type = Column(String(50), default="general")
    model = Column(String(100), default="gpt-3.5-turbo")
    temperature = Column(Float, default=0.7)
    max_tokens = Column(Integer, default=2000)
    is_active = Column(Boolean, default=True)

    # Isolation multi-tenant : chaque assistant appartient à une entreprise
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relations
    conversations = relationship("Conversation", back_populates="assistant", cascade="all, delete-orphan")
    company = relationship("Company", foreign_keys=[company_id])


class Conversation(Base):
    __tablename__ = "conversations"
    __table_args__ = (
        Index('idx_conversations_company_id', 'company_id'),
        Index('idx_conversations_user_id', 'user_id'),
        Index('idx_conversations_assistant_id', 'assistant_id'),
        {'extend_existing': True}
    )

    id = Column(Integer, primary_key=True, index=True)
    assistant_id = Column(Integer, ForeignKey("assistants.id"), nullable=True)

    # Isolation multi-tenant – OBLIGATOIRE pour filtrer par entreprise
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)

    # Utilisateur propriétaire de la conversation
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    session_id = Column(String(100), nullable=True, index=True)
    title = Column(String(200))
    context = Column(JSON, default=dict)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relations
    assistant = relationship("Assistant", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")
    company = relationship("Company", foreign_keys=[company_id])


class Message(Base):
    __tablename__ = "messages"
    __table_args__ = (
        Index('idx_messages_company_id', 'company_id'),
        Index('idx_messages_conversation_id', 'conversation_id'),
        Index('idx_messages_user_id', 'user_id'),
        {'extend_existing': True}
    )

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=True)

    # Isolation multi-tenant – permet de filtrer les messages par entreprise directement
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)

    # Utilisateur propriétaire du message
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    role = Column(String(20))  # user, assistant, system
    content = Column(Text)
    tokens = Column(Integer, default=0)
    metadata = Column(JSON, default=dict)  # Données supplémentaires (agent_name, model, etc.)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relations
    conversation = relationship("Conversation", back_populates="messages")
    company = relationship("Company", foreign_keys=[company_id])


class Task(Base):
    __tablename__ = "tasks"
    __table_args__ = (
        Index('idx_tasks_company_id', 'company_id'),
        Index('idx_tasks_assistant_id', 'assistant_id'),
        {'extend_existing': True}
    )

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200))
    description = Column(Text)
    status = Column(String(50), default="pending")  # pending, in_progress, completed, failed

    assistant_id = Column(Integer, ForeignKey("assistants.id"), nullable=True)

    # Isolation multi-tenant
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)

    # Utilisateur ayant créé la tâche
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    parameters = Column(JSON, default=dict)
    result = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Relations
    assistant = relationship("Assistant")
    company = relationship("Company", foreign_keys=[company_id])