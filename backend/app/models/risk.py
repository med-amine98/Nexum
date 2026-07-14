# app/models/risk.py
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, JSON, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum
from datetime import datetime
import uuid

# ===== ÉNUMÉRATIONS =====
class RiskLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class PolicyStatus(str, enum.Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    CANCELLED = "cancelled"
    PENDING = "pending"

class ClaimStatus(str, enum.Enum):
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"
    PENDING = "pending"

# ===== MODÈLES =====
class RiskInsurancePolicy(Base):  # Renommé de InsurancePolicy à RiskInsurancePolicy
    __tablename__ = "insurance_policies"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    policy_id = Column(String(50), unique=True, index=True, nullable=False, default=lambda: f"POL-{uuid.uuid4().hex[:8].upper()}")
    
    # Client
    client_name = Column(String(200), nullable=False)
    client_id = Column(String(50), index=True, nullable=True)
    client_age = Column(Integer, nullable=True)
    client_profession = Column(String(100), nullable=True)
    client_email = Column(String(255), nullable=True)
    
    # Police
    policy_type = Column(String(50), nullable=False)
    policy_number = Column(String(50), unique=True, nullable=False)
    start_date = Column(DateTime, nullable=False, default=datetime.now)
    end_date = Column(DateTime, nullable=True)
    status = Column(String(20), default=PolicyStatus.ACTIVE.value)
    
    # Montants
    premium = Column(Float, nullable=False, default=0.0)
    coverage_amount = Column(Float, nullable=False, default=0.0)
    deductible = Column(Float, default=0.0)
    
    # Scoring risque
    risk_score = Column(Float, default=0.0)
    risk_level = Column(String(20), default=RiskLevel.MEDIUM.value)
    
    # Facteurs de risque
    risk_factors = Column(JSON, default=list)
    scoring_details = Column(JSON, default=dict)
    
    # Historique sinistres
    claims_count = Column(Integer, default=0)
    total_claims_amount = Column(Float, default=0.0)
    last_claim_date = Column(DateTime, nullable=True)
    
    # Métadonnées
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    # Relations
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    analyzed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    company = relationship("Company", foreign_keys=[company_id], backref="insurance_policies")
    analyzed_by = relationship("User", foreign_keys=[analyzed_by_id], backref="analyzed_policies")
    
    claims = relationship("RiskInsuranceClaim", back_populates="policy", cascade="all, delete-orphan")
    risk_history = relationship("RiskScoreHistoryRisk", back_populates="policy", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<RiskInsurancePolicy(id={self.id}, client_name='{self.client_name}', risk_score={self.risk_score})>"
    
    def to_dict(self):
        return {
            "id": self.id,
            "policy_id": self.policy_id,
            "policy_number": self.policy_number,
            "client_name": self.client_name,
            "client_email": self.client_email,
            "client_age": self.client_age,
            "client_profession": self.client_profession,
            "policy_type": self.policy_type,
            "risk_score": self.risk_score,
            "risk_level": self.risk_level,
            "premium": self.premium,
            "coverage_amount": self.coverage_amount,
            "claims_count": self.claims_count,
            "total_claims_amount": self.total_claims_amount,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class RiskInsuranceClaim(Base):  # Renommé de InsuranceClaim à RiskInsuranceClaim
    __tablename__ = "insurance_claims_risk"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    claim_id = Column(String(50), unique=True, index=True, nullable=False, default=lambda: f"CLM-{uuid.uuid4().hex[:8].upper()}")
    policy_id = Column(Integer, ForeignKey("insurance_policies.id"), nullable=False)
    
    claim_date = Column(DateTime, nullable=False, default=datetime.now)
    claim_amount = Column(Float, nullable=False, default=0.0)
    claim_type = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    
    status = Column(String(20), default=ClaimStatus.SUBMITTED.value)
    settled_amount = Column(Float, nullable=True)
    settled_date = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    policy = relationship("RiskInsurancePolicy", foreign_keys=[policy_id], back_populates="claims")
    
    def __repr__(self):
        return f"<RiskInsuranceClaim(id={self.id}, claim_id='{self.claim_id}')>"


class RiskScoreHistoryRisk(Base):  # Renommé de RiskScoreHistory à RiskScoreHistoryRisk
    __tablename__ = "risk_score_history_risk"  # Changé le nom de la table
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    policy_id = Column(Integer, ForeignKey("insurance_policies.id"), nullable=False)
    
    score = Column(Float, nullable=False)
    level = Column(String(20), nullable=False)
    reason = Column(String(500), nullable=True)
    
    calculated_at = Column(DateTime, server_default=func.now())
    
    policy = relationship("RiskInsurancePolicy", foreign_keys=[policy_id], back_populates="risk_history")
    
    def __repr__(self):
        return f"<RiskScoreHistoryRisk(id={self.id}, policy_id={self.policy_id}, score={self.score})>"