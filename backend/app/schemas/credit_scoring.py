from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class CreditStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    REVIEW = "review"

# ===== Credit Request Schemas =====
class CreditRequestBase(BaseModel):
    client_name: str
    client_id: Optional[str] = None
    client_email: Optional[EmailStr] = None
    client_phone: Optional[str] = None
    amount: float
    currency: str = "EUR"
    purpose: Optional[str] = None
    term_months: Optional[int] = None
    monthly_income: Optional[float] = None
    employment_status: Optional[str] = None
    employment_years: Optional[float] = None
    existing_debts: float = 0.0
    company_id: Optional[int] = None

class CreditRequestCreate(CreditRequestBase):
    pass

class CreditRequestUpdate(BaseModel):
    status: Optional[str] = None
    decision_notes: Optional[str] = None
    credit_score: Optional[int] = None
    risk_level: Optional[str] = None

class CreditRequestResponse(CreditRequestBase):
    id: int
    request_id: str
    credit_score: int
    risk_level: str
    approval_probability: float
    risk_factors: List[str]
    scoring_details: Dict[str, Any]
    status: str
    request_date: datetime
    decision_date: Optional[datetime] = None
    decision_notes: Optional[str] = None
    processed_at: Optional[datetime] = None
    analyzed_by_id: Optional[int] = None
    
    class Config:
        from_attributes = True

# ===== Credit History Schemas =====
class CreditHistoryBase(BaseModel):
    client_id: str
    total_requests: int = 0
    approved_requests: int = 0
    rejected_requests: int = 0
    total_amount: float = 0.0
    avg_credit_score: float = 0.0
    late_payments: int = 0
    default_payments: int = 0
    on_time_payments: int = 0

class CreditHistoryResponse(CreditHistoryBase):
    id: int
    last_updated: datetime
    
    class Config:
        from_attributes = True

# ===== Rule Schemas =====
class CreditRuleBase(BaseModel):
    rule_name: str
    rule_description: Optional[str] = None
    min_score: int = 0
    max_score: int = 1000
    weight_income: float = 0.3
    weight_history: float = 0.4
    weight_debt: float = 0.3
    threshold_high_risk: int = 300
    threshold_medium_risk: int = 600
    threshold_low_risk: int = 800
    is_active: bool = True

class CreditRuleCreate(CreditRuleBase):
    pass

class CreditRuleUpdate(BaseModel):
    rule_description: Optional[str] = None
    weight_income: Optional[float] = None
    weight_history: Optional[float] = None
    weight_debt: Optional[float] = None
    threshold_high_risk: Optional[int] = None
    threshold_medium_risk: Optional[int] = None
    threshold_low_risk: Optional[int] = None
    is_active: Optional[bool] = None

class CreditRuleResponse(CreditRuleBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# ===== Stats Schemas =====
class CreditStatsResponse(BaseModel):
    total_requests: int
    approved: int
    rejected: int
    pending: int
    avg_score: float
    high_risk: int
    medium_risk: int
    low_risk: int
    by_score_range: Dict[str, int]
    recent_requests: List[Dict[str, Any]]
    monthly_trend: List[Dict[str, Any]]
    approval_rate: float