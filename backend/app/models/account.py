from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Enum, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base

class AccountType(str, enum.Enum):
    ASSET = "asset"
    LIABILITY = "liability"
    EQUITY = "equity"
    REVENUE = "revenue"
    EXPENSE = "expense"

class Account(Base):
    __tablename__ = 'accounts'
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, nullable=False)
    name = Column(String(200), nullable=False)
    type = Column(Enum(AccountType), default=AccountType.ASSET)
    parent_id = Column(Integer, ForeignKey('accounts.id'), nullable=True)
    active = Column(Boolean, default=True)
    company_id = Column(Integer, ForeignKey('companies.id'), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class InvoiceStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    PAID = "paid"
    CANCELLED = "cancelled"

class Invoice(Base):
    __tablename__ = 'invoices'
    
    id = Column(Integer, primary_key=True, index=True)
    number = Column(String(50), unique=True, nullable=False)
    partner_id = Column(Integer, ForeignKey('partners.id'), nullable=False)
    partner = relationship("Partner", foreign_keys=[partner_id])
    date_invoice = Column(DateTime, default=datetime.utcnow)
    date_due = Column(DateTime, nullable=True)
    amount_total = Column(Float, default=0.0)
    amount_tax = Column(Float, default=0.0)
    amount_untaxed = Column(Float, default=0.0)
    status = Column(Enum(InvoiceStatus), default=InvoiceStatus.DRAFT)
    payment_status = Column(String(20), default="not_paid")
    notes = Column(String(500), nullable=True)
    company_id = Column(Integer, ForeignKey('companies.id'), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Intelligence IA & Anti-Fraude
    ai_anomaly_score = Column(Float, default=0.0) # Probabilité d'erreur/anomalie (0-1)
    ai_fraud_risk = Column(Float, default=0.0)    # Score de risque de fraude calculé par James
    ai_payment_forecast = Column(DateTime, nullable=True) # Date de paiement probable prédite par l'IA
    ai_insights = Column(JSON, nullable=True)      # Analyse de la conformité et suggestions

class InvoiceLine(Base):
    __tablename__ = 'invoice_lines'
    
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey('invoices.id', ondelete='CASCADE'), nullable=False)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=True)
    name = Column(String(500), nullable=False)
    quantity = Column(Float, default=1.0)
    price_unit = Column(Float, default=0.0)
    price_subtotal = Column(Float, default=0.0)
    price_tax = Column(Float, default=0.0)
    price_total = Column(Float, default=0.0)
