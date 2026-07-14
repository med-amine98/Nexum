# app/models/sale.py
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

# Définition des constantes de statut
class OrderStatus:
    DRAFT = "brouillon"
    CONFIRMED = "confirmé"
    DONE = "terminé"
    CANCELLED = "annulé"
    DELIVERED = "livré"
    
    @classmethod
    def get_all_statuses(cls):
        return [cls.DRAFT, cls.CONFIRMED, cls.DONE, cls.CANCELLED, cls.DELIVERED]

class PaymentStatus:
    NOT_PAID = "non_payé"
    PARTIAL = "partiel"
    PAID = "payé"
    OVERDUE = "en_attente"
    
    @classmethod
    def get_all_statuses(cls):
        return [cls.NOT_PAID, cls.PARTIAL, cls.PAID, cls.OVERDUE]

class SaleOrder(Base):
    __tablename__ = 'sale_orders'
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    partner_id = Column(Integer, ForeignKey('partners.id'), nullable=True)
    date_order = Column(DateTime, default=datetime.utcnow)
    valid_until = Column(DateTime, nullable=True)
    amount_total = Column(Float, default=0.0)
    amount_untaxed = Column(Float, default=0.0)
    amount_tax = Column(Float, default=0.0)
    state = Column(String(50), default=OrderStatus.DRAFT)
    status = Column(String(50), default=OrderStatus.DRAFT)
    payment_status = Column(String(50), default=PaymentStatus.NOT_PAID)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    company_id = Column(Integer, ForeignKey('companies.id'), nullable=True, index=True)
    notes = Column(String(500), nullable=True)
    origin = Column(String(200), nullable=True)
    
    # IA Stratégique Ventes
    ai_closing_probability = Column(Float, default=0.0)
    ai_next_best_action = Column(Text, nullable=True)
    ai_revenue_forecast = Column(Float, default=0.0)
    ai_customer_sentiment = Column(Float, default=0.0)
    ai_churn_risk_interaction = Column(Float, default=0.0)
    ai_insights = Column(JSON, default=dict)
    last_ai_update = Column(DateTime, default=datetime.utcnow)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    partner = relationship("Partner", foreign_keys=[partner_id])
    user = relationship("User", foreign_keys=[user_id])
    lines = relationship("SaleOrderLine", back_populates="order", cascade="all, delete-orphan")

class SaleOrderLine(Base):
    __tablename__ = 'sale_order_lines'
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey('sale_orders.id', ondelete='CASCADE'), nullable=False)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=True)
    product_name = Column(String(200), nullable=False)
    quantity = Column(Float, default=1.0)
    price_unit = Column(Float, default=0.0)
    price_subtotal = Column(Float, default=0.0)
    price_tax = Column(Float, default=0.0)
    price_total = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)
    name = Column(String(200), nullable=True)
    product_uom_qty = Column(Float, default=1.0)
    
    # Relations
    order = relationship("SaleOrder", back_populates="lines")
    product = relationship("Product", foreign_keys=[product_id])