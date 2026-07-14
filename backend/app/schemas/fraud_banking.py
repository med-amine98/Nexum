from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

# ===== Transaction Schemas =====
class FraudTransactionBase(BaseModel):
    transaction_id: str
    amount: float
    currency: str = "EUR"
    client_name: str
    client_id: Optional[str] = None
    account_number: Optional[str] = None
    location: str
    ip_address: Optional[str] = None
    device_id: Optional[str] = None
    transaction_date: datetime
    notes: Optional[str] = None
    company_id: Optional[int] = None

    class Config:
        from_attributes = True

class FraudTransactionCreate(FraudTransactionBase):
    pass

class FraudTransactionUpdate(BaseModel):
    risk_level: Optional[str] = None
    status: Optional[str] = None
    analyst_notes: Optional[str] = None
    blocked_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class FraudTransactionResponse(FraudTransactionBase):
    id: int
    risk_level: str
    risk_score: float
    fraud_probability: float
    fraud_indicators: List[str]
    suspicious_patterns: List[str]
    status: str
    detection_date: datetime
    blocked_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    analyst_notes: Optional[str] = None
    analyzed_by_id: Optional[int] = None
    
    class Config:
        from_attributes = True

# ===== Alert Schemas (NOUVEAUX NOMS) =====
class FraudBankingAlertBase(BaseModel):
    alert_type: str
    severity: str
    description: str
    rule_name: Optional[str] = None
    rule_score: float = 0.0

    class Config:
        from_attributes = True

class FraudBankingAlertCreate(FraudBankingAlertBase):
    transaction_id: int

    class Config:
        from_attributes = True

class FraudBankingAlertResponse(FraudBankingAlertBase):
    id: int
    transaction_id: int
    triggered_at: datetime
    resolved_at: Optional[datetime] = None
    resolved_by_user_id: Optional[int] = None
    
    class Config:
        from_attributes = True

# ===== Rule Schemas (NOUVEAUX NOMS) =====
class FraudBankingRuleBase(BaseModel):
    rule_name: str
    rule_description: Optional[str] = None
    rule_type: str
    parameters: Dict[str, Any] = {}
    threshold: float
    risk_score: float = 0.0
    is_active: bool = True
    priority: int = 0

    class Config:
        from_attributes = True

class FraudBankingRuleCreate(FraudBankingRuleBase):
    pass

class FraudBankingRuleUpdate(BaseModel):
    rule_description: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    threshold: Optional[float] = None
    risk_score: Optional[float] = None
    is_active: Optional[bool] = None
    priority: Optional[int] = None

    class Config:
        from_attributes = True

class FraudBankingRuleResponse(FraudBankingRuleBase):
    id: int
    created_by_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# ===== Stats Schemas =====
class FraudStatsResponse(BaseModel):
    total_detected: int
    blocked: int
    investigating: int
    false_positive: int
    amount_saved: float
    risk_distribution: Dict[str, int]
    recent_alerts: List[Dict[str, Any]]
    hourly_activity: List[Dict[str, Any]]
    top_locations: List[Dict[str, Any]]

    class Config:
        from_attributes = True