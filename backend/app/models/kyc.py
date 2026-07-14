# app/models/kyc.py
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean, Enum as SQLEnum, JSON, Index, func
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
import uuid
from app.database import Base

# ===== ÉNUMÉRATIONS =====
class KYCStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    REVIEW = "review"
    VERIFIED = "verified"
    REJECTED = "rejected"

class VerificationStatus(str, enum.Enum):
    NOT_VERIFIED = "not_verified"
    PROCESSING = "processing"
    VERIFIED = "verified"
    REVIEW = "review"
    REJECTED = "rejected"

class VerificationType(str, enum.Enum):
    FACE_MATCH = "face_match"
    DOCUMENT_VALIDITY = "document_validity"
    SECURITY_FEATURES = "security_features"
    DATA_CONSISTENCY = "data_consistency"
    EXPIRY_CHECK = "expiry_check"

class FraudRiskLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class FraudType(str, enum.Enum):
    IDENTITY_THEFT = "identity_theft"
    FORGED_DOCUMENTS = "forged_documents"
    DEEPFAKE = "deepfake"
    SYNTHETIC_IDENTITY = "synthetic_identity"
    NONE = "none"

class DetectionMethod(str, enum.Enum):
    ZERO_KNOWLEDGE = "zero_knowledge_identity_proof"
    AI_DOCUMENT_FORENSICS = "ai_document_forensics"
    MICRO_EXPRESSION = "facial_micro_expression"
    CROSS_DOMAIN = "cross_domain_entity_resolution"
    TRADITIONAL = "traditional"

class RuleAction(str, enum.Enum):
    AUTO_VERIFY = "auto_verify"
    FLAG_FRAUD = "flag_fraud"
    REQUEST_REVIEW = "request_review"

# ===== MODÈLE PRINCIPAL KYC =====
class KYCDocument(Base):
    __tablename__ = 'kyc_documents'
    __table_args__ = (
        Index('idx_kyc_documents_status', 'status'),
        Index('idx_kyc_documents_fraud_risk', 'fraud_risk'),
        Index('idx_kyc_documents_submitted_at', 'submitted_at'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(String(100), unique=True, index=True, nullable=False, default=lambda: f"KYC-{uuid.uuid4().hex[:8].upper()}")
    
    # Informations client
    client_name = Column(String(200), nullable=False)
    client_id = Column(String(100), nullable=True)
    client_email = Column(String(100), nullable=True)
    client_phone = Column(String(50), nullable=True)
    client_birth_date = Column(DateTime, nullable=True)
    client_address = Column(Text, nullable=True)
    
    # Informations document
    document_type = Column(String(50), nullable=False)
    document_number = Column(String(100), nullable=True)
    document_country = Column(String(100), nullable=True)
    document_expiry = Column(DateTime, nullable=True)
    document_issue_date = Column(DateTime, nullable=True)
    
    # Fichiers
    file_path = Column(String(500), nullable=True)
    file_name = Column(String(255), nullable=True)
    file_size = Column(Integer, default=0)
    mime_type = Column(String(100), nullable=True)
    
    # Selfie et justificatif
    selfie_path = Column(String(500), nullable=True)
    proof_path = Column(String(500), nullable=True)
    proof_type = Column(String(50), nullable=True)
    proof_date = Column(DateTime, nullable=True)
    
    # Scores et qualité
    confidence_score = Column(Float, default=0.0)
    quality_score = Column(Float, default=0.0)
    face_match_score = Column(Float, default=0.0)
    liveness_score = Column(Float, default=0.0)
    
    # Détection d'anomalies
    blur_detected = Column(Boolean, default=False)
    glare_detected = Column(Boolean, default=False)
    forged_detected = Column(Boolean, default=False)
    tampering_detected = Column(Boolean, default=False)
    compression_artifacts = Column(Float, default=0.0)
    
    # Détection de fraude avancée
    fraud_risk = Column(SQLEnum(FraudRiskLevel), default=FraudRiskLevel.LOW)
    fraud_score = Column(Float, default=0.0)
    fraud_type = Column(SQLEnum(FraudType), default=FraudType.NONE)
    fraud_indicators = Column(JSON, default=list)
    detection_method = Column(SQLEnum(DetectionMethod), default=DetectionMethod.TRADITIONAL)
    
    # Données extraites et questionnaire
    extracted_data = Column(JSON, nullable=True)
    questionnaire_answers = Column(JSON, nullable=True)
    verification_result = Column(JSON, nullable=True)
    
    # IA Stratégique KYC Nexum (Elena & Sophie)
    ai_verification_summary = Column(Text, nullable=True) # Synthèse IA
    ai_risk_breakdown = Column(JSON, default=dict) # Analyse détaillée des risques
    ai_identity_score = Column(Float, default=0.0) # Score global d'identité 0-1
    ai_deepfake_probability = Column(Float, default=0.0) # Détection de deepfake
    ai_insights = Column(JSON, default=dict) # Analyse stratégique globale
    last_ai_update = Column(DateTime, default=datetime.utcnow)
    
    # Statuts
    status = Column(SQLEnum(KYCStatus), default=KYCStatus.PENDING)
    verification_status = Column(SQLEnum(VerificationStatus), default=VerificationStatus.NOT_VERIFIED)
    
    # Dates
    submitted_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)
    verified_at = Column(DateTime, nullable=True)
    
    # Notes et raisons
    notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    
    # Relations
    company_id = Column(Integer, ForeignKey('companies.id'), nullable=False, index=True)
    processed_by_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    
    processed_by = relationship("User", foreign_keys=[processed_by_id])
    verifications = relationship("KYCVerification", back_populates="document", cascade="all, delete-orphan")
    fraud_alerts = relationship("KYCFraudAlert", back_populates="document", cascade="all, delete-orphan")
    fraud_analyses = relationship("KYCFraudAnalysis", back_populates="document", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<KYCDocument(id={self.id}, company_id={self.company_id}, client='{self.client_name}', status='{self.status}')>"
    
    def to_dict(self):
        return {
            "id": self.id,
            "document_id": self.document_id,
            "client_name": self.client_name,
            "client_email": self.client_email,
            "client_phone": self.client_phone,
            "document_type": self.document_type,
            "document_number": self.document_number,
            "confidence_score": self.confidence_score,
            "quality_score": self.quality_score,
            "face_match_score": self.face_match_score,
            "fraud_risk": self.fraud_risk.value if hasattr(self.fraud_risk, 'value') else str(self.fraud_risk),
            "fraud_score": self.fraud_score,
            "fraud_indicators": self.fraud_indicators,
            "status": self.status.value if hasattr(self.status, 'value') else str(self.status),
            "submitted_at": self.submitted_at.isoformat() if self.submitted_at else None,
            "verified_at": self.verified_at.isoformat() if self.verified_at else None
        }


class KYCVerification(Base):
    __tablename__ = 'kyc_verifications'
    __table_args__ = (
        Index('idx_kyc_verifications_document_id', 'document_id'),
        Index('idx_kyc_verifications_type', 'verification_type'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey('kyc_documents.id', ondelete="CASCADE"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    verification_type = Column(SQLEnum(VerificationType), nullable=False)
    result = Column(Boolean, default=False)
    score = Column(Float, default=0.0)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    document = relationship("KYCDocument", back_populates="verifications")


class KYCRule(Base):
    __tablename__ = 'kyc_rules'
    __table_args__ = (
        Index('idx_kyc_rules_is_active', 'is_active'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    rule_id = Column(String(50), unique=True, index=True, nullable=False, default=lambda: f"RULE-{uuid.uuid4().hex[:8].upper()}")
    rule_name = Column(String(100), nullable=False, unique=True)
    rule_type = Column(String(50), nullable=False)  # confidence_score, fraud_score, face_match_score
    operator = Column(String(20), nullable=False)  # gt, lt, gte, lte, eq
    value = Column(Float, nullable=False)
    weight = Column(Float, default=1.0)
    action = Column(String(50), default=RuleAction.AUTO_VERIFY.value)
    is_active = Column(Boolean, default=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class KYCFraudAlert(Base):
    __tablename__ = 'kyc_fraud_alerts'
    __table_args__ = (
        Index('idx_kyc_fraud_alerts_document_id', 'document_id'),
        Index('idx_kyc_fraud_alerts_resolved', 'resolved'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(String(50), unique=True, index=True, nullable=False, default=lambda: f"ALERT-{uuid.uuid4().hex[:8].upper()}")
    document_id = Column(Integer, ForeignKey('kyc_documents.id', ondelete="CASCADE"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    
    client_name = Column(String(200), nullable=False)
    fraud_score = Column(Float, default=0.0)
    fraud_level = Column(String(20), default="medium")
    fraud_type = Column(String(50), nullable=False)
    
    # IA Stratégique Alerte KYC Nexum
    ai_logic_explanation = Column(Text, nullable=True) # Vulgarisation de l'anomalie
    ai_investigation_priority = Column(Float, default=0.0) # Priorité 0-1
    ai_suggested_next_steps = Column(JSON, default=list) # Guide pour l'analyste
    last_ai_update = Column(DateTime, default=datetime.utcnow)
    
    detection_method = Column(String(50), nullable=False)
    indicators = Column(JSON, default=list)
    techniques_used = Column(JSON, default=list)
    
    recommendation = Column(Text, nullable=True)
    
    resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    document = relationship("KYCDocument", foreign_keys=[document_id], back_populates="fraud_alerts")
    resolved_by = relationship("User", foreign_keys=[resolved_by_id])


class KYCFraudAnalysis(Base):
    __tablename__ = 'kyc_fraud_analyses'
    __table_args__ = (
        Index('idx_kyc_fraud_analyses_document_id', 'document_id'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(String(50), unique=True, index=True, nullable=False, default=lambda: f"ANALYSIS-{uuid.uuid4().hex[:8].upper()}")
    document_id = Column(Integer, ForeignKey('kyc_documents.id', ondelete="CASCADE"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    
    fraud_score = Column(Float, default=0.0)
    fraud_level = Column(String(20), default="medium")
    fraud_type = Column(String(50), nullable=False)
    
    techniques_used = Column(JSON, default=list)
    detection_method = Column(String(50), nullable=False)
    
    zero_knowledge_analysis = Column(JSON, nullable=True)
    document_forensics = Column(JSON, nullable=True)
    micro_expression_analysis = Column(JSON, nullable=True)
    cross_domain_analysis = Column(JSON, nullable=True)
    
    indicators = Column(JSON, default=list)
    recommendation = Column(Text, nullable=True)
    confidence = Column(Float, default=0.0)
    
    created_at = Column(DateTime, server_default=func.now())
    created_by_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    
    created_by = relationship("User", foreign_keys=[created_by_id])
    document = relationship("KYCDocument", foreign_keys=[document_id], back_populates="fraud_analyses")


# ===== FONCTIONS UTILITAIRES =====
def generate_document_id():
    return f"KYC-{uuid.uuid4().hex[:8].upper()}"

def generate_alert_id():
    return f"ALERT-{uuid.uuid4().hex[:8].upper()}"

def generate_analysis_id():
    return f"ANALYSIS-{uuid.uuid4().hex[:8].upper()}"