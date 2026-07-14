from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class DocumentType(str, Enum):
    PASSPORT = "passeport"
    ID_CARD = "cin"
    DRIVING_LICENSE = "permis"
    RESIDENCE_PERMIT = "titre_sejour"
    OTHER = "autre"

class VerificationStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    REVIEW = "review"
    VERIFIED = "verified"
    REJECTED = "rejected"

# ===== Document Schemas =====
class KYCDocumentBase(BaseModel):
    client_name: str
    client_id: Optional[str] = None
    client_email: Optional[EmailStr] = None
    client_phone: Optional[str] = None
    document_type: str
    document_number: Optional[str] = None
    document_country: Optional[str] = None
    document_expiry: Optional[datetime] = None
    company_id: Optional[int] = None
    notes: Optional[str] = None

class KYCDocumentCreate(KYCDocumentBase):
    pass

class KYCDocumentUpdate(BaseModel):
    status: Optional[str] = None
    verification_status: Optional[str] = None
    confidence_score: Optional[float] = None
    notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    verified_at: Optional[datetime] = None

class KYCDocumentResponse(KYCDocumentBase):
    id: int
    document_id: str
    confidence_score: float
    quality_score: float
    status: str
    verification_status: str
    extracted_data: Dict[str, Any]
    verification_result: Dict[str, Any]
    blur_detected: bool
    glare_detected: bool
    forged_detected: bool
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    submitted_at: datetime
    processed_at: Optional[datetime] = None
    verified_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    processed_by_id: Optional[int] = None
    
    class Config:
        from_attributes = True

# ===== Verification Schemas =====
class KYCVerificationBase(BaseModel):
    verification_type: str
    result: bool
    score: float
    details: Dict[str, Any] = {}

class KYCVerificationCreate(KYCVerificationBase):
    document_id: int

class KYCVerificationResponse(KYCVerificationBase):
    id: int
    document_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# ===== Rule Schemas =====
class KYCRuleBase(BaseModel):
    rule_name: str
    rule_description: Optional[str] = None
    min_confidence: float = 80.0
    require_face_match: bool = True
    require_liveness: bool = False
    accepted_countries: List[str] = []
    is_active: bool = True

class KYCRuleCreate(KYCRuleBase):
    pass

class KYCRuleUpdate(BaseModel):
    rule_description: Optional[str] = None
    min_confidence: Optional[float] = None
    require_face_match: Optional[bool] = None
    require_liveness: Optional[bool] = None
    accepted_countries: Optional[List[str]] = None
    is_active: Optional[bool] = None

class KYCRuleResponse(KYCRuleBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# ===== Stats Schemas =====
class KYCStatsResponse(BaseModel):
    pending: int
    verified: int
    rejected: int
    avg_time: str
    success_rate: float
    by_document_type: Dict[str, int]
    by_status: Dict[str, int]
    recent_documents: List[Dict[str, Any]]
    confidence_distribution: Dict[str, int]