# app/schemas/risk_scoring.py
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import logging  # ✅ Correction: importer logging au lieu de fastapi.logger

# ✅ Initialisation du logger
logger = logging.getLogger(__name__)

# ============================================
# ÉNUMÉRATIONS
# ============================================

class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class PolicyStatus(str, Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    CANCELLED = "cancelled"
    PENDING = "pending"

class ClaimStatus(str, Enum):
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"
    PENDING = "pending"

class FraudLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class InsuranceType(str, Enum):
    AUTO = "auto"
    HOME = "habitation"
    HEALTH = "sante"
    LIFE = "vie"
    TRAVEL = "voyage"
    PROFESSIONAL = "professionnelle"
    OTHER = "autre"

# ============================================
# SCHEMAS POLICES
# ============================================

class InsurancePolicyBase(BaseModel):
    client_name: str = Field(..., min_length=2, max_length=200)
    client_age: Optional[int] = Field(None, ge=18, le=120)
    client_profession: Optional[str] = Field(None, max_length=100)
    client_email: Optional[str] = Field(None, max_length=255)
    policy_type: str = Field(..., description="Type de police")
    policy_number: str = Field(..., min_length=5, max_length=50)
    premium: float = Field(..., ge=0)
    coverage_amount: float = Field(..., ge=0)
    deductible: Optional[float] = Field(0, ge=0)
    risk_score: Optional[float] = Field(0, ge=0, le=100)
    risk_level: Optional[str] = Field(RiskLevel.MEDIUM.value)
    risk_factors: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    claims_count: Optional[int] = Field(0, ge=0)
    total_claims_amount: Optional[float] = Field(0, ge=0)
    status: Optional[str] = Field(PolicyStatus.ACTIVE.value)
    description: Optional[str] = Field(None, max_length=1000)
    
    # Données additionnelles pour scoring
    driver_age: Optional[int] = Field(None, ge=16, le=99)
    driver_experience: Optional[int] = Field(None, ge=0, le=70)
    infractions_count: Optional[int] = Field(0, ge=0)
    vehicle_model: Optional[str] = Field(None, max_length=100)
    vehicle_year: Optional[int] = Field(None, ge=1950, le=2025)
    vehicle_power: Optional[int] = Field(None, ge=0, le=500)
    vehicle_usage: Optional[str] = Field(None, max_length=50)
    vehicle_value: Optional[float] = Field(None, ge=0)
    property_value: Optional[float] = Field(None, ge=0)
    property_location: Optional[str] = Field(None, max_length=50)
    property_characteristics: Optional[str] = Field(None, max_length=500)

class InsurancePolicyCreate(InsurancePolicyBase):
    pass

class InsurancePolicyUpdate(BaseModel):
    client_name: Optional[str] = Field(None, min_length=2, max_length=200)
    client_age: Optional[int] = Field(None, ge=18, le=120)
    client_profession: Optional[str] = Field(None, max_length=100)
    client_email: Optional[str] = Field(None, max_length=255)
    policy_type: Optional[str] = None
    premium: Optional[float] = Field(None, ge=0)
    coverage_amount: Optional[float] = Field(None, ge=0)
    deductible: Optional[float] = Field(None, ge=0)
    status: Optional[str] = None
    description: Optional[str] = Field(None, max_length=1000)

class InsurancePolicyResponse(InsurancePolicyBase):
    id: int
    policy_id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    company_id: int
    analyzed_by_id: Optional[int] = None
    fraud_score: Optional[float] = Field(0, ge=0, le=100)
    fraud_level: Optional[str] = Field(FraudLevel.LOW.value)
    ai_risk_forecast_12m: Optional[float] = 0
    ai_premium_optimization: Optional[float] = 0
    ai_insights: Optional[Dict[str, Any]] = Field(default_factory=dict)
    last_ai_update: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# ============================================
# SCHEMAS SINISTRES
# ============================================

class InsuranceClaimBase(BaseModel):
    policy_id: int
    claim_amount: float = Field(..., ge=0)
    claim_type: str = Field(..., max_length=50)
    description: Optional[str] = Field(None, max_length=1000)
    claim_date: Optional[datetime] = None
    status: Optional[str] = Field(ClaimStatus.SUBMITTED.value)
    settled_amount: Optional[float] = Field(None, ge=0)
    settled_date: Optional[datetime] = None

class InsuranceClaimCreate(InsuranceClaimBase):
    pass

class InsuranceClaimResponse(InsuranceClaimBase):
    id: int
    claim_id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# ============================================
# SCHEMAS FACTEURS DE RISQUE
# ============================================

class RiskFactorBase(BaseModel):
    factor_name: str = Field(..., min_length=3, max_length=100)
    factor_description: Optional[str] = Field(None, max_length=500)
    weight_auto: Optional[float] = Field(1.0, ge=0, le=10)
    weight_home: Optional[float] = Field(1.0, ge=0, le=10)
    weight_health: Optional[float] = Field(1.0, ge=0, le=10)
    weight_life: Optional[float] = Field(1.0, ge=0, le=10)
    weight_travel: Optional[float] = Field(1.0, ge=0, le=10)
    weight_professional: Optional[float] = Field(1.0, ge=0, le=10)
    threshold_low: Optional[float] = Field(0.3, ge=0, le=1)
    threshold_medium: Optional[float] = Field(0.6, ge=0, le=1)
    threshold_high: Optional[float] = Field(0.8, ge=0, le=1)
    is_active: Optional[bool] = True

class RiskFactorCreate(RiskFactorBase):
    pass

class RiskFactorResponse(RiskFactorBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# ============================================
# SCHEMAS HISTORIQUE
# ============================================

class RiskScoreHistoryResponse(BaseModel):
    id: int
    policy_id: int
    score: float
    level: str
    reason: Optional[str] = None
    calculated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# ============================================
# SCHEMAS STATISTIQUES
# ============================================

class RiskStatsResponse(BaseModel):
    total_policies: int
    low_risk: int
    medium_risk: int
    high_risk: int
    critical_risk: int
    avg_premium: float
    loss_ratio: float
    risk_distribution: Optional[Dict[str, int]] = Field(default_factory=dict)

# ============================================
# SCHEMAS ALERTES FRAUDE
# ============================================

class FraudAlertResponse(BaseModel):
    id: int
    alert_id: str
    policy_id: int
    client_name: str
    fraud_score: float
    fraud_level: str
    detection_method: str
    indicators: List[str]
    techniques_used: List[str]
    recommendation: Optional[str] = None
    resolved: bool
    resolved_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# ============================================
# SCHEMAS POUR LE FRONTEND
# ============================================

class PolicyListItem(BaseModel):
    id: int
    policy_number: str
    client_name: str
    policy_type: str
    risk_score: float
    risk_level: str
    premium: float
    status: str
    fraud_score: Optional[float] = 0
    created_at: Optional[datetime] = None

class DashboardStatsResponse(BaseModel):
    total_policies: int
    risk_distribution: Dict[str, int]
    avg_premium: float
    loss_ratio: float
    fraud_alerts_count: int
    recent_policies: List[PolicyListItem]

# ✅ Logger correctement initialisé
logger.info("✅ Schémas Risk Scoring chargés")