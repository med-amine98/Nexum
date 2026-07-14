# app/models/churn.py

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON, Boolean, Index, func
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum
from app.database import Base

# ===== ÉNUMÉRATIONS =====
class ChurnRiskLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ClientSegment(str, enum.Enum):
    PREMIUM = "premium"
    STANDARD = "standard"
    ENTRY = "entry"

class ChurnReason(str, enum.Enum):
    LOW_ENGAGEMENT = "low_engagement"
    COMPLAINTS = "complaints"
    COMPETITIVE_OFFER = "competitive_offer"
    PRICE_SENSITIVE = "price_sensitive"
    SERVICE_QUALITY = "service_quality"

class InteractionType(str, enum.Enum):
    CALL = "call"
    EMAIL = "email"
    MEETING = "meeting"
    COMPLAINT = "complaint"

class RetentionActionType(str, enum.Enum):
    CALL = "call"
    OFFER = "offer"
    EMAIL = "email"
    MEETING = "meeting"

class ActionResult(str, enum.Enum):
    SUCCESS = "success"
    PENDING = "pending"
    FAILED = "failed"

# ===== MODÈLE CLIENT =====
class ChurnClient(Base):
    __tablename__ = 'churn_clients'
    __table_args__ = (
        Index('idx_churn_clients_risk_level', 'risk_level'),
        Index('idx_churn_clients_city', 'city'),
        Index('idx_churn_clients_company_id', 'company_id'),  # ← AJOUTER
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(String(50), unique=True, index=True, nullable=False, default=lambda: f"CL-{uuid.uuid4().hex[:8].upper()}")
    client_name = Column(String(200), nullable=False)
    client_email = Column(String(100), nullable=True)
    client_phone = Column(String(50), nullable=True)
    city = Column(String(100), nullable=True)
    segment = Column(String(20), default=ClientSegment.STANDARD)
    client_tenure = Column(Integer, default=0)  # mois
    loyalty_score = Column(Float, default=0.0)
    churn_probability = Column(Float, default=0.0)
    risk_level = Column(String(20), default=ChurnRiskLevel.LOW)
    main_reason = Column(String(50), nullable=True)
    
    # ✅ AJOUTER company_id
    company_id = Column(Integer, ForeignKey('companies.id', ondelete="CASCADE"), nullable=False, index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    interactions = relationship("ChurnInteraction", back_populates="client", cascade="all, delete-orphan")
    competitor_offers = relationship("CompetitorOffer", back_populates="client", cascade="all, delete-orphan")
    retention_actions = relationship("RetentionAction", back_populates="client", cascade="all, delete-orphan")


# ===== MODÈLE INTERACTION CLIENT =====
class ChurnInteraction(Base):
    __tablename__ = 'churn_interactions'
    __table_args__ = (
        Index('idx_churn_interactions_company_id', 'company_id'),  # ← AJOUTER
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey('churn_clients.id', ondelete="CASCADE"), nullable=False)
    interaction_type = Column(String(20), nullable=False)
    content = Column(Text, nullable=True)
    satisfaction_score = Column(Float, default=0.0)
    interaction_date = Column(DateTime, default=datetime.utcnow)
    
    # ✅ AJOUTER company_id
    company_id = Column(Integer, ForeignKey('companies.id', ondelete="CASCADE"), nullable=False, index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    client = relationship("ChurnClient", back_populates="interactions")


# ===== MODÈLE OFFRE CONCURRENTE =====
class CompetitorOffer(Base):
    __tablename__ = 'competitor_offers'
    __table_args__ = (
        Index('idx_competitor_offers_company_id', 'company_id'),  # ← AJOUTER
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey('churn_clients.id', ondelete="CASCADE"), nullable=False)
    competitor = Column(String(100), nullable=False)
    offer = Column(Text, nullable=False)
    value = Column(Float, default=0.0)
    offer_date = Column(DateTime, default=datetime.utcnow)
    
    # ✅ AJOUTER company_id
    company_id = Column(Integer, ForeignKey('companies.id', ondelete="CASCADE"), nullable=False, index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    client = relationship("ChurnClient", back_populates="competitor_offers")


# ===== MODÈLE ACTION DE RÉTENTION =====
class RetentionAction(Base):
    __tablename__ = 'retention_actions'
    __table_args__ = (
        Index('idx_retention_actions_result', 'result'),
        Index('idx_retention_actions_company_id', 'company_id'),  # ← AJOUTER
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey('churn_clients.id', ondelete="CASCADE"), nullable=False)
    action_type = Column(String(20), nullable=False)
    cost = Column(Float, default=0.0)
    description = Column(Text, nullable=True)
    result = Column(String(20), default=ActionResult.PENDING)
    action_date = Column(DateTime, default=datetime.utcnow)
    
    # ✅ AJOUTER company_id
    company_id = Column(Integer, ForeignKey('companies.id', ondelete="CASCADE"), nullable=False, index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    client = relationship("ChurnClient", back_populates="retention_actions")


# ===== MODÈLE OFFRE DE RÉTENTION =====
class RetentionOffer(Base):
    __tablename__ = 'retention_offers'
    __table_args__ = (
        Index('idx_retention_offers_company_id', 'company_id'),  # ← AJOUTER
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    offer_id = Column(String(50), unique=True, index=True, nullable=False, default=lambda: f"OFF-{uuid.uuid4().hex[:8].upper()}")
    name = Column(String(100), nullable=False)
    offer_type = Column(String(20), nullable=False)  # discount, upgrade, bonus
    value = Column(Float, default=0.0)
    duration = Column(Integer, default=12)  # mois
    success_rate = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    
    # ✅ AJOUTER company_id
    company_id = Column(Integer, ForeignKey('companies.id', ondelete="CASCADE"), nullable=False, index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)


# ===== FONCTIONS UTILITAIRES =====
def generate_client_id():
    return f"CL-{uuid.uuid4().hex[:8].upper()}"

def generate_offer_id():
    return f"OFF-{uuid.uuid4().hex[:8].upper()}"