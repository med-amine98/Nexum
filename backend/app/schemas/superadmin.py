from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# ========== ENTREPRISES ==========
class CompanySectorStats(BaseModel):
    sector: str
    count: int
    color: str

class CompanySizeStats(BaseModel):
    size: str
    count: int

class CompanyDetail(BaseModel):
    id: int
    name: str
    legal_name: Optional[str] = None
    sector: str
    size: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    website: Optional[str] = None
    is_active: bool
    subscription_tier: str
    users_count: int
    created_at: datetime
    updated_at: Optional[datetime] = None

class CompanyListResponse(BaseModel):
    total: int
    companies: List[CompanyDetail]

# ========== UTILISATEURS ==========
class UserDetail(BaseModel):
    id: int
    email: EmailStr
    username: Optional[str] = None
    full_name: Optional[str] = None
    role: str
    status: str
    company_id: Optional[int] = None
    company_name: Optional[str] = None
    email_verified: bool
    last_login: Optional[datetime] = None
    login_count: int
    created_at: datetime

class UserRoleStats(BaseModel):
    role: str
    count: int
    color: str

class UserStatusStats(BaseModel):
    status: str
    count: int

class UserListResponse(BaseModel):
    total: int
    users: List[UserDetail]

# ========== DEMANDES DE MODÈLES ==========
class ModelRequestCreate(BaseModel):
    model_key: str
    model_name: str
    model_category: str
    notes: Optional[str] = None

class ModelRequestUpdate(BaseModel):
    status: Optional[str] = None
    admin_notes: Optional[str] = None

class ModelRequestPayment(BaseModel):
    amount: float
    payment_method: str
    transaction_id: Optional[str] = None

class ModelRequestDetail(BaseModel):
    id: int
    company_id: int
    company_name: str
    user_id: int
    user_name: str
    model_key: str
    model_name: str
    model_category: str
    status: str
    payment_status: str
    payment_amount: float
    notes: Optional[str] = None
    admin_notes: Optional[str] = None
    requested_at: datetime
    processed_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None

class ModelRequestListResponse(BaseModel):
    total: int
    pending: int
    approved: int
    rejected: int
    requests: List[ModelRequestDetail]

# ========== STATISTIQUES SUPER ADMIN ==========
class SuperAdminDashboardStats(BaseModel):  # ← Renommé
    total_users: int
    total_companies: int
    total_requests: int
    pending_requests: int
    paid_requests: float
    users_by_role: List[UserRoleStats]
    users_by_status: List[UserStatusStats]
    companies_by_sector: List[CompanySectorStats]
    companies_by_size: List[CompanySizeStats]
    recent_requests: List[ModelRequestDetail]
    recent_users: List[UserDetail]
    recent_companies: List[CompanyDetail]