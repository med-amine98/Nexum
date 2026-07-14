# app/models/ai_model.py
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from datetime import datetime
from app.models.base import BaseModel

class AIModel(BaseModel):
    __tablename__ = "ai_models"

    name = Column(String(100), nullable=False)
    type = Column(String(50), nullable=False)  # fraud, credit, churn, recommendation, risk, aml
    sector = Column(String(20), nullable=True)  # bank, insurance, enterprise, all
    version = Column(String(20), nullable=True)
    accuracy = Column(Float, default=0)
    usage_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)