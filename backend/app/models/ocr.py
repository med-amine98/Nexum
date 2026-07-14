# app/models/ocr.py
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Enum, JSON, Boolean, LargeBinary
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum
from app.database import Base

class DocumentStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    FRAUDULENT = "fraudulent"
    AUTHENTIC = "authentic"

class DocumentType(str, enum.Enum):
    INVOICE = "invoice"
    ID_CARD = "id_card"
    CONTRACT = "contract"
    RECEIPT = "receipt"
    PASSPORT = "passport"
    BANK_STATEMENT = "bank_statement"
    OTHER = "other"

class FraudLevel(str, enum.Enum):
    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class DetectionModel(str, enum.Enum):
    CNN_RESNET = "cnn_resnet"
    EFFICIENTNET = "efficientnet"
    TROCR = "trocr"
    LAYOUTLM = "layoutlm"
    IMAGE_FORENSICS = "image_forensics"
    ENSEMBLE = "ensemble"


# ========== RÈGLES D'EXTRACTION ==========
class ExtractionRule(Base):
    __tablename__ = "ocr_extraction_rules"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    field_name = Column(String(100), nullable=False)
    pattern = Column(String(500), nullable=False)
    position = Column(String(50), nullable=True)
    document_type = Column(Enum(DocumentType), default=DocumentType.OTHER)
    is_regex = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            "id": self.id,
            "field_name": self.field_name,
            "pattern": self.pattern,
            "position": self.position,
            "document_type": self.document_type.value if self.document_type else None,
            "is_regex": self.is_regex,
            "is_active": self.is_active
        }


# ========== DOCUMENTS OCR ==========
class OCRDocument(Base):
    __tablename__ = "ocr_documents"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    document_type = Column(Enum(DocumentType), default=DocumentType.OTHER)
    status = Column(Enum(DocumentStatus), default=DocumentStatus.PENDING)
    
    # OCR résultats
    extracted_text = Column(Text, nullable=True)
    extracted_data = Column(JSON, nullable=True)
    ocr_confidence = Column(Float, default=0.0)
    
    # Détection de fraude
    fraud_score = Column(Float, default=0.0)
    fraud_level = Column(Enum(FraudLevel), default=FraudLevel.NONE)
    forgery_score = Column(Float, default=0.0)
    authenticity_score = Column(Float, default=100.0)
    
    # Analyse détaillée
    manipulated_regions = Column(JSON, nullable=True)
    metadata_analysis = Column(JSON, nullable=True)
    signature_analysis = Column(JSON, nullable=True)
    layout_anomalies = Column(JSON, nullable=True)
    text_inconsistencies = Column(JSON, nullable=True)
    
    # Modèles utilisés
    detection_models = Column(JSON, nullable=True)
    ensemble_results = Column(JSON, nullable=True)
    
    # Timestamps
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    
    user = relationship("User", foreign_keys=[user_id])
    company = relationship("Company", foreign_keys=[company_id])
    
    fraud_alerts = relationship("OCRFraudAlert", back_populates="document", cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.original_filename,
            "filename": self.filename,
            "date": self.uploaded_at.strftime("%d/%m/%Y") if self.uploaded_at else None,
            "size": self.file_size,
            "status": self.status.value if self.status else "pending",
            "type": self.document_type.value if self.document_type else None,
            "confidence": self.ocr_confidence,
            "fraud_score": self.fraud_score,
            "authenticity_score": self.authenticity_score,
            "extracted_data": self.extracted_data,
            "text": self.extracted_text[:500] if self.extracted_text else None
        }


# ========== ALERTES DE FRAUDE ==========
class OCRFraudAlert(Base):
    __tablename__ = "ocr_fraud_alerts"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("ocr_documents.id"), nullable=False)
    alert_type = Column(String(50), nullable=False)
    severity = Column(Enum(FraudLevel), default=FraudLevel.MEDIUM)
    description = Column(Text, nullable=False)
    location = Column(JSON, nullable=True)
    confidence = Column(Float, default=0.0)
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    document = relationship("OCRDocument", back_populates="fraud_alerts")
    
    def to_dict(self):
        return {
            "id": self.id,
            "document_id": self.document_id,
            "alert_type": self.alert_type,
            "severity": self.severity.value if self.severity else None,
            "description": self.description,
            "location": self.location,
            "confidence": self.confidence,
            "is_resolved": self.is_resolved,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


# ========== CORRECTIONS OCR ==========
class OCRCorrection(Base):
    __tablename__ = "ocr_corrections"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("ocr_documents.id"), nullable=False)
    field_name = Column(String(100), nullable=False)
    original_text = Column(Text, nullable=False)
    corrected_text = Column(Text, nullable=False)
    validated = Column(Boolean, default=False)
    validated_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    validated_at = Column(DateTime, nullable=True)
    
    validated_by = relationship("User", foreign_keys=[validated_by_id])
    
    def to_dict(self):
        return {
            "id": self.id,
            "document_id": self.document_id,
            "field_name": self.field_name,
            "original_text": self.original_text,
            "corrected_text": self.corrected_text,
            "validated": self.validated,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


# ========== MÉTRIQUES DES MODÈLES ==========
class DetectionModelMetrics(Base):
    __tablename__ = "ocr_detection_metrics"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(Enum(DetectionModel), nullable=False)
    accuracy = Column(Float, default=0.0)
    precision = Column(Float, default=0.0)
    recall = Column(Float, default=0.0)
    f1_score = Column(Float, default=0.0)
    total_predictions = Column(Integer, default=0)
    true_positives = Column(Integer, default=0)
    false_positives = Column(Integer, default=0)
    false_negatives = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            "id": self.id,
            "model_name": self.model_name.value if self.model_name else None,
            "accuracy": self.accuracy,
            "precision": self.precision,
            "recall": self.recall,
            "f1_score": self.f1_score,
            "total_predictions": self.total_predictions,
            "true_positives": self.true_positives,
            "false_positives": self.false_positives,
            "false_negatives": self.false_negatives
        }


# ========== TEMPLATES DE DOCUMENTS ==========
class DocumentTemplate(Base):
    __tablename__ = "ocr_document_templates"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    document_type = Column(Enum(DocumentType), nullable=False)
    fields = Column(JSON, nullable=False)
    validation_rules = Column(JSON, nullable=True)
    fraud_patterns = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    company = relationship("Company", foreign_keys=[company_id])
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "document_type": self.document_type.value if self.document_type else None,
            "fields": self.fields,
            "validation_rules": self.validation_rules,
            "fraud_patterns": self.fraud_patterns,
            "is_active": self.is_active
        }


# Models OCR loaded