# app/models/insurance.py
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON, Boolean, Enum, Index, func, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
import uuid
from app.database import Base

# ===== ÉNUMÉRATIONS =====

class ClaimStatus(str, enum.Enum):
    PENDING = "en_attente"
    PROCESSING = "en_cours"
    INVESTIGATION = "investigation"
    APPROVED = "approuvé"
    REJECTED = "rejeté"
    PAID = "payé"
    BLOCKED = "bloqué"
    FALSE_POSITIVE = "false_positive"
    INVESTIGATING = "investigating" # From fraud_insurance

class ClaimType(str, enum.Enum):
    AUTO = "auto"
    HOME = "habitation"
    HEALTH = "sante"
    LIFE = "vie"
    PROFESSIONAL = "professionnel"
    HABITATION = "habitation"
    SANTE = "sante"
    VIE = "vie"
    PROFESSIONNELLE = "professionnelle"

class FraudLevel(str, enum.Enum):
    LOW = "faible"
    MEDIUM = "moyen"
    HIGH = "élevé"
    CRITICAL = "critique"
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"

class RiskLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class CatastropheType(str, enum.Enum):
    STORM = "tempête"
    FLOOD = "inondation"
    DROUGHT = "sécheresse"
    EARTHQUAKE = "tremblement de terre"
    FIRE = "incendie"
    HEATWAVE = "canicule"

class AlertLevel(str, enum.Enum):
    LOW = "faible"
    MEDIUM = "moyen"
    HIGH = "élevé"
    CRITICAL = "critique"

class ChurnRiskLevel(str, enum.Enum):
    LOW = "faible"
    MEDIUM = "moyen"
    HIGH = "élevé"
    CRITICAL = "critique"

class DocumentType(str, enum.Enum):
    CONSTAT = "constat"
    PHOTO = "photo"
    FACTURE = "facture"
    RAPPORT = "rapport"
    TEMOIGNAGE = "temoignage"

# ========== MODÈLE SINISTRES (UNIFIÉ) ==========
class InsuranceClaim(Base):
    __tablename__ = "insurance_claims"
    __table_args__ = (
        Index('idx_insurance_claims_status', 'status'),
        Index('idx_insurance_claims_risk_level', 'risk_level'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    claim_id = Column(String(50), unique=True, index=True, nullable=False, default=lambda: f"CLM-{uuid.uuid4().hex[:8].upper()}")
    claim_number = Column(String(50), unique=True, index=True, nullable=False)
    
    # Informations sinistre
    claim_type = Column(SQLEnum(ClaimType), nullable=False)
    claim_date = Column(DateTime, nullable=True) # Unified from incident_date and claim_date
    incident_date = Column(DateTime, nullable=True)
    claim_location = Column(String(300), nullable=True)
    incident_location = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    amount = Column(Float, nullable=False)
    policy_id = Column(String(50), nullable=True)
    
    # Informations client
    client_name = Column(String(255), nullable=False)
    client_id = Column(String(50), nullable=True)
    client_email = Column(String(255), nullable=True)
    client_phone = Column(String(50), nullable=True)
    client_address = Column(Text, nullable=True)
    
    # Détection fraude
    fraud_score = Column(Float, default=0.0)
    fraud_level = Column(SQLEnum(FraudLevel), default=FraudLevel.LOW)
    risk_level = Column(SQLEnum(RiskLevel), default=RiskLevel.LOW)
    fraud_indicators = Column(JSON, default=list)
    detection_method = Column(String(50), default="ensemble")
    
    # IA Stratégique Sinistres Nexum (James)
    ai_damage_validation = Column(JSON, default=dict) # Version d'origine
    ai_damage_validation_score = Column(Float, default=0.0) # Version fraud_insurance
    ai_settlement_estimate = Column(Float, default=0.0)
    ai_settlement_recommendation = Column(Float, default=0.0)
    ai_fraud_pattern = Column(JSON, default=dict)
    ai_insights = Column(JSON, default=dict)
    last_ai_update = Column(DateTime, default=datetime.utcnow)
    
    # Statut et Traitement
    status = Column(String(50), default="en_attente") # String to handle both enums
    processing_time_days = Column(Float, default=0)
    assigned_agent = Column(String(100), nullable=True)
    investigating_officer = Column(String(100), nullable=True)
    blocked_reason = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    documents = Column(JSON, nullable=True) # Store doc list if needed
    
    # Dates
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)
    paid_at = Column(DateTime, nullable=True)
    
    # Relations
    fraud_alerts = relationship("InsuranceFraudAlert", back_populates="claim", cascade="all, delete-orphan")
    claim_documents = relationship("InsuranceDocument", back_populates="claim", cascade="all, delete-orphan")
    witnesses = relationship("InsuranceWitness", back_populates="claim", cascade="all, delete-orphan")
    expertise = relationship("InsuranceExpertise", back_populates="claim", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "claim_id": self.claim_id,
            "claim_number": self.claim_number,
            "claim_type": self.claim_type.value if hasattr(self.claim_type, 'value') else self.claim_type,
            "client_name": self.client_name,
            "amount": self.amount,
            "fraud_score": self.fraud_score,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

# ========== MODÈLE ALERTES FRAUDE (UNIFIÉ) ==========
class InsuranceFraudAlert(Base):
    __tablename__ = "insurance_fraud_alerts"
    __table_args__ = (
        Index('idx_insurance_fraud_alerts_claim_id', 'claim_id'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    alert_id = Column(String(50), unique=True, index=True, nullable=False, default=lambda: f"ALERT-{uuid.uuid4().hex[:8].upper()}")
    claim_id = Column(Integer, ForeignKey("insurance_claims.id", ondelete="CASCADE"), nullable=False)
    
    claim_number = Column(String(50), nullable=False)
    fraud_score = Column(Float, default=0.0)
    fraud_level = Column(String(20), default="medium")
    description = Column(Text, nullable=False)
    detection_method = Column(String(50), nullable=False)
    indicators = Column(JSON, default=list)
    
    # IA Stratégique Alerte Fraude Assurance Nexum (James)
    ai_fraud_explanation = Column(Text, nullable=True) # From insurance.py
    ai_logic_explanation = Column(Text, nullable=True) # From fraud_insurance.py
    ai_investigation_priority = Column(Float, default=0.0)
    ai_suggested_actions = Column(JSON, default=list)
    ai_confidence_score = Column(Float, default=0.0)
    last_ai_update = Column(DateTime, default=datetime.utcnow)
    
    resolved = Column(Boolean, default=False)
    is_resolved = Column(Boolean, default=False) # Keep both for compatibility
    resolved_at = Column(DateTime, nullable=True)
    resolved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolution_note = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=func.now())
    
    # Relations
    claim = relationship("InsuranceClaim", back_populates="fraud_alerts")
    resolved_by = relationship("User", foreign_keys=[resolved_by_id])

    def to_dict(self):
        return {
            "id": self.id,
            "alert_id": self.alert_id,
            "claim_id": self.claim_id,
            "claim_number": self.claim_number,
            "fraud_score": self.fraud_score,
            "fraud_level": self.fraud_level,
            "description": self.description,
            "resolved": self.resolved or self.is_resolved,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

# ========== AUTRES MODÈLES FRAUDE ==========

class InsuranceDocument(Base):
    __tablename__ = "insurance_documents"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(String(50), unique=True, index=True, nullable=False, default=lambda: f"DOC-{uuid.uuid4().hex[:8].upper()}")
    claim_id = Column(Integer, ForeignKey("insurance_claims.id", ondelete="CASCADE"), nullable=False)
    document_type = Column(SQLEnum(DocumentType), nullable=False)
    file_name = Column(String(200), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, default=0)
    description = Column(Text, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    
    claim = relationship("InsuranceClaim", back_populates="claim_documents")

class InsuranceWitness(Base):
    __tablename__ = "insurance_witnesses"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    witness_id = Column(String(50), unique=True, index=True, nullable=False, default=lambda: f"WIT-{uuid.uuid4().hex[:8].upper()}")
    claim_id = Column(Integer, ForeignKey("insurance_claims.id", ondelete="CASCADE"), nullable=False)
    witness_name = Column(String(200), nullable=False)
    witness_phone = Column(String(50), nullable=True)
    witness_email = Column(String(100), nullable=True)
    witness_address = Column(Text, nullable=True)
    statement = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    claim = relationship("InsuranceClaim", back_populates="witnesses")

class InsuranceExpertise(Base):
    __tablename__ = "insurance_expertises"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    expertise_id = Column(String(50), unique=True, index=True, nullable=False, default=lambda: f"EXP-{uuid.uuid4().hex[:8].upper()}")
    claim_id = Column(Integer, ForeignKey("insurance_claims.id", ondelete="CASCADE"), nullable=False)
    expert_name = Column(String(200), nullable=False)
    expert_company = Column(String(200), nullable=True)
    report_date = Column(DateTime, default=datetime.utcnow)
    report_content = Column(Text, nullable=True)
    conclusions = Column(Text, nullable=True)
    recommendations = Column(Text, nullable=True)
    estimated_damage = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    claim = relationship("InsuranceClaim", back_populates="expertise")

class InsuranceClient(Base):
    __tablename__ = "insurance_clients"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(String(50), unique=True, index=True, nullable=False, default=lambda: f"CL-{uuid.uuid4().hex[:8].upper()}")
    client_name = Column(String(200), nullable=False)
    client_email = Column(String(100), nullable=True)
    client_phone = Column(String(50), nullable=True)
    client_address = Column(Text, nullable=True)
    
    previous_claims = Column(Integer, default=0)
    previous_claims_amount = Column(Float, default=0.0)
    previous_cancellations = Column(Integer, default=0)
    risk_level = Column(String(20), default="low")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class FraudDetectionRule(Base):
    __tablename__ = "fraud_detection_rules"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(String(50), unique=True, index=True, nullable=False, default=lambda: f"RULE-{uuid.uuid4().hex[:8].upper()}")
    rule_name = Column(String(100), nullable=False)
    rule_type = Column(String(50), nullable=False)
    operator = Column(String(20), nullable=False)
    threshold = Column(Float, nullable=False)
    weight = Column(Float, default=1.0)
    is_active = Column(Boolean, default=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# ========== MODÈLES RISQUES & CATASTROPHES ==========

class CatastropheRisk(Base):
    __tablename__ = "catastrophe_risks"
    
    id = Column(Integer, primary_key=True, index=True)
    zone = Column(String(100), nullable=False, index=True)
    region = Column(String(100), nullable=True)
    department = Column(String(50), nullable=True)
    catastrophe_type = Column(Enum(CatastropheType), nullable=False)
    probability = Column(Float, default=0)
    severity = Column(Float, default=0)
    alert_level = Column(Enum(AlertLevel), default=AlertLevel.LOW)
    damage_estimate = Column(Float, default=0)
    insured_damage = Column(Float, default=0)
    historical_events = Column(Integer, default=0)
    last_event_date = Column(DateTime, nullable=True)
    risk_factors = Column(JSON, nullable=True)
    recommendations = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class WeatherAlert(Base):
    __tablename__ = "weather_alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(String(50), unique=True, index=True, nullable=False)
    alert_type = Column(Enum(CatastropheType), nullable=False)
    zone = Column(String(100), nullable=False)
    severity = Column(Enum(AlertLevel), default=AlertLevel.MEDIUM)
    description = Column(Text, nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=True)
    predicted_damage = Column(Float, default=0)
    impact = Column(String(50), nullable=True)
    recommendations = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ChurnPrediction(Base):
    __tablename__ = "churn_predictions"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    client_id = Column(Integer, nullable=False, index=True)
    client_name = Column(String(255), nullable=False)
    client_email = Column(String(255), nullable=True)
    churn_probability = Column(Float, nullable=False)
    churn_risk_level = Column(Enum(ChurnRiskLevel), default=ChurnRiskLevel.MEDIUM)
    retention_score = Column(Float, default=0)
    main_reason = Column(String(255), nullable=True)
    risk_factors = Column(JSON, nullable=True)
    recommended_actions = Column(JSON, nullable=True)
    ai_retention_strategy = Column(JSON, default=dict)
    ai_lifetime_value_forecast = Column(Float, default=0.0)
    ai_insights = Column(JSON, default=dict)
    last_ai_update = Column(DateTime, default=datetime.utcnow)
    is_alert_sent = Column(Boolean, default=False)
    alert_sent_at = Column(DateTime, nullable=True)
    is_retained = Column(Boolean, default=False)
    retained_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class FraudStatistics(Base):
    __tablename__ = "fraud_statistics"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, default=datetime.utcnow, index=True)
    total_detected = Column(Integer, default=0)
    blocked = Column(Integer, default=0)
    under_investigation = Column(Integer, default=0)
    false_positive = Column(Integer, default=0)
    amount_saved = Column(Float, default=0)
    detection_accuracy = Column(Float, default=0)
    by_type = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)