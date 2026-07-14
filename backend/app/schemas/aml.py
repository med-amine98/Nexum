from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# ===== Transaction Schemas =====
class AMLTransactionBase(BaseModel):
    transaction_id: str
    client_name: str
    client_id: Optional[str] = None
    amount: float
    currency: str = "EUR"
    country: str
    transaction_date: datetime
    indicators: List[str] = []
    notes: Optional[str] = None
    company_id: Optional[int] = None

class AMLTransactionCreate(AMLTransactionBase):
    pass

class AMLTransactionUpdate(BaseModel):
    risk_level: Optional[str] = None
    status: Optional[str] = None
    analyst_notes: Optional[str] = None
    reported_to_tracfin: Optional[bool] = None
    report_reference: Optional[str] = None

class AMLTransactionResponse(AMLTransactionBase):
    id: int
    risk_level: str
    status: str
    detection_score: float
    suspicious_patterns: List[str]
    detection_date: datetime
    reporting_date: Optional[datetime] = None
    reported_to_tracfin: bool
    report_reference: Optional[str] = None
    analyst_notes: Optional[str] = None
    processed_by_id: Optional[int] = None
    created_by_id: Optional[int] = None
    
    class Config:
        orm_mode = True

# ===== Alert Schemas =====
class AMLAlertBase(BaseModel):
    alert_type: str
    severity: str
    description: str
    rule_name: Optional[str] = None
    rule_score: float = 0.0

class AMLAlertCreate(AMLAlertBase):
    transaction_id: int

class AMLAlertResponse(AMLAlertBase):
    id: int
    transaction_id: int
    created_at: datetime
    resolved_at: Optional[datetime] = None
    resolved_by_id: Optional[int] = None
    
    class Config:
        orm_mode = True

# ===== Config Schemas =====
class AMLConfigBase(BaseModel):
    rule_name: str
    rule_description: Optional[str] = None
    rule_type: str
    parameters: Dict[str, Any] = {}
    threshold: float
    risk_score: float = 0.0
    is_active: bool = True

class AMLConfigCreate(AMLConfigBase):
    pass

class AMLConfigUpdate(BaseModel):
    rule_description: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    threshold: Optional[float] = None
    risk_score: Optional[float] = None
    is_active: Optional[bool] = None

class AMLConfigResponse(AMLConfigBase):
    id: int
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        orm_mode = True

# ===== Report Schemas =====
class AMLReportBase(BaseModel):
    report_reference: str
    report_type: str = "tracfin"
    transaction_ids: List[int]
    total_amount: float
    risk_summary: Dict[str, Any] = {}
    status: str = "submitted"
    acknowledgment_ref: Optional[str] = None
    company_id: Optional[int] = None

class AMLReportCreate(AMLReportBase):
    submitted_by_id: Optional[int] = None

class AMLReportResponse(AMLReportBase):
    id: int
    report_date: datetime
    submitted_by_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        orm_mode = True

# ===== Dashboard Stats =====
class AMLStatsResponse(BaseModel):
    total_transactions: int
    suspicious_detected: int
    reported: int
    under_review: int
    compliance_rate: float
    risk_distribution: Dict[str, int]
    monthly_trend: List[Dict[str, Any]]
    top_risk_countries: List[Dict[str, Any]]