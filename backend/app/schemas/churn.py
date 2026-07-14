from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# ===== Customer Schemas =====
class ChurnCustomerBase(BaseModel):
    customer_id: str
    customer_name: str
    segment: str
    customer_value: float
    tenure_months: int
    products_count: int
    inactivity_days: int
    recent_complaints: int
    payment_delays: int
    company_id: Optional[int] = None

class ChurnCustomerCreate(ChurnCustomerBase):
    pass

class ChurnCustomerUpdate(BaseModel):
    risk_level: Optional[str] = None
    churn_score: Optional[float] = None
    contacted: Optional[bool] = None
    retention_actions: Optional[List[Dict]] = None

class ChurnCustomerResponse(ChurnCustomerBase):
    id: int
    churn_score: float
    risk_level: str
    churn_probability: float
    risk_factors: List[str]
    last_activity_date: Optional[datetime] = None
    last_contact_date: Optional[datetime] = None
    retention_actions: List[Dict]
    offers_sent: List[Dict]
    contacted: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        orm_mode = True

# ===== Alert Schemas =====
class ChurnAlertBase(BaseModel):
    alert_type: str
    severity: str
    description: str
    suggested_action: Optional[str] = None
    recommended_offer: Optional[str] = None

class ChurnAlertCreate(ChurnAlertBase):
    customer_id: int

class ChurnAlertResponse(ChurnAlertBase):
    id: int
    customer_id: int
    created_at: datetime
    resolved_at: Optional[datetime] = None
    resolved_by_id: Optional[int] = None
    
    class Config:
        orm_mode = True

# ===== Retention Action Schemas =====
class RetentionActionBase(BaseModel):
    action_type: str
    action_description: str
    offer_type: Optional[str] = None
    offer_value: Optional[float] = None
    offer_details: Dict[str, Any] = {}

class RetentionActionCreate(RetentionActionBase):
    customer_id: int

class RetentionActionResponse(RetentionActionBase):
    id: int
    customer_id: int
    status: str
    response_date: Optional[datetime] = None
    created_by_id: Optional[int] = None
    created_at: datetime
    
    class Config:
        orm_mode = True

# ===== Prediction Model Schemas =====
class ChurnPredictionModelBase(BaseModel):
    model_name: str
    model_version: str
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    features: List[str]
    feature_importance: Dict[str, float]
    is_active: bool = True

class ChurnPredictionModelCreate(ChurnPredictionModelBase):
    pass

class ChurnPredictionModelResponse(ChurnPredictionModelBase):
    id: int
    last_trained: Optional[datetime] = None
    training_data_size: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        orm_mode = True

# ===== Dashboard Stats =====
class ChurnStatsResponse(BaseModel):
    total_at_risk: int
    high_risk: int
    medium_risk: int
    low_risk: int
    churn_rate: float
    saved_last_month: int
    risk_distribution: Dict[str, int]
    recent_alerts: List[Dict[str, Any]]
    top_risk_factors: List[Dict[str, Any]]
    retention_success_rate: float