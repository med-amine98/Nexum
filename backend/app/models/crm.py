# app/models/crm.py
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean, Enum, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base

class LeadStatus(str, enum.Enum):
    NEW = "NEW"
    CONTACTED = "CONTACTED"
    QUALIFIED = "QUALIFIED"
    PROPOSAL = "PROPOSAL"
    NEGOTIATION = "NEGOTIATION"
    WON = "WON"
    LOST = "LOST"
    
class Lead(Base):
    __tablename__ = 'crm_leads'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    company_name = Column(String(200), nullable=True)
    email = Column(String(100), nullable=True, index=True)
    phone = Column(String(50), nullable=True)
    status = Column(Enum(LeadStatus), default=LeadStatus.NEW)
    source = Column(String(100), nullable=True)
    priority = Column(String(20), default="medium")
    description = Column(Text, nullable=True)
    expected_revenue = Column(Float, default=0.0)
    probability = Column(Float, default=0.0)
    assigned_to_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    company_id = Column(Integer, ForeignKey('companies.id'), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Intelligence IA & Conversion
    ai_lead_score = Column(Float, default=0.0)    # Score de conversion (0-100) calculé par Sophie
    ai_next_action = Column(String(500), nullable=True) # Recommandation de la prochaine action optimale
    ai_sentiment_analysis = Column(Text, nullable=True) # Analyse du sentiment des derniers échanges
    ai_risk_tags = Column(JSON, nullable=True)    # Tags de risque (concurrent, budget, etc.)
    converted_at = Column(DateTime, nullable=True)
    
    # Relations
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])

class PipelineStage(Base):
    __tablename__ = 'crm_pipeline_stages'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    sequence = Column(Integer, default=0)
    probability = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)