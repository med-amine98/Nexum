from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from enum import Enum

class RiskLevelEnum(str, Enum):
    CRITIQUE = "Critique"
    ELEVE = "Élevé"
    MOYEN = "Moyen"
    FAIBLE = "Faible"

class RiskCategoryEnum(str, Enum):
    CREDIT = "Crédit"
    OPERATIONNEL = "Opérationnel"
    MARCHE = "Marché"
    CONFORMITE = "Conformité"
    CYBER = "Cyber"
    ENVIRONNEMENTAL = "Environnemental"

class RiskBase(BaseModel):
    category: RiskCategoryEnum
    score: int
    level: RiskLevelEnum
    impact_amount: float
    impact_currency: str = "EUR"
    mitigation_plan: Optional[str] = None
    description: Optional[str] = None

class RiskCreate(RiskBase):
    pass

class RiskUpdate(BaseModel):
    score: Optional[int] = None
    level: Optional[RiskLevelEnum] = None
    mitigation_plan: Optional[str] = None
    impact_amount: Optional[float] = None

class RiskInDB(RiskBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class RiskWithStats(RiskInDB):
    incidents_count: int
    actions_count: int
    completion_rate: float

class RiskIncidentBase(BaseModel):
    title: str
    description: Optional[str] = None
    impact_amount: Optional[float] = None

class RiskIncidentCreate(RiskIncidentBase):
    risk_id: int

class RiskIncidentInDB(RiskIncidentBase):
    id: int
    risk_id: int
    date: datetime
    resolved: bool

    class Config:
        from_attributes = True

class RiskActionBase(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None

class RiskActionCreate(RiskActionBase):
    risk_id: int

class RiskActionInDB(RiskActionBase):
    id: int
    risk_id: int
    completed: bool
    completion_date: Optional[datetime] = None

    class Config:
        from_attributes = True