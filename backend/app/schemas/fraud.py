from pydantic import BaseModel, validator, Field
from typing import Optional, List, Dict, Any, Union
from datetime import datetime

# ================== ALERT SCHEMAS (CORRIGÉS) ==================

class FraudAlertBase(BaseModel):
    transaction_id: str
    amount: float
    risk_score: float
    status: str = "détecté"
    reason: str
    
    transaction_date: Optional[datetime] = None
    # Changer le type de customer_id pour accepter string OU int
    customer_id: Optional[Union[str, int]] = None
    customer_email: Optional[str] = None
    payment_method: Optional[str] = None
    ip_address: Optional[str] = None
    location: Optional[str] = None

    @validator('customer_id', pre=True)
    def validate_customer_id(cls, v):
        """Convertit les customer_id en string pour uniformité"""
        if v is None:
            return None
        # Si c'est déjà une string, la retourner
        if isinstance(v, str):
            return v
        # Si c'est un entier, le convertir en string
        if isinstance(v, int):
            return str(v)
        # Pour tout autre type, retourner None ou une string
        return str(v) if v is not None else None

class FraudAlertCreate(FraudAlertBase):
    amount_velocity: Optional[float] = 0.0
    location_risk: Optional[float] = 0.0
    device_risk: Optional[float] = 0.0
    behavioral_risk: Optional[float] = 0.0

class FraudAlertUpdate(BaseModel):
    status: Optional[str] = None
    is_resolved: Optional[bool] = None
    resolution_notes: Optional[str] = None
    resolved_by: Optional[int] = None

class FraudAlertInDB(FraudAlertBase):
    id: int
    amount_velocity: Optional[float] = 0.0
    location_risk: Optional[float] = 0.0
    device_risk: Optional[float] = 0.0
    behavioral_risk: Optional[float] = 0.0
    is_resolved: bool
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    @validator('amount_velocity', 'location_risk', 'device_risk', 'behavioral_risk', pre=True)
    def convert_none_to_zero(cls, v):
        """Convertit None en 0.0 pour les champs float"""
        if v is None:
            return 0.0
        return v
    
    class Config:
        from_attributes = True

# ================== RULE SCHEMAS ==================

class FraudRuleBase(BaseModel):
    name: str
    description: Optional[str] = None
    rule_type: str
    condition: Union[Dict[str, Any], str]
    threshold: float
    risk_contribution: float = 10.0
    priority: int = Field(1, ge=1, le=5)

    @validator('condition', pre=True)
    def validate_condition(cls, v):
        """Valide et convertit la condition si nécessaire"""
        if v is None:
            return {"expression": "", "type": "empty"}
        if isinstance(v, dict):
            return v
        if isinstance(v, str):
            try:
                import json
                parsed = json.loads(v)
                if isinstance(parsed, dict):
                    return parsed
                return {"expression": v, "type": "simple", "value": parsed}
            except:
                return {"expression": v, "type": "simple"}
        return {"expression": str(v), "type": "unknown"}

class FraudRuleCreate(FraudRuleBase):
    is_active: bool = True

class FraudRuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    rule_type: Optional[str] = None
    condition: Optional[Union[Dict[str, Any], str]] = None
    threshold: Optional[float] = None
    risk_contribution: Optional[float] = None
    is_active: Optional[bool] = None
    priority: Optional[int] = Field(None, ge=1, le=5)

class FraudRuleInDB(FraudRuleBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# ================== CASE SCHEMAS ==================

class FraudCaseBase(BaseModel):
    case_number: str
    title: str
    description: Optional[str] = None
    severity: str = "moyen"
    status: str = "ouvert"
    # Si assigned_to est aussi un identifiant utilisateur, le changer aussi
    assigned_to: Optional[Union[str, int]] = None

    @validator('assigned_to', pre=True)
    def validate_assigned_to(cls, v):
        """Convertit les assigned_to en string si nécessaire"""
        if v is None:
            return None
        if isinstance(v, str):
            return v
        if isinstance(v, int):
            return str(v)
        return str(v) if v is not None else None

class FraudCaseCreate(FraudCaseBase):
    alert_ids: Optional[List[int]] = None

class FraudCaseUpdate(BaseModel):
    status: Optional[str] = None
    severity: Optional[str] = None
    assigned_to: Optional[Union[str, int]] = None
    investigation_notes: Optional[str] = None
    resolution_type: Optional[str] = None

class FraudCaseInDB(FraudCaseBase):
    id: int
    alert_ids: Optional[List[int]] = None
    investigation_notes: Optional[str] = None
    resolved_at: Optional[datetime] = None
    resolution_type: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# ================== STATISTICS SCHEMAS ==================

class FraudStats(BaseModel):
    total_alerts: int
    critical_alerts: int
    high_alerts: int
    medium_alerts: int
    low_alerts: int
    resolved_alerts: int
    avg_risk_score: float
    total_transactions_analyzed: int
    saved_amount: float

# ================== DASHBOARD SCHEMAS ==================

class FraudDashboard(BaseModel):
    alerts: List[FraudAlertInDB]
    stats: FraudStats
    rules: List[FraudRuleInDB]
    recent_cases: List[FraudCaseInDB]