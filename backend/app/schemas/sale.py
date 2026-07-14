from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from enum import Enum

class OrderStatus(str, Enum):
    DRAFT = "brouillon"
    CONFIRMED = "confirmé"
    DELIVERED = "livré"
    CANCELLED = "annulé"

class PaymentStatus(str, Enum):
    PAID = "payé"
    PARTIAL = "partiel"
    PENDING = "en_attente"
    UNPAID = "non_payé"

class SaleOrderLineBase(BaseModel):
    product_id: int
    description: Optional[str] = None
    quantity: float = 1
    price_unit: float
    discount: float = 0

class SaleOrderLineCreate(SaleOrderLineBase):
    pass

class SaleOrderLineResponse(SaleOrderLineBase):
    id: int
    price_subtotal: float
    
    class Config:
        from_attributes = True

class SaleOrderBase(BaseModel):
    partner_id: int
    valid_until: Optional[datetime] = None
    notes: Optional[str] = None

class SaleOrderCreate(SaleOrderBase):
    lines: List[SaleOrderLineCreate]

class SaleOrderUpdate(BaseModel):
    status: Optional[OrderStatus] = None
    payment_status: Optional[PaymentStatus] = None
    notes: Optional[str] = None

class SaleOrderResponse(SaleOrderBase):
    id: int
    name: str
    date_order: datetime
    amount_total: float
    amount_tax: float
    amount_untaxed: float
    status: OrderStatus
    payment_status: PaymentStatus
    created_at: datetime
    lines: List[SaleOrderLineResponse]
    partner_name: Optional[str] = None
    partner_email: Optional[str] = None
    
    class Config:
        from_attributes = True

class OrderFilterParams(BaseModel):
    status: Optional[OrderStatus] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    partner_id: Optional[int] = None
    search: Optional[str] = None