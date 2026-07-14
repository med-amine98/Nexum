# app/schemas/support.py
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class TicketPriorityEnum(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class TicketStatusEnum(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"

class TicketCategoryEnum(str, Enum):
    TECHNICAL = "technical"
    BILLING = "billing"
    ACCOUNT = "account"
    GENERAL = "general"

class TicketSectorEnum(str, Enum):
    BANQUE = "banque"
    ASSURANCE = "assurance"
    ENTREPRISE = "entreprise"

class TicketCreate(BaseModel):
    subject: str = Field(..., min_length=1, max_length=500)
    description: str = Field(..., min_length=1)
    category: TicketCategoryEnum = TicketCategoryEnum.GENERAL
    priority: TicketPriorityEnum = TicketPriorityEnum.MEDIUM
    sector: TicketSectorEnum = TicketSectorEnum.ENTREPRISE
    user_email: Optional[str] = None
    user_name: Optional[str] = None

class TicketResponse(BaseModel):
    id: int
    ticket_number: str
    subject: str
    description: str
    category: str
    priority: str
    status: str
    sector: str
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class SolutionResponse(BaseModel):
    id: int
    solution_text: str
    steps: List[str] = []
    sources: List[Dict[str, Any]] = []
    confidence: float
    helpful_count: int
    not_helpful_count: int
    created_at: datetime

class SolveRequest(BaseModel):
    ticket_id: int
    query: str
    auto_resolve: bool = True

class SolveResponse(BaseModel):
    solution: str
    steps: List[str] = []
    sources: List[Dict[str, Any]] = []
    confidence: float
    id: int

class FeedbackRequest(BaseModel):
    solution_id: int
    helpful: bool
    comment: Optional[str] = None

class KnowledgeBaseCreate(BaseModel):
    title: str
    content: str
    category: Optional[str] = None
    sector: Optional[str] = None
    tags: List[str] = []

class KnowledgeBaseResponse(BaseModel):
    id: int
    title: str
    content: str
    excerpt: Optional[str] = None
    category: Optional[str] = None
    sector: Optional[str] = None
    tags: List[str] = []
    created_at: datetime

class TicketStatsResponse(BaseModel):
    total_tickets: int
    open_tickets: int
    resolved_tickets: int
    resolution_rate: float
    avg_resolution_time: float
    resolved_by_ai: int
    satisfaction_rate: float
    monthly_trend: List[Dict[str, Any]]
    category_distribution: List[Dict[str, Any]]
    sector_distribution: List[Dict[str, Any]]  # Ajout