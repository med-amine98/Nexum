# app/models/document_intelligence.py
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Enum, JSON, Boolean, Index, func
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
import uuid
from app.database import Base

# ===== ÉNUMÉRATIONS =====
class DocumentIntelligenceStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    VALIDATED = "validated"
    CORRECTED = "corrected"

# app/models/document_intelligence.py
# Modifiez la classe DocumentIntelligenceType
# app/models/document_intelligence.py
# Version simplifiée avec une seule valeur par défaut
# app/models/document_intelligence.py
# Version finale avec "other" comme valeur par défaut

class DocumentIntelligenceType(str, enum.Enum):
    CONTRACT = "contrat"
    INVOICE = "facture"
    STATEMENT = "releve"
    IDENTITY = "identite"
    CERTIFICATE = "certificat"
    OTHER = "other"  # ← Garder "other"
    AUTRE = "autre" 
    @classmethod
    def _missing_(cls, value):
        """Gère les valeurs manquantes et les alias"""
        if isinstance(value, str):
            value_lower = value.lower()
            # Mapping des alias
            mapping = {
                "contrat": cls.CONTRACT,
                "contract": cls.CONTRACT,
                "facture": cls.INVOICE,
                "invoice": cls.INVOICE,
                "releve": cls.STATEMENT,
                "statement": cls.STATEMENT,
                "identite": cls.IDENTITY,
                "identity": cls.IDENTITY,
                "id_card": cls.IDENTITY,
                "certificat": cls.CERTIFICATE,
                "certificate": cls.CERTIFICATE,
                "other": cls.OTHER,
                "autre": cls.OTHER  # ← Mapper "autre" vers "other"
            }
            for member in cls:
                if member.value.lower() == value_lower:
                    return member
        return super()._missing_(value)




class ProcessingStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    VALIDATED = "validated"
    CORRECTED = "corrected"

class OCRTemplateType(str, enum.Enum):
    INVOICE = "invoice"
    RECEIPT = "receipt"
    CONTRACT = "contract"
    ID_CARD = "id_card"
    PASSPORT = "passport"
    CUSTOM = "custom"

class ProcessingQueueStatus(str, enum.Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class FraudRiskLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class FraudType(str, enum.Enum):
    FORGED_DOCUMENTS = "forged_documents"
    FRAUDULENT_CONTRACTS = "fraudulent_contracts"
    IDENTITY_THEFT = "identity_theft"
    DATA_INCONSISTENCY = "data_inconsistency"
    NONE = "none"

class DetectionMethod(str, enum.Enum):
    BERT_ROBERTA = "bert_roberta"
    COMPUTER_VISION = "computer_vision"
    MULTIMODAL = "multimodal_learning"
    DOCUMENT_FORENSICS = "document_forensics"
    TRADITIONAL = "traditional"

class TemplateFieldType(str, enum.Enum):
    TEXT = "text"
    NUMBER = "number"
    DATE = "date"
    AMOUNT = "amount"

# ===== MODÈLE PRINCIPAL =====
class DocumentIntelligence(Base):
    __tablename__ = 'document_intelligence'
    __table_args__ = (
        Index('idx_doc_intelligence_status', 'status'),
        Index('idx_doc_intelligence_fraud_risk', 'fraud_risk'),
        Index('idx_doc_intelligence_uploaded_at', 'uploaded_at'),
        Index('idx_doc_intelligence_extraction_accuracy', 'extraction_accuracy'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(String(100), unique=True, index=True, nullable=False, default=lambda: f"DOC-{uuid.uuid4().hex[:8].upper()}")
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    
    # OCR et extraction
    ocr_text = Column(Text, nullable=True)
    ocr_confidence = Column(Float, default=0.0)
    extracted_data = Column(JSON, nullable=True)
    extracted_text = Column(Text, nullable=True)
    confidence_score = Column(Float, default=0.0)
    quality_score = Column(Float, default=0.0)
    extraction_accuracy = Column(Float, default=0.0)
    
    # Métadonnées
    document_type = Column(Enum(DocumentIntelligenceType), default=DocumentIntelligenceType.OTHER)
    status = Column(Enum(DocumentIntelligenceStatus), default=DocumentIntelligenceStatus.PENDING)
    processing_status = Column(Enum(ProcessingStatus), default=ProcessingStatus.PENDING)
    page_count = Column(Integer, default=0)
    processing_time = Column(Float, default=0.0)
    ocr_engine = Column(String(50), default="easyocr")
    
    # Détection de qualité d'image
    blur_detected = Column(Boolean, default=False)
    glare_detected = Column(Boolean, default=False)
    forged_detected = Column(Boolean, default=False)
    tampering_detected = Column(Boolean, default=False)
    compression_artifacts = Column(Float, default=0.0)
    
    # Détection de fraude
    fraud_risk = Column(Enum(FraudRiskLevel), default=FraudRiskLevel.LOW)
    fraud_score = Column(Float, default=0.0)
    fraud_type = Column(Enum(FraudType), default=FraudType.NONE)
    fraud_indicators = Column(JSON, default=list)
    detection_method = Column(Enum(DetectionMethod), default=DetectionMethod.TRADITIONAL)
    
    # Analyse avancée
    bert_roberta_analysis = Column(JSON, nullable=True)
    computer_vision_analysis = Column(JSON, nullable=True)
    multimodal_analysis = Column(JSON, nullable=True)
    document_forensics = Column(JSON, nullable=True)
    
    # IA Stratégique Documentaire Nexum (Elena & Sophie)
    ai_semantic_analysis = Column(JSON, default=dict) # Compréhension du sens
    ai_key_insights = Column(JSON, default=dict) # Points clés extraits
    ai_suggested_workflow = Column(String(100), nullable=True) # Étape ERP suivante
    ai_sentiment_score = Column(Float, default=0.0) # Ton du document
    ai_insights = Column(JSON, default=dict) # Analyse stratégique globale
    last_ai_update = Column(DateTime, default=datetime.utcnow)
    
    # Validation et correction
    validated_data = Column(JSON, nullable=True)
    corrected_data = Column(JSON, nullable=True)
    validation_notes = Column(Text, nullable=True)
    correction_notes = Column(Text, nullable=True)
    validated_by_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    corrected_by_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    
    # Dates
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    validated_at = Column(DateTime, nullable=True)
    corrected_at = Column(DateTime, nullable=True)
    
    # Relations
    company_id = Column(Integer, ForeignKey('companies.id'), nullable=False, index=True)
    uploaded_by_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id], primaryjoin="DocumentIntelligence.uploaded_by_id == User.id")
    validated_by = relationship("User", foreign_keys=[validated_by_id])
    corrected_by = relationship("User", foreign_keys=[corrected_by_id])
    company = relationship("Company", foreign_keys=[company_id])
    queue_items = relationship("ProcessingQueue", back_populates="document_intelligence", cascade="all, delete-orphan")
    fraud_alerts = relationship("DocumentIntelligenceFraudAlert", back_populates="document_intelligence", cascade="all, delete-orphan")
    fields_extracted = relationship("DocumentIntelligenceField", back_populates="document_intelligence", cascade="all, delete-orphan")
    tables_extracted = relationship("DocumentIntelligenceTable", back_populates="document_intelligence", cascade="all, delete-orphan")
    signatures_extracted = relationship("DocumentIntelligenceSignature", back_populates="document_intelligence", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<DocumentIntelligence(id={self.id}, filename='{self.filename}', fraud_risk='{self.fraud_risk}')>"
    
    def to_dict(self):
        return {
            "id": self.id,
            "document_id": self.document_id,
            "filename": self.filename,
            "document_type": self.document_type.value if hasattr(self.document_type, 'value') else str(self.document_type),
            "confidence_score": self.confidence_score,
            "extraction_accuracy": self.extraction_accuracy,
            "fraud_risk": self.fraud_risk.value if hasattr(self.fraud_risk, 'value') else str(self.fraud_risk),
            "fraud_score": self.fraud_score,
            "processing_status": self.processing_status.value if hasattr(self.processing_status, 'value') else str(self.processing_status),
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
            "extracted_data": self.extracted_data,
            "fraud_indicators": self.fraud_indicators,
            "validated_data": self.validated_data,
            "corrected_data": self.corrected_data,
            "blur_detected": self.blur_detected,
            "glare_detected": self.glare_detected,
            "forged_detected": self.forged_detected,
            "quality_score": self.quality_score
        }


# ===== MODÈLES POUR LES DONNÉES EXTRAITES =====
class DocumentIntelligenceField(Base):
    __tablename__ = 'document_intelligence_fields'
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey('document_intelligence.id', ondelete="CASCADE"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    field_name = Column(String(100), nullable=False)
    field_value = Column(Text, nullable=True)
    confidence = Column(Float, default=0.0)
    page_number = Column(Integer, nullable=True)
    bounding_box = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    document_intelligence = relationship("DocumentIntelligence", foreign_keys=[document_id], back_populates="fields_extracted")


class DocumentIntelligenceTable(Base):
    __tablename__ = 'document_intelligence_tables'
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey('document_intelligence.id', ondelete="CASCADE"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    table_index = Column(Integer, default=0)
    headers = Column(JSON, nullable=True)
    rows = Column(JSON, nullable=True)
    confidence = Column(Float, default=0.0)
    page_number = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    document_intelligence = relationship("DocumentIntelligence", foreign_keys=[document_id], back_populates="tables_extracted")


class DocumentIntelligenceSignature(Base):
    __tablename__ = 'document_intelligence_signatures'
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey('document_intelligence.id', ondelete="CASCADE"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    signature_type = Column(String(50), nullable=True)
    page_number = Column(Integer, nullable=True)
    bounding_box = Column(JSON, nullable=True)
    confidence = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    document_intelligence = relationship("DocumentIntelligence", foreign_keys=[document_id], back_populates="signatures_extracted")


# ===== MODÈLE POUR LES ALERTES DE FRAUDE =====
class DocumentIntelligenceFraudAlert(Base):
    __tablename__ = 'document_intelligence_fraud_alerts'
    __table_args__ = (
        Index('idx_doc_intel_fraud_alerts_document_id', 'document_id'),
        Index('idx_doc_intel_fraud_alerts_resolved', 'resolved'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(String(50), unique=True, index=True, nullable=False, default=lambda: f"FRD-{uuid.uuid4().hex[:8].upper()}")
    document_id = Column(Integer, ForeignKey('document_intelligence.id', ondelete="CASCADE"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    
    document_name = Column(String(255), nullable=False)
    fraud_score = Column(Float, default=0.0)
    fraud_level = Column(String(20), default="medium")
    fraud_type = Column(String(50), nullable=False)
    
    # IA Stratégique Alerte Documentaire Nexum
    ai_logic_explanation = Column(Text, nullable=True) # Vulgarisation de l'anomalie
    ai_investigation_priority = Column(Float, default=0.0) # Priorité 0-1
    ai_confidence_score = Column(Float, default=0.0) # Confiance de l'IA
    ai_suggested_investigation_steps = Column(JSON, default=list) # Guide expert
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
    
    document_intelligence = relationship("DocumentIntelligence", foreign_keys=[document_id], back_populates="fraud_alerts")
    resolved_by = relationship("User", foreign_keys=[resolved_by_id])


# ===== MODÈLE POUR LES TEMPLATES =====
class DocumentTemplate(Base):
    __tablename__ = 'document_templates'
    __table_args__ = (
        Index('idx_document_templates_document_type', 'document_type'),
        Index('idx_document_templates_is_active', 'is_active'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(String(50), unique=True, index=True, nullable=False, default=lambda: f"TPL-{uuid.uuid4().hex[:8].upper()}")
    name = Column(String(100), nullable=False)
    document_type = Column(Enum(DocumentIntelligenceType), nullable=False)
    fields = Column(JSON, nullable=False)
    regex_patterns = Column(JSON, nullable=True)
    keywords = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True)
    company_id = Column(Integer, ForeignKey('companies.id'), nullable=False, index=True)
    created_by_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    company = relationship("Company", foreign_keys=[company_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
    
    def to_dict(self):
        return {
            "id": self.id,
            "template_id": self.template_id,
            "name": self.name,
            "document_type": self.document_type.value if hasattr(self.document_type, 'value') else str(self.document_type),
            "fields": self.fields,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class OCRTemplate(Base):
    __tablename__ = 'ocr_templates'
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    template_type = Column(Enum(OCRTemplateType), nullable=False)
    fields = Column(JSON, nullable=False)
    regex_patterns = Column(JSON, nullable=True)
    keywords = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True)
    company_id = Column(Integer, ForeignKey('companies.id'), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    company = relationship("Company", foreign_keys=[company_id])


class ProcessingQueue(Base):
    __tablename__ = 'processing_queue'
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey('document_intelligence.id', ondelete="CASCADE"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    priority = Column(Integer, default=0)
    status = Column(Enum(ProcessingQueueStatus), default=ProcessingQueueStatus.QUEUED)
    retry_count = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    document_intelligence = relationship("DocumentIntelligence", foreign_keys=[document_id], back_populates="queue_items")


# ===== CLASSE STATS =====
class DocumentIntelligenceTypeStats:
    """Classe utilitaire pour les statistiques par type de document"""
    def __init__(self, document_type: str, count: int, avg_confidence: float):
        self.document_type = document_type
        self.count = count
        self.avg_confidence = avg_confidence
    
    def to_dict(self):
        return {
            "document_type": self.document_type,
            "count": self.count,
            "avg_confidence": self.avg_confidence
        }


# ===== FONCTIONS UTILITAIRES =====
def generate_document_id():
    return f"DOC-{uuid.uuid4().hex[:8].upper()}"

def generate_alert_id():
    return f"FRD-{uuid.uuid4().hex[:8].upper()}"

def generate_template_id():
    return f"TPL-{uuid.uuid4().hex[:8].upper()}"

def get_fraud_risk_level(score: float) -> FraudRiskLevel:
    """Détermine le niveau de risque de fraude à partir du score"""
    if score >= 80:
        return FraudRiskLevel.CRITICAL
    elif score >= 60:
        return FraudRiskLevel.HIGH
    elif score >= 40:
        return FraudRiskLevel.MEDIUM
    else:
        return FraudRiskLevel.LOW