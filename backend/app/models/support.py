# app/models/support.py
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON, Boolean, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base

class TicketPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class TicketStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"

class TicketCategory(str, enum.Enum):
    TECHNICAL = "technical"
    BILLING = "billing"
    ACCOUNT = "account"
    GENERAL = "general"

class TicketSector(str, enum.Enum):
    BANQUE = "banque"
    ASSURANCE = "assurance"
    ENTREPRISE = "entreprise"

class SupportTicket(Base):
    __tablename__ = "support_tickets"
    
    id = Column(Integer, primary_key=True, index=True)
    ticket_number = Column(String(50), unique=True, index=True, nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    subject = Column(String(500), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(SQLEnum(TicketCategory), default=TicketCategory.GENERAL)
    priority = Column(SQLEnum(TicketPriority), default=TicketPriority.MEDIUM)
    status = Column(SQLEnum(TicketStatus), default=TicketStatus.OPEN)
    sector = Column(SQLEnum(TicketSector), default=TicketSector.ENTREPRISE)
    
    # IA Stratégique Support
    ai_sentiment_score = Column(Float, default=0.0) # -1.0 (très mécontent) à 1.0 (très satisfait)
    ai_priority_suggestion = Column(String(20), nullable=True) # Priorité suggérée par IA
    ai_suggested_category = Column(String(20), nullable=True) # Catégorie suggérée par IA
    ai_response_draft = Column(Text, nullable=True) # Brouillon de réponse auto-généré
    ai_urgency_level = Column(Float, default=0.0) # Niveau d'urgence 0-1
    ai_insights = Column(JSON, default=dict) # Analyse des causes racines
    last_ai_update = Column(DateTime, default=datetime.utcnow)
    
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user_email = Column(String(255), nullable=True)
    user_name = Column(String(200), nullable=True)
    
    resolved_by_ai = Column(Boolean, default=False)
    resolution_time_seconds = Column(Float, nullable=True)
    confidence_score = Column(Float, nullable=True)
    
    extra_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    
    # Relations
    solutions = relationship("TicketSolution", back_populates="ticket", cascade="all, delete-orphan")
    messages = relationship("TicketMessage", back_populates="ticket", cascade="all, delete-orphan")

class TicketSolution(Base):
    __tablename__ = "ticket_solutions"
    
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("support_tickets.id"))
    solution_text = Column(Text, nullable=False)
    steps = Column(JSON, default=[])
    sources = Column(JSON, default=[])
    confidence = Column(Float, default=0.0)
    helpful_count = Column(Integer, default=0)
    not_helpful_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    ticket = relationship("SupportTicket", back_populates="solutions")
    feedbacks = relationship("SolutionFeedback", back_populates="solution")

class SolutionFeedback(Base):
    __tablename__ = "solution_feedbacks"
    
    id = Column(Integer, primary_key=True, index=True)
    solution_id = Column(Integer, ForeignKey("ticket_solutions.id"))
    helpful = Column(Boolean, nullable=False)
    user_id = Column(Integer, nullable=True)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    solution = relationship("TicketSolution", back_populates="feedbacks")

class TicketMessage(Base):
    __tablename__ = "ticket_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("support_tickets.id"))
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    confidence = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    ticket = relationship("SupportTicket", back_populates="messages")

class KnowledgeBase(Base):
    __tablename__ = "knowledge_base"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    content = Column(Text, nullable=False)
    excerpt = Column(String(1000), nullable=True)
    category = Column(String(100), nullable=True)
    sector = Column(String(50), nullable=True)  # Ajout du secteur
    tags = Column(JSON, default=[])
    embedding = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)