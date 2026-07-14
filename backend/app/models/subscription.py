# app/models/subscription.py
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from datetime import datetime
from app.models.base import BaseModel

class SubscriptionPlan(BaseModel):
    __tablename__ = "subscription_plans"

    name = Column(String(50), nullable=False, unique=True)
    price_cents = Column(Integer, nullable=False)
    interval = Column(String(10), nullable=False)  # "month" or "year"
    features = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "price_cents": self.price_cents,
            "price": self.price_cents / 100,
            "interval": self.interval,
            "features": self.features,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class CompanySubscription(BaseModel):
    __tablename__ = "company_subscriptions"

    company_id = Column(Integer, nullable=False, index=True)
    plan_id = Column(Integer, ForeignKey("subscription_plans.id"), nullable=False)
    stripe_subscription_id = Column(String(255), nullable=True)
    status = Column(String(20), default="pending")  # pending, active, cancelled, rejected
    start_date = Column(DateTime, default=datetime.utcnow)
    end_date = Column(DateTime, nullable=True)
    cancel_at_period_end = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "company_id": self.company_id,
            "plan_id": self.plan_id,
            "stripe_subscription_id": self.stripe_subscription_id,
            "status": self.status,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "cancel_at_period_end": self.cancel_at_period_end,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }