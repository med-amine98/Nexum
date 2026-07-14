# app/models/aml.py
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text, JSON, Enum, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum
from app.database import Base

class FraudTechnique(str, enum.Enum):
    SMURFING = "smurfing"
    MONEY_LAUNDERING = "money_laundering"
    MONEY_MULES = "money_mules"
    CROSS_BORDER = "cross_border"
    OTHER = "other"

class RiskLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class AMLStatus(str, enum.Enum):
    PENDING = "pending"
    REVIEW = "review"
    REPORTED = "reported"
    CLEARED = "cleared"

class PEPStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    UNDER_REVIEW = "under_review"

class WatchlistType(str, enum.Enum):
    INDIVIDUAL = "individual"
    ORGANIZATION = "organization"
    COUNTRY = "country"

class DeclarationStatus(str, enum.Enum):
    PENDING = "pending"
    SUBMITTED = "submitted"
    ACKNOWLEDGED = "acknowledged"
    REJECTED = "rejected"

# ========== MODÈLE TRANSACTIONS AML ==========
class AMLTransaction(Base):
    __tablename__ = "aml_transactions"
    __table_args__ = (
        Index('idx_aml_transactions_risk_level', 'risk_level'),
        Index('idx_aml_transactions_status', 'status'),
        Index('idx_aml_transactions_date', 'transaction_date'),
        Index('idx_aml_transactions_country', 'country'),
        Index('idx_aml_transactions_client', 'client_name'),
        {'extend_existing': True}
    )

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(String(50), unique=True, index=True, nullable=False)
    client_name = Column(String(200), nullable=False)
    client_id = Column(String(50), index=True, nullable=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(3), default="EUR")
    country = Column(String(100), nullable=False)
    beneficiary = Column(String(200), nullable=True)
    beneficiary_account = Column(String(50), nullable=True)
    risk_level = Column(Enum(RiskLevel), default=RiskLevel.LOW)
    status = Column(Enum(AMLStatus), default=AMLStatus.PENDING)
    fraud_technique = Column(Enum(FraudTechnique), nullable=True)
    detection_score = Column(Float, default=0.0)
    
    # Indicateurs AML
    indicators = Column(JSON, default=list)
    suspicious_patterns = Column(JSON, default=list)
    
    # Données pour analyses avancées
    from_address = Column(String(100), nullable=True)
    to_address = Column(String(100), nullable=True)
    transaction_hash = Column(String(100), nullable=True)
    ip_address = Column(String(45), nullable=True)
    device_id = Column(String(255), nullable=True)
    
    # Dates
    transaction_date = Column(DateTime, nullable=False)
    detection_date = Column(DateTime, server_default=func.now())
    reporting_date = Column(DateTime, nullable=True)
    
    # Conformité
    reported_to_tracfin = Column(Boolean, default=False)
    report_reference = Column(String(100), nullable=True)
    
    # Notes
    reason = Column(Text, nullable=True)
    analyst_notes = Column(Text, nullable=True)
    
    # Relations
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    company = relationship("Company", foreign_keys=[company_id])
    
    # IA Stratégique AML Nexum (Elena & James)
    ai_laundering_probability = Column(Float, default=0.0) # Risque de blanchiment 0-1
    ai_network_analysis = Column(JSON, default=dict) # Analyse de graphe/réseau
    ai_smurfing_score = Column(Float, default=0.0) # Détection de fractionnement
    ai_behavioral_anomaly = Column(Float, default=0.0) # Écart par rapport au profil habituel
    ai_insights = Column(JSON, default=dict) # Synthèse stratégique IA
    last_ai_update = Column(DateTime, default=datetime.utcnow)
    
    processed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    processed_by = relationship("User", foreign_keys=[processed_by_id])
    
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by = relationship("User", foreign_keys=[created_by_id])
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    alerts = relationship("AMLAlert", back_populates="transaction", cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            "id": self.id,
            "transaction_id": self.transaction_id,
            "company_id": self.company_id,
            "client_name": self.client_name,
            "client_id": self.client_id,
            "amount": self.amount,
            "currency": self.currency,
            "country": self.country,
            "beneficiary": self.beneficiary,
            "risk_level": self.risk_level.value if hasattr(self.risk_level, 'value') else str(self.risk_level),
            "status": self.status.value if hasattr(self.status, 'value') else str(self.status),
            "fraud_technique": self.fraud_technique.value if self.fraud_technique and hasattr(self.fraud_technique, 'value') else str(self.fraud_technique) if self.fraud_technique else None,
            "detection_score": self.detection_score,
            "ai_laundering_probability": self.ai_laundering_probability,
            "ai_insights": self.ai_insights,
            "indicators": self.indicators or [],
            "suspicious_patterns": self.suspicious_patterns or [],
            "reported_to_tracfin": self.reported_to_tracfin,
            "report_reference": self.report_reference,
            "reason": self.reason,
            "transaction_date": self.transaction_date.isoformat() if self.transaction_date else None,
            "detection_date": self.detection_date.isoformat() if self.detection_date else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "created_by": self.created_by.name if self.created_by else None
        }


# ========== MODÈLE ALERTES AML ==========
class AMLAlert(Base):
    __tablename__ = "aml_alerts"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer, ForeignKey("aml_transactions.id", ondelete="CASCADE"))
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    alert_type = Column(String(100), nullable=False)
    severity = Column(Enum(RiskLevel), default=RiskLevel.MEDIUM)
    description = Column(Text, nullable=False)
    
    # IA Stratégique Alerte Nexum
    ai_false_positive_probability = Column(Float, default=0.0) # 0-1
    ai_priority_score = Column(Float, default=0.0) # 0-1
    ai_logic_explanation = Column(Text, nullable=True) # Explication IA en langage naturel
    ai_suggested_action = Column(String(200), nullable=True) # Recommandation immédiate
    
    rule_name = Column(String(200), nullable=True)
    rule_score = Column(Float, default=0.0)
    created_at = Column(DateTime, server_default=func.now())
    resolved_at = Column(DateTime, nullable=True)
    
    resolved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolved_by = relationship("User", foreign_keys=[resolved_by_id])
    
    transaction = relationship("AMLTransaction", back_populates="alerts")
    
    def to_dict(self):
        return {
            "id": self.id,
            "transaction_id": self.transaction_id,
            "alert_type": self.alert_type,
            "severity": self.severity.value if hasattr(self.severity, 'value') else str(self.severity),
            "description": self.description,
            "rule_name": self.rule_name,
            "rule_score": self.rule_score,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None
        }


# app/models/aml.py - Ajouter company_id aux classes

# ========== MODÈLE PEP (Personnes Politiquement Exposées) ==========
class AML_PEP(Base):
    __tablename__ = "aml_pep"
    __table_args__ = (
        Index('idx_aml_pep_company_id', 'company_id'),  # ← AJOUTER
        {'extend_existing': True}
    )

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(200), nullable=False, index=True)
    country = Column(String(100), nullable=False)
    position = Column(String(200), nullable=True)
    source_of_funds = Column(Text, nullable=True)
    status = Column(Enum(PEPStatus), default=PEPStatus.ACTIVE)
    notes = Column(Text, nullable=True)
    
    # ✅ AJOUTER company_id
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by = relationship("User", foreign_keys=[created_by_id])
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    def to_dict(self):
        return {
            "id": self.id,
            "full_name": self.full_name,
            "country": self.country,
            "position": self.position,
            "source_of_funds": self.source_of_funds,
            "status": self.status.value if hasattr(self.status, 'value') else str(self.status),
            "notes": self.notes,
            "company_id": self.company_id,  # ← AJOUTER
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "created_by": self.created_by.name if self.created_by else None
        }


# ========== MODÈLE LISTE DE SURVEILLANCE ==========
class AML_Watchlist(Base):
    __tablename__ = "aml_watchlist"
    __table_args__ = (
        Index('idx_aml_watchlist_company_id', 'company_id'),  # ← AJOUTER
        {'extend_existing': True}
    )

    id = Column(Integer, primary_key=True, index=True)
    entity_name = Column(String(200), nullable=False, index=True)
    entity_type = Column(Enum(WatchlistType), default=WatchlistType.INDIVIDUAL)
    country = Column(String(100), nullable=False)
    risk_level = Column(Enum(RiskLevel), default=RiskLevel.HIGH)
    reason = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    
    # ✅ AJOUTER company_id
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by = relationship("User", foreign_keys=[created_by_id])
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    def to_dict(self):
        return {
            "id": self.id,
            "entity_name": self.entity_name,
            "entity_type": self.entity_type.value if hasattr(self.entity_type, 'value') else str(self.entity_type),
            "country": self.country,
            "risk_level": self.risk_level.value if hasattr(self.risk_level, 'value') else str(self.risk_level),
            "reason": self.reason,
            "is_active": self.is_active,
            "company_id": self.company_id,  # ← AJOUTER
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "created_by": self.created_by.name if self.created_by else None
        }


# ========== MODÈLE DÉCLARATIONS TRACFIN ==========
class AML_Declaration(Base):
    __tablename__ = "aml_declarations"
    __table_args__ = (
        Index('idx_aml_declarations_company_id', 'company_id'),  # ← AJOUTER
        {'extend_existing': True}
    )

    id = Column(Integer, primary_key=True, index=True)
    reference = Column(String(100), unique=True, nullable=False, index=True)
    transaction_id = Column(Integer, ForeignKey("aml_transactions.id"), nullable=False)
    analysis_report = Column(Text, nullable=False)
    decision = Column(String(20), default="pending")
    status = Column(Enum(DeclarationStatus), default=DeclarationStatus.PENDING)
    notes = Column(Text, nullable=True)
    acknowledgment_ref = Column(String(100), nullable=True)
    
    # ✅ AJOUTER company_id
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    
    declared_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    declared_by = relationship("User", foreign_keys=[declared_by_id])
    
    declared_at = Column(DateTime, server_default=func.now())
    acknowledged_at = Column(DateTime, nullable=True)
    
    transaction = relationship("AMLTransaction", foreign_keys=[transaction_id])
    
    def to_dict(self):
        return {
            "id": self.id,
            "reference": self.reference,
            "transaction_id": self.transaction_id,
            "analysis_report": self.analysis_report,
            "decision": self.decision,
            "status": self.status.value if hasattr(self.status, 'value') else str(self.status),
            "notes": self.notes,
            "acknowledgment_ref": self.acknowledgment_ref,
            "company_id": self.company_id,  # ← AJOUTER
            "declared_by": self.declared_by.name if self.declared_by else None,
            "declared_at": self.declared_at.isoformat() if self.declared_at else None,
            "acknowledged_at": self.acknowledged_at.isoformat() if self.acknowledged_at else None
        }
    
    
# ========== MODÈLE CONFIGURATION AML ==========
class AMLConfig(Base):
    __tablename__ = "aml_config"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    rule_name = Column(String(200), unique=True, nullable=False)
    rule_description = Column(Text)
    rule_type = Column(String(50), nullable=False)
    parameters = Column(JSON, default=dict)
    threshold = Column(Float, nullable=False)
    risk_score = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by = relationship("User", foreign_keys=[created_by_id], primaryjoin="AMLConfig.created_by_id == User.id")
    
    updated_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by = relationship("User", foreign_keys=[updated_by_id], primaryjoin="AMLConfig.updated_by_id == User.id")
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    def to_dict(self):
        return {
            "id": self.id,
            "rule_name": self.rule_name,
            "rule_description": self.rule_description,
            "rule_type": self.rule_type,
            "threshold": self.threshold,
            "risk_score": self.risk_score,
            "is_active": self.is_active,
            "parameters": self.parameters
        }


# ========== MODÈLE STATISTIQUES RISQUES PAR PAYS ==========
class AMLRiskLocation(Base):
    __tablename__ = "aml_risk_locations"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    country = Column(String(100), unique=True, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    risk_level = Column(Enum(RiskLevel), default=RiskLevel.MEDIUM)
    transaction_count = Column(Integer, default=0)
    total_amount = Column(Float, default=0.0)
    last_alert = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, onupdate=func.now())
    
    def to_dict(self):
        return {
            "id": self.id,
            "country": self.country,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "risk_level": self.risk_level.value if hasattr(self.risk_level, 'value') else str(self.risk_level),
            "transaction_count": self.transaction_count,
            "total_amount": self.total_amount,
            "last_alert": self.last_alert.isoformat() if self.last_alert else None
        }
# app/models/aml.py (ajoutez cette classe)

class AMLReport(Base):
    __tablename__ = "aml_reports"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    report_reference = Column(String(100), unique=True, nullable=False)
    report_date = Column(DateTime, server_default=func.now())
    report_type = Column(String(50), default="tracfin")
    transaction_ids = Column(JSON, default=list)
    total_amount = Column(Float, default=0.0)
    risk_summary = Column(JSON, default=dict)
    status = Column(String(20), default="submitted")
    acknowledgment_ref = Column(String(100), nullable=True)
    
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    company = relationship("Company", foreign_keys=[company_id])
    
    submitted_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    submitted_by = relationship("User", foreign_keys=[submitted_by_id])
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    def to_dict(self):
        return {
            "id": self.id,
            "report_reference": self.report_reference,
            "report_date": self.report_date.isoformat() if self.report_date else None,
            "report_type": self.report_type,
            "transaction_ids": self.transaction_ids or [],
            "total_amount": self.total_amount,
            "risk_summary": self.risk_summary or {},
            "status": self.status,
            "acknowledgment_ref": self.acknowledgment_ref,
            "submitted_by": self.submitted_by.name if self.submitted_by else None,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

# Models AML loaded