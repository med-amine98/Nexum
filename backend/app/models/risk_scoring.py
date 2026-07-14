# app/models/risk_scoring.py
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, JSON, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum
import uuid
from datetime import datetime

# ===== ÉNUMÉRATIONS =====
class InsuranceType(str, enum.Enum):
    AUTO = "auto"
    HOME = "habitation"
    HEALTH = "sante"
    LIFE = "vie"
    TRAVEL = "voyage"
    PROFESSIONAL = "professionnelle"
    OTHER = "autre"

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

class FraudLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class DetectionMethod(str, enum.Enum):
    ZERO_KNOWLEDGE = "zero_knowledge_identity_proof"
    AI_DOCUMENT_FORENSICS = "ai_document_forensics"
    MICRO_EXPRESSION = "facial_micro_expression"
    CROSS_DOMAIN = "cross_domain_entity_resolution"
    TRADITIONAL = "traditional"

# ===== MODÈLES =====
class InsurancePolicy(Base):
    __tablename__ = "risk_scoring_policies"
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
    
    # IA Stratégique Scoring Risque Nexum (James)
    ai_risk_forecast_12m = Column(Float, default=0.0)
    ai_premium_optimization = Column(Float, default=0.0)
    ai_insights = Column(JSON, default=dict)
    last_ai_update = Column(DateTime, default=datetime.utcnow)
    
    # Historique sinistres
    claims_count = Column(Integer, default=0)
    total_claims_amount = Column(Float, default=0.0)
    last_claim_date = Column(DateTime, nullable=True)
    
    # Métadonnées
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    # Relations
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    analyzed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Relations SQLAlchemy avec foreign_keys explicites
    claims = relationship(
        "InsuranceClaimRisk", 
        back_populates="policy", 
        cascade="all, delete-orphan",
        foreign_keys="InsuranceClaimRisk.policy_id"
    )
    risk_history = relationship(
        "RiskScoreHistory", 
        back_populates="policy", 
        cascade="all, delete-orphan",
        foreign_keys="RiskScoreHistory.policy_id"
    )
    fraud_alerts = relationship(
        "RiskScoringFraudAlert", 
        back_populates="policy", 
        cascade="all, delete-orphan",
        foreign_keys="RiskScoringFraudAlert.policy_id"
    )
    
    company = relationship("Company", foreign_keys=[company_id], backref="risk_scoring_policies")
    analyzed_by = relationship("User", foreign_keys=[analyzed_by_id], backref="analyzed_risk_policies")
    
    # ============================================
    # ⭐ PROPRIÉTÉ "type" POUR COMPATIBILITÉ
    # ============================================
    @property
    def type(self):
        """Alias pour policy_type (compatibilité avec l'ancien code)"""
        return self.policy_type
    
    @type.setter
    def type(self, value):
        self.policy_type = value
    
    def __repr__(self):
        return f"<RiskScoringPolicy(id={self.id}, client_name='{self.client_name}', risk_score={self.risk_score})>"
    
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
            "type": self.policy_type,  # ✅ Ajout de 'type' pour compatibilité
            "risk_score": self.risk_score,
            "risk_level": self.risk_level,
            "premium": self.premium,
            "coverage_amount": self.coverage_amount,
            "claims_count": self.claims_count,
            "total_claims_amount": self.total_claims_amount,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class InsuranceClaimRisk(Base):
    __tablename__ = "risk_scoring_claims"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    claim_id = Column(String(50), unique=True, index=True, nullable=False, default=lambda: f"CLM-{uuid.uuid4().hex[:8].upper()}")
    policy_id = Column(Integer, ForeignKey("risk_scoring_policies.id"), nullable=False)
    
    claim_date = Column(DateTime, nullable=False, default=datetime.now)
    claim_amount = Column(Float, nullable=False, default=0.0)
    claim_type = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    
    status = Column(String(20), default=ClaimStatus.SUBMITTED.value)
    settled_amount = Column(Float, nullable=True)
    settled_date = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    policy = relationship("InsurancePolicy", foreign_keys=[policy_id], back_populates="claims")
    
    def __repr__(self):
        return f"<InsuranceClaimRisk(id={self.id}, claim_id='{self.claim_id}')>"


class RiskScoreHistory(Base):
    __tablename__ = "risk_score_history"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    policy_id = Column(Integer, ForeignKey("risk_scoring_policies.id"), nullable=False)
    
    score = Column(Float, nullable=False)
    level = Column(String(20), nullable=False)
    reason = Column(String(500), nullable=True)
    
    calculated_at = Column(DateTime, server_default=func.now())
    
    policy = relationship("InsurancePolicy", foreign_keys=[policy_id], back_populates="risk_history")
    
    def __repr__(self):
        return f"<RiskScoreHistory(id={self.id}, policy_id={self.policy_id}, score={self.score})>"


class RiskScoringFraudAlert(Base):
    __tablename__ = "risk_scoring_fraud_alerts"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    alert_id = Column(String(50), unique=True, index=True, nullable=False, default=lambda: f"FRD-{uuid.uuid4().hex[:8].upper()}")
    policy_id = Column(Integer, ForeignKey("risk_scoring_policies.id"), nullable=False)
    
    client_name = Column(String(200), nullable=False)
    fraud_score = Column(Float, default=0.0)
    fraud_level = Column(String(20), default=FraudLevel.MEDIUM.value)
    
    detection_method = Column(String(50), nullable=False)
    indicators = Column(JSON, default=list)
    techniques_used = Column(JSON, default=list)
    
    # IA Stratégique Alerte Risque Nexum (James)
    ai_logic_explanation = Column(Text, nullable=True)
    ai_investigation_priority = Column(Float, default=0.0)
    ai_suggested_next_steps = Column(JSON, default=list)
    last_ai_update = Column(DateTime, default=datetime.utcnow)
    
    recommendation = Column(Text, nullable=True)
    
    resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    policy = relationship("InsurancePolicy", foreign_keys=[policy_id], back_populates="fraud_alerts")
    resolved_by = relationship("User", foreign_keys=[resolved_by_id])
    
    def __repr__(self):
        return f"<RiskScoringFraudAlert(id={self.id}, policy_id={self.policy_id}, fraud_score={self.fraud_score})>"


class RiskFactor(Base):
    __tablename__ = "risk_factors"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    factor_name = Column(String(100), unique=True, nullable=False)
    factor_description = Column(Text, nullable=True)
    
    weight_auto = Column(Float, default=1.0)
    weight_home = Column(Float, default=1.0)
    weight_health = Column(Float, default=1.0)
    weight_life = Column(Float, default=1.0)
    weight_travel = Column(Float, default=1.0)
    weight_professional = Column(Float, default=1.0)
    
    threshold_low = Column(Float, default=0.3)
    threshold_medium = Column(Float, default=0.6)
    threshold_high = Column(Float, default=0.8)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    def __repr__(self):
        return f"<RiskFactor(id={self.id}, factor_name='{self.factor_name}')>"


# ============================================
# PATCH POUR LA COMPATIBILITÉ AVEC L'ANCIEN CODE
# ============================================
# Cette section permet de patcher dynamiquement la classe 
# pour ajouter 'type' si ce n'est pas déjà fait

def patch_insurance_policy():
    """Patch InsurancePolicy pour ajouter la propriété 'type' si elle n'existe pas"""
    if not hasattr(InsurancePolicy, 'type'):
        @property
        def type_property(self):
            return getattr(self, 'policy_type', 'auto')
        
        @type_property.setter
        def type_property_setter(self, value):
            self.policy_type = value
        
        InsurancePolicy.type = type_property
        InsurancePolicy.type_setter = type_property_setter
        print("✅ InsurancePolicy patché avec la propriété 'type'")

# Appliquer le patch
patch_insurance_policy()

print("✅ Modèles Risk Scoring chargés avec compatibilité 'type'")