# app/models/partner.py
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON, Text
from datetime import datetime
from app.database import Base

class Partner(Base):
    __tablename__ = 'partners'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    email = Column(String(100), nullable=True, default=None)
    phone = Column(String(50), nullable=True, default=None)
    mobile = Column(String(50), nullable=True, default=None)
    address = Column(String(500), nullable=True, default=None)
    city = Column(String(100), nullable=True, default=None)
    country = Column(String(100), nullable=True, default="France")
    vat = Column(String(50), nullable=True, default=None)
    is_company = Column(Boolean, default=False)
    is_supplier = Column(Boolean, default=False)
    is_customer = Column(Boolean, default=False)
    credit_limit = Column(Float, default=0.0)
    payment_term = Column(String(50), nullable=True, default=None)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    
    # IA Stratégique Relationnelle Nexum
    ai_trust_score = Column(Float, default=0.0) # Score de confiance Nexum 0-1
    ai_segmentation = Column(String(50), nullable=True) # Catégorisation auto par IA
    ai_ltv_prediction = Column(Float, default=0.0) # Lifetime Value estimée
    ai_churn_risk = Column(Float, default=0.0) # Risque de perte 0-1
    ai_sentiment_index = Column(Float, default=0.0) # Sentiment global -1 à 1
    ai_insights = Column(JSON, default=dict) # Analyse stratégique 360
    last_ai_update = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)