# app/models/quote.py
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
import random
from app.database import Base

class QuoteStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    PAID = "paid"

class QuoteItem(Base):
    __tablename__ = "quote_items"
    
    id = Column(Integer, primary_key=True, index=True)
    quote_id = Column(Integer, ForeignKey("quotes.id", ondelete="CASCADE"))
    description = Column(String(500), nullable=False)
    quantity = Column(Float, default=1)
    unit_price = Column(Float, default=0)
    total = Column(Float, default=0)
    
    quote = relationship("Quote", back_populates="items")

class Quote(Base):
    __tablename__ = "quotes"
    
    id = Column(Integer, primary_key=True, index=True)
    quote_number = Column(String(50), unique=True, index=True, nullable=False)
    client_name = Column(String(200), nullable=False)
    client_email = Column(String(255), nullable=True)
    client_phone = Column(String(50), nullable=True)
    client_address = Column(Text, nullable=True)
    
    description = Column(Text, nullable=True)
    
    subtotal = Column(Float, default=0)
    discount = Column(Float, default=0)
    discount_type = Column(String(20), default="percentage")
    tax_rate = Column(Float, default=20)
    tax_amount = Column(Float, default=0)
    total_amount = Column(Float, default=0)
    
    issue_date = Column(DateTime, default=datetime.utcnow)
    valid_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    status = Column(SQLEnum(QuoteStatus), default=QuoteStatus.DRAFT)
    
    notes = Column(Text, nullable=True)
    terms_conditions = Column(Text, nullable=True)
    extra_data = Column(JSON, nullable=True)  # Changé de 'metadata' à 'extra_data'
    
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    
    # IA Stratégique Devis Nexum
    ai_conversion_probability = Column(Float, default=0.0) # Probabilité d'acceptation 0-1
    ai_optimized_pricing = Column(JSON, default=dict) # Suggestions de prix/remise IA
    ai_competitor_analysis = Column(JSON, default=dict) # Analyse positionnement marché
    ai_insights = Column(JSON, default=dict) # Recommandations pour conclure la vente
    last_ai_update = Column(DateTime, default=datetime.utcnow)
    
    items = relationship("QuoteItem", back_populates="quote", cascade="all, delete-orphan")
    user = relationship("User", foreign_keys=[user_id])
    
    @staticmethod
    def generate_quote_number():
        """Générer un numéro de devis unique"""
        year = datetime.now().year
        random_num = random.randint(1000, 9999)
        return f"DEV-{year}-{random_num}"