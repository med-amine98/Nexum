from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class CompanyBase(BaseModel):
    name: str
    sector: str
    size: Optional[str] = None
    registration_number: Optional[str] = None
    siret: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None

class CompanyCreate(CompanyBase):
    pass

class CompanyResponse(CompanyBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True