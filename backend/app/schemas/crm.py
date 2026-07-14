from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from enum import Enum

class LeadStatus(str, Enum):
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    PROPOSAL = "proposal"
    NEGOTIATION = "negotiation"
    WON = "won"
    LOST = "lost"

class LeadCreate(BaseModel):
    name: str
    company_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[LeadStatus] = LeadStatus.NEW
    source: Optional[str] = None
    priority: Optional[str] = "medium"
    description: Optional[str] = None
    expected_revenue: Optional[float] = 0.0
    probability: Optional[float] = 0.0

class LeadUpdate(BaseModel):
    name: Optional[str] = None
    company_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[LeadStatus] = None
    source: Optional[str] = None
    priority: Optional[str] = None
    description: Optional[str] = None
    expected_revenue: Optional[float] = None
    probability: Optional[float] = None

class LeadResponse(BaseModel):
    id: int
    name: str
    company_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    status: LeadStatus
    source: Optional[str] = None
    priority: str
    description: Optional[str] = None
    expected_revenue: float
    probability: float
    assigned_to_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class LeadStats(BaseModel):
    total: int
    open: int
    won: int
    lost: int
    total_value: float
    conversion_rate: float
