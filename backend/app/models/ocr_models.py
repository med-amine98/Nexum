# app/models/ocr_models.py
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class OCRDocument(BaseModel):
    id: str
    original_filename: str
    file_path: str
    file_size: int
    document_type: str
    status: str  # pending, processing, processed, failed
    uploaded_at: str
    processed_at: Optional[str] = None
    ocr_confidence: float = 0
    extracted_text: str = ""
    extracted_data: Dict[str, Any] = {}
    fraud_score: float = 0
    fraud_level: str = "none"  # none, low, medium, high, critical
    authenticity_score: float = 0
    manipulated_regions: List[Dict] = []

class OCRDocumentResponse(BaseModel):
    id: str
    original_filename: str
    document_type: str
    status: str
    uploaded_at: str
    ocr_confidence: float
    fraud_level: str

class OCRStats(BaseModel):
    total: int = 0
    processed: int = 0
    pending: int = 0
    failed: int = 0
    avgConfidence: float = 0
    fraudDetected: int = 0

class OCRStatsResponse(BaseModel):
    total: int
    processed: int
    pending: int
    failed: int
    avgConfidence: float
    fraudDetected: int

class OCRRule(BaseModel):
    field_name: str
    pattern: str
    position: Optional[str] = None
    document_type: str = "other"
    is_regex: bool = True

class OCRCorrection(BaseModel):
    document_id: str
    field_name: str
    original_text: str
    corrected_text: str
    validated: bool = False
    document_name: Optional[str] = None