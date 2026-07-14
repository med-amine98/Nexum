# app/schemas/fraud_insurance.py
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

# ===== Claim Schemas =====
class FraudInsuranceClaimBase(BaseModel):
    claim_number: str
    client_name: str
    client_id: Optional[str] = None
    policy_number: Optional[str] = None
    claim_type: str
    amount: float
    currency: str = "EUR"
    incident_date: datetime
    filing_date: datetime
    company_id: Optional[int] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True

class FraudInsuranceClaimCreate(FraudInsuranceClaimBase):
    pass

class FraudInsuranceClaimUpdate(BaseModel):
    status: Optional[str] = None
    risk_level: Optional[str] = None
    investigator_notes: Optional[str] = None
    rejection_reason: Optional[str] = None

    class Config:
        from_attributes = True

class FraudInsuranceClaimResponse(FraudInsuranceClaimBase):
    id: int
    claim_id: str
    risk_level: str
    risk_score: float
    fraud_probability: float
    fraud_indicators: List[str]
    suspicious_patterns: List[str]
    detection_rules: List[str]
    status: str
    blocked_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    investigator_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    analyzed_by_id: Optional[int] = None
    
    class Config:
        from_attributes = True

# ===== Indicator Schemas (renommés pour cohérence) =====
class FraudInsuranceIndicatorBase(BaseModel):
    indicator_type: str
    severity: str
    description: str
    score: float = 0.0
    rule_name: Optional[str] = None
    evidence: List[str] = []

    class Config:
        from_attributes = True

class FraudInsuranceIndicatorCreate(FraudInsuranceIndicatorBase):
    claim_id: int

    class Config:
        from_attributes = True

class FraudInsuranceIndicatorResponse(FraudInsuranceIndicatorBase):
    id: int
    claim_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# ===== Rule Schemas =====
class FraudInsuranceRuleBase(BaseModel):
    rule_name: str
    rule_description: Optional[str] = None
    rule_category: str
    claim_type: Optional[str] = "all"
    parameters: Dict[str, Any] = {}
    threshold: float
    weight: float = 1.0
    is_active: bool = True
    priority: int = 0

    class Config:
        from_attributes = True

class FraudInsuranceRuleCreate(FraudInsuranceRuleBase):
    pass

class FraudInsuranceRuleUpdate(BaseModel):
    rule_description: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    threshold: Optional[float] = None
    weight: Optional[float] = None
    is_active: Optional[bool] = None
    priority: Optional[int] = None

    class Config:
        from_attributes = True

class FraudInsuranceRuleResponse(FraudInsuranceRuleBase):
    id: int
    created_by_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# ===== Network Schemas =====
class FraudInsuranceNetworkBase(BaseModel):
    network_name: str
    members: List[str] = []
    claims: List[int] = []
    patterns: List[str] = []
    connections: List[Dict[str, Any]] = []

    class Config:
        from_attributes = True

class FraudInsuranceNetworkCreate(FraudInsuranceNetworkBase):
    pass

class FraudInsuranceNetworkResponse(FraudInsuranceNetworkBase):
    id: int
    risk_score: float
    total_amount: float
    member_count: int
    detected_at: datetime
    resolved_at: Optional[datetime] = None
    analyzed_by_id: Optional[int] = None
    
    class Config:
        from_attributes = True

# ===== Dashboard Stats =====
class FraudInsuranceStatsResponse(BaseModel):
    total_detected: int
    blocked: int
    investigating: int
    false_positive: int
    amount_saved: float
    suspicious_rate: float
    by_claim_type: Dict[str, int]
    by_risk_level: Dict[str, int]
    recent_alerts: List[Dict[str, Any]]
    monthly_trend: List[Dict[str, Any]]
    active_rules: int
    fraud_networks: int

    class Config:
        from_attributes = True