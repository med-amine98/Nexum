# app/schemas/quote.py
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from datetime import datetime
from enum import Enum

class QuoteStatusEnum(str, Enum):
    DRAFT = "draft"
    SENT = "sent"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    PAID = "paid"

class QuoteItemCreate(BaseModel):
    description: str
    quantity: float = 1
    unit_price: float = 0

class QuoteItemResponse(BaseModel):
    id: int
    description: str
    quantity: float
    unit_price: float
    total: float
    
    class Config:
        from_attributes = True

class QuoteCreate(BaseModel):
    client_name: str = Field(..., min_length=1, max_length=200)
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    client_address: Optional[str] = None
    description: Optional[str] = None
    items: List[QuoteItemCreate] = []
    discount: float = 0
    discount_type: str = "percentage"
    tax_rate: float = 20
    valid_until: Optional[datetime] = None
    notes: Optional[str] = None
    terms_conditions: Optional[str] = None

class QuoteUpdate(BaseModel):
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    status: Optional[QuoteStatusEnum] = None
    notes: Optional[str] = None

class QuoteResponse(BaseModel):
    id: int
    quote_number: str
    client_name: str
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    client_address: Optional[str] = None
    description: Optional[str] = None
    items: List[QuoteItemResponse] = []
    subtotal: float
    discount: float
    discount_type: str
    tax_rate: float
    tax_amount: float
    total_amount: float
    issue_date: datetime
    valid_until: Optional[datetime] = None
    status: QuoteStatusEnum
    notes: Optional[str] = None
    terms_conditions: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class AIGenerateRequest(BaseModel):
    client_name: str
    client_email: Optional[str] = None
    description: str
    discount: float = 0
    tax_rate: float = 20
    valid_until: Optional[datetime] = None