from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class DocumentBase(BaseModel):
    filename: str
    document_type: Optional[str] = None
    language: Optional[str] = "fra"

class DocumentCreate(DocumentBase):
    pass

class DocumentUpdate(BaseModel):
    status: Optional[str] = None
    ocr_text: Optional[str] = None
    extracted_data: Optional[Dict[str, Any]] = None

class DocumentResponse(DocumentBase):
    id: int
    original_filename: str
    file_size: int
    mime_type: Optional[str]
    ocr_text: Optional[str]
    ocr_confidence: float
    extracted_data: Optional[Dict[str, Any]]
    status: str
    page_count: int
    created_at: datetime
    processed_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class OCRRequest(BaseModel):
    document_id: int
    language: Optional[str] = "fra"
    extract_structured: Optional[bool] = True

class OCRResponse(BaseModel):
    document_id: int
    text: str
    confidence: float
    extracted_data: Dict[str, Any]
    processing_time_ms: int

class QRCodeRequest(BaseModel):
    data: str
    size: Optional[int] = 300

class QRCodeResponse(BaseModel):
    qr_code: str  # base64
    format: str = "png"

class BarcodeRequest(BaseModel):
    image: str  # base64
    barcode_type: Optional[str] = "qr"  # qr, code128, ean13, etc.

class BarcodeResponse(BaseModel):
    decoded_data: List[str]
    barcode_type: str
    confidence: float