from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Customer(Base):
    __tablename__ = "customers"
    __table_args__ = {'extend_existing': True}
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True)  # Si converti depuis un lead
    
    # Informations société
    company_name = Column(String(200), nullable=False)
    company_email = Column(String(100))
    company_phone = Column(String(20))
    company_address = Column(Text)
    company_city = Column(String(100))
    company_country = Column(String(100))
    company_vat = Column(String(50))
    
    # Contact principal
    contact_name = Column(String(200))
    contact_email = Column(String(100))
    contact_phone = Column(String(20))
    
    # Informations commerciales
    customer_since = Column(DateTime, default=datetime.utcnow)
    total_purchases = Column(Float, default=0)
    average_order = Column(Float, default=0)
    last_purchase = Column(DateTime, nullable=True)
    
    # Catégorisation
    category = Column(String(100), default="standard")  # standard, premium, vip
    payment_terms = Column(String(100), default="30 jours")
    
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)