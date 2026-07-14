from pydantic import BaseModel
from datetime import datetime, date  # ← IMPORTANT: ajouter date
from typing import Optional, List

class SupplierBase(BaseModel):
    name: str
    code: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    vat: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    payment_terms: Optional[str] = None
    delivery_terms: Optional[str] = None
    currency: str = "EUR"
    is_preferred: bool = False

class SupplierCreate(SupplierBase):
    pass

class SupplierResponse(BaseModel):
    id: int
    name: str
    code: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    is_preferred: bool = False
    active: bool = True
    total_purchases: float = 0
    average_delivery_time: Optional[int] = 0
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class PurchaseOrderLineBase(BaseModel):
    product_id: Optional[int] = None
    description: str
    quantity: float
    price_unit: float
    discount: float = 0

class PurchaseOrderLineCreate(PurchaseOrderLineBase):
    pass

class PurchaseOrderLineResponse(PurchaseOrderLineBase):
    id: int
    price_subtotal: float
    quantity_received: float
    quantity_invoiced: float
    product_name: Optional[str] = None
    
    class Config:
        from_attributes = True

class PurchaseOrderBase(BaseModel):
    supplier_id: int
    expected_date: Optional[date] = None  # ← CHANGÉ de datetime à date
    reference: Optional[str] = None
    notes: Optional[str] = None
    incoterm: Optional[str] = None
    payment_term: Optional[str] = None

class PurchaseOrderCreate(PurchaseOrderBase):
    lines: List[PurchaseOrderLineCreate]

class PurchaseOrderUpdate(BaseModel):
    status: Optional[str] = None
    delivery_status: Optional[str] = None
    delivery_date: Optional[date] = None  # ← CHANGÉ de datetime à date
    notes: Optional[str] = None

class PurchaseOrderResponse(PurchaseOrderBase):
    id: int
    name: str
    date_order: datetime
    amount_untaxed: float
    amount_tax: float
    amount_total: float
    status: str
    delivery_status: str
    items_count: int
    created_at: datetime
    supplier_name: Optional[str] = None
    supplier_code: Optional[str] = None
    lines: List[PurchaseOrderLineResponse]
    expected_date: Optional[date] = None  # ← CHANGÉ de datetime à date
    delivery_date: Optional[date] = None  # ← CHANGÉ de datetime à date
    
    class Config:
        from_attributes = True

class PurchaseFilterParams(BaseModel):
    status: Optional[str] = None
    supplier_id: Optional[int] = None
    date_from: Optional[date] = None  # ← CHANGÉ de datetime à date
    date_to: Optional[date] = None    # ← CHANGÉ de datetime à date
    search: Optional[str] = None
    delivery_status: Optional[str] = None