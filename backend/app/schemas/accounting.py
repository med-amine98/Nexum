from pydantic import BaseModel
from datetime import datetime, date  # ← IMPORTANT: ajouter date
from typing import Optional, List

# ================== COMPTES ==================
class AccountBase(BaseModel):
    code: str
    name: str
    type: str
    description: Optional[str] = None
    parent_id: Optional[int] = None
    is_tax_account: bool = False

class AccountCreate(AccountBase):
    pass

class AccountResponse(AccountBase):
    id: int
    balance: float
    level: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# ================== TAXES ==================
class TaxBase(BaseModel):
    name: str
    rate: float
    code: Optional[str] = None
    account_id: Optional[int] = None
    is_default: bool = False

class TaxCreate(TaxBase):
    pass

class TaxResponse(TaxBase):
    id: int
    is_active: bool
    
    class Config:
        from_attributes = True

# ================== FACTURES ==================
class InvoiceLineBase(BaseModel):
    product_id: Optional[int] = None  # ← Ajouté (manquait)
    description: str
    quantity: float = 1
    price_unit: float
    discount: float = 0
    tax_id: Optional[int] = None

class InvoiceLineCreate(InvoiceLineBase):
    pass

class InvoiceLineResponse(InvoiceLineBase):
    id: int
    price_subtotal: float
    tax_amount: float
    price_total: float
    tax_rate: float
    
    class Config:
        from_attributes = True

class InvoiceBase(BaseModel):
    type: str = "vente"
    partner_id: int
    partner_name: Optional[str] = None
    partner_vat: Optional[str] = None
    due_date: Optional[date] = None  # ← Changé: datetime → Optional[date]
    reference: Optional[str] = None
    notes: Optional[str] = None

class InvoiceCreate(InvoiceBase):
    lines: List[InvoiceLineCreate]

class InvoiceUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None

class InvoiceResponse(InvoiceBase):
    id: int
    number: str
    invoice_date: datetime
    amount_untaxed: float
    amount_tax: float
    amount_total: float
    amount_paid: float
    remaining_amount: float
    status: str
    payment_status: str
    created_at: datetime
    lines: List[InvoiceLineResponse]
    due_date: Optional[date] = None  # ← Ajouté pour la cohérence
    
    class Config:
        from_attributes = True

# ================== PAIEMENTS ==================
class PaymentBase(BaseModel):
    invoice_id: int
    amount: float
    method: str
    reference: Optional[str] = None
    notes: Optional[str] = None
    bank_account: Optional[str] = None

class PaymentCreate(PaymentBase):
    pass

class PaymentResponse(PaymentBase):
    id: int
    payment_date: datetime
    status: str
    transaction_id: Optional[str] = None
    
    class Config:
        from_attributes = True

# ================== DASHBOARD ==================
class DashboardKPI(BaseModel):
    title: str
    value: float
    prefix: Optional[str] = None
    icon: str
    color: str
    trend: float