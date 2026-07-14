from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class DocumentType(str, Enum):
    CONTRACT = "contrat"
    INVOICE = "facture"
    BANK_STATEMENT = "releve"
    IDENTITY = "identite"
    CERTIFICATE = "certificat"
    REPORT = "rapport"
    OTHER = "autre"

class ProcessingStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

# ===== Document Schemas =====
class DocumentBase(BaseModel):
    filename: str
    document_type: str
    category: Optional[str] = None
    page_count: int = 1
    company_id: Optional[int] = None

class DocumentCreate(DocumentBase):
    file_path: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None

class DocumentUpdate(BaseModel):
    document_type: Optional[str] = None
    category: Optional[str] = None
    processing_status: Optional[str] = None
    extracted_data: Optional[Dict[str, Any]] = None
    confidence_score: Optional[float] = None

class DocumentResponse(DocumentBase):
    id: int
    document_id: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    extracted_text: Optional[str] = None
    extracted_data: Dict[str, Any]
    confidence_score: float
    processing_status: str
    processing_time: Optional[float] = None
    ocr_engine: Optional[str] = None
    ocr_confidence: float
    fields: Dict[str, Any]
    tables: List[Dict[str, Any]]
    signatures: List[Dict[str, Any]]
    uploaded_at: datetime
    processed_at: Optional[datetime] = None
    uploaded_by_id: Optional[int] = None
    
    class Config:
        from_attributes = True

# ===== Template Schemas =====
class OCRTemplateBase(BaseModel):
    template_name: str
    document_type: str
    fields: List[str] = []
    regex_patterns: Dict[str, str] = {}
    coordinates: Dict[str, Any] = {}
    is_active: bool = True

class OCRTemplateCreate(OCRTemplateBase):
    pass

class OCRTemplateUpdate(BaseModel):
    fields: Optional[List[str]] = None
    regex_patterns: Optional[Dict[str, str]] = None
    coordinates: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

class OCRTemplateResponse(OCRTemplateBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# ===== Stats Schemas =====
class DocumentStatsResponse(BaseModel):
    total_processed: int
    success_rate: float
    avg_time: str
    documents_today: int
    by_type: Dict[str, int]
    by_status: Dict[str, int]
    recent_documents: List[Dict[str, Any]]
    confidence_distribution: Dict[str, int]
    processing_trend: List[Dict[str, Any]]