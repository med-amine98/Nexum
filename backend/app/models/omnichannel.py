# app/models/omnichannel.py
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON, Boolean, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base


class ChannelType(str, enum.Enum):
    """Types de canaux de communication"""
    EMAIL = "email"
    PHONE = "phone"
    CHAT = "chat"
    WHATSAPP = "whatsapp"
    SMS = "sms"
    SOCIAL = "social"
    WEBSITE = "website"


class InteractionType(str, enum.Enum):
    """Types d'interactions"""
    INBOUND = "inbound"
    OUTBOUND = "outbound"
    AUTOMATED = "automated"


class InteractionStatus(str, enum.Enum):
    """Statuts d'interaction"""
    PENDING = "pending"
    PROCESSED = "processed"
    ESCALATED = "escalated"
    CLOSED = "closed"


class OmnichannelChannel(Base):
    """Configuration des canaux de communication"""
    __tablename__ = "omnichannel_channels"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    type = Column(Enum(ChannelType), nullable=False)
    color = Column(String(20), default="#1890ff")
    is_active = Column(Boolean, default=True)
    unread_count = Column(Integer, default=0)
    last_contact = Column(DateTime, nullable=True)
    
    # Configuration spécifique au canal
    config = Column(JSON, default={})
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    interactions = relationship("OmnichannelInteraction", back_populates="channel")
    messages = relationship("OmnichannelMessage", back_populates="channel")


class OmnichannelConversation(Base):
    """Conversations regroupées par sujet"""
    __tablename__ = "omnichannel_conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("banking_clients.id"), nullable=False)
    subject = Column(String(255), nullable=False)
    
    # Métadonnées
    started_at = Column(DateTime, default=datetime.utcnow)
    last_activity = Column(DateTime, default=datetime.utcnow)
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)
    
    # Tags et catégorisation
    tags = Column(JSON, default=[])
    category = Column(String(100), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    client = relationship("Client", foreign_keys=[client_id])
    interactions = relationship("OmnichannelInteraction", back_populates="conversation")


class OmnichannelInteraction(Base):
    """Historique des interactions client"""
    __tablename__ = "omnichannel_interactions"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("banking_clients.id"), nullable=False)
    channel_id = Column(Integer, ForeignKey("omnichannel_channels.id"), nullable=False)
    conversation_id = Column(Integer, ForeignKey("omnichannel_conversations.id"), nullable=True)
    
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    interaction_type = Column(Enum(InteractionType), default=InteractionType.INBOUND)
    status = Column(Enum(InteractionStatus), default=InteractionStatus.PROCESSED)
    
    date = Column(DateTime, default=datetime.utcnow)
    duration_seconds = Column(Integer, default=0)
    satisfaction_score = Column(Integer, nullable=True)
    
    # IA Stratégique Omnicanal Nexum (Sophie)
    ai_sentiment_score = Column(Float, default=0.0)
    ai_intent_classification = Column(String(100), nullable=True)
    ai_suggested_response = Column(Text, nullable=True)
    ai_escalation_risk = Column(Float, default=0.0)
    last_ai_update = Column(DateTime, default=datetime.utcnow)
    
    extra_data = Column(JSON, default={})
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relations
    client = relationship("Client", foreign_keys=[client_id])
    channel = relationship("OmnichannelChannel", back_populates="interactions")
    conversation = relationship("OmnichannelConversation", back_populates="interactions")
    messages = relationship("OmnichannelMessage", back_populates="interaction")


class OmnichannelMessage(Base):
    """Messages échangés avec les clients"""
    __tablename__ = "omnichannel_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("banking_clients.id"), nullable=False)
    channel_id = Column(Integer, ForeignKey("omnichannel_channels.id"), nullable=False)
    interaction_id = Column(Integer, ForeignKey("omnichannel_interactions.id"), nullable=True)
    
    sender = Column(String(100), nullable=False)  # client, agent, system
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime, nullable=True)
    
    # Pièces jointes
    attachments = Column(JSON, default=[])
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relations
    client = relationship("Client", foreign_keys=[client_id])
    channel = relationship("OmnichannelChannel", back_populates="messages")
    interaction = relationship("OmnichannelInteraction", back_populates="messages")


class OmnichannelNotification(Base):
    """Notifications pour les clients"""
    __tablename__ = "omnichannel_notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("banking_clients.id"), nullable=False)
    
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="info")  # info, warning, success, error
    
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime, nullable=True)
    
    # Lien d'action
    action_url = Column(String(500), nullable=True)
    action_label = Column(String(100), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relations
    client = relationship("Client", foreign_keys=[client_id])


class OmnichannelAnalytics(Base):
    """Analytics omnicanal"""
    __tablename__ = "omnichannel_analytics"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, nullable=False, index=True)
    channel_id = Column(Integer, ForeignKey("omnichannel_channels.id"), nullable=False)
    
    # Métriques
    total_interactions = Column(Integer, default=0)
    total_messages = Column(Integer, default=0)
    avg_response_time_seconds = Column(Float, default=0)
    satisfaction_score = Column(Float, default=0)
    resolution_rate = Column(Float, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relations
    channel = relationship("OmnichannelChannel")