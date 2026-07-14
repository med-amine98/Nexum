from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class CatastropheType(str, Enum):
    FLOOD = "inondation"
    HURRICANE = "ouragan"
    EARTHQUAKE = "seisme"
    WILDFIRE = "feu_foret"
    AVALANCHE = "avalanche"
    DROUGHT = "secheresse"
    STORM = "tempete"
    OTHER = "autre"

# ===== Zone Schemas =====
class CatastropheZoneBase(BaseModel):
    zone_name: str
    region: str
    country: str
    area_km2: Optional[float] = None
    population: Optional[int] = None
    main_risk_type: str
    secondary_risks: List[str] = []
    total_exposure: float = 0.0
    insured_value: float = 0.0
    company_id: Optional[int] = None

class CatastropheZoneCreate(CatastropheZoneBase):
    pass

class CatastropheZoneUpdate(BaseModel):
    risk_level: Optional[str] = None
    risk_score: Optional[float] = None
    probability: Optional[float] = None
    total_exposure: Optional[float] = None
    insured_value: Optional[float] = None
    probable_max_loss: Optional[float] = None

class CatastropheZoneResponse(CatastropheZoneBase):
    id: int
    zone_id: str
    risk_level: str
    risk_score: float
    probability: float
    return_period_years: Optional[int] = None
    probable_max_loss: float
    last_event_date: Optional[datetime] = None
    events_count: int
    historical_losses: float
    scenario_data: Dict[str, Any]
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# ===== Event Schemas =====
class CatastropheEventBase(BaseModel):
    event_name: str
    event_type: str
    zone_id: int
    magnitude: Optional[float] = None
    intensity: Optional[str] = None
    start_date: datetime
    end_date: Optional[datetime] = None
    affected_area_km2: Optional[float] = None
    affected_population: Optional[int] = None
    fatalities: int = 0
    injuries: int = 0
    economic_loss: float = 0.0
    insured_loss: float = 0.0

class CatastropheEventCreate(CatastropheEventBase):
    pass

class CatastropheEventResponse(CatastropheEventBase):
    id: int
    event_id: str
    event_data: Dict[str, Any]
    damage_reports: List[Dict[str, Any]]
    created_at: datetime
    
    class Config:
        from_attributes = True

# ===== Scenario Schemas =====
class CatastropheScenarioBase(BaseModel):
    scenario_name: str
    scenario_type: str
    parameters: Dict[str, Any] = {}
    probability: float = 0.0
    severity: str = "medium"
    projected_loss: float = 0.0
    affected_zones: List[int] = []
    impact_analysis: Dict[str, Any] = {}
    is_active: bool = True

class CatastropheScenarioCreate(CatastropheScenarioBase):
    pass

class CatastropheScenarioUpdate(BaseModel):
    parameters: Optional[Dict[str, Any]] = None
    probability: Optional[float] = None
    severity: Optional[str] = None
    projected_loss: Optional[float] = None
    impact_analysis: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

class CatastropheScenarioResponse(CatastropheScenarioBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by_id: Optional[int] = None
    
    class Config:
        from_attributes = True

# ===== Alert Schemas =====
class CatastropheAlertBase(BaseModel):
    alert_type: str
    severity: str
    title: str
    description: str
    affected_zones: List[int] = []
    start_date: datetime
    end_date: Optional[datetime] = None
    is_active: bool = True

class CatastropheAlertCreate(CatastropheAlertBase):
    pass

class CatastropheAlertUpdate(BaseModel):
    severity: Optional[str] = None
    description: Optional[str] = None
    end_date: Optional[datetime] = None
    is_active: Optional[bool] = None
    acknowledged: Optional[bool] = None

class CatastropheAlertResponse(CatastropheAlertBase):
    id: int
    acknowledged: bool
    created_at: datetime
    created_by_id: Optional[int] = None
    
    class Config:
        from_attributes = True

# ===== Stats Schemas =====
class CatastropheStatsResponse(BaseModel):
    total_exposure: float
    high_risk_zones: int
    medium_risk_zones: int
    low_risk_zones: int
    probable_max_loss: float
    scenarios: int
    by_risk_type: Dict[str, int]
    by_region: Dict[str, Any]
    recent_alerts: List[Dict[str, Any]]
    top_risk_zones: List[Dict[str, Any]]