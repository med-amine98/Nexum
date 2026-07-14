from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class SubscriptionPlanBase(BaseModel):
    name: str = Field(..., example="Premium Plan")
    price_cents: int = Field(..., example=9999)
    interval: str = Field(..., example="month")
    features: Optional[str] = Field(None, description="JSON string describing features")
    is_active: bool = Field(default=True)

class SubscriptionPlanCreate(SubscriptionPlanBase):
    pass

class SubscriptionPlanResponse(SubscriptionPlanBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class CompanySubscriptionBase(BaseModel):
    company_id: int = Field(..., example=1)
    plan_id: int = Field(..., example=2)
    stripe_subscription_id: Optional[str] = Field(None)
    status: str = Field(default="active")
    start_date: Optional[datetime] = Field(default_factory=datetime.utcnow)
    end_date: Optional[datetime] = None
    cancel_at_period_end: bool = Field(default=False)

class CompanySubscriptionCreate(CompanySubscriptionBase):
    pass

class CompanySubscriptionUpdate(BaseModel):
    stripe_subscription_id: Optional[str] = None
    status: Optional[str] = None
    end_date: Optional[datetime] = None
    cancel_at_period_end: Optional[bool] = None

class CompanySubscriptionResponse(CompanySubscriptionBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
