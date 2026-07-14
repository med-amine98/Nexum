from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base

class PurchaseOrderStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    CONFIRMED = "confirmed"
    RECEIVED = "received"
    CANCELLED = "cancelled"

class DeliveryStatus(str, enum.Enum):
    NOT_DELIVERED = "not_delivered"
    PARTIAL = "partial"
    DELIVERED = "delivered"

class PurchaseOrder(Base):
    __tablename__ = 'purchase_orders'
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    supplier_id = Column(Integer, ForeignKey('partners.id'), nullable=False)  # Utilise partners
    partner_id_old = Column(Integer, ForeignKey('partners.id'), nullable=True)
    date_order = Column(DateTime, default=datetime.utcnow)
    expected_date = Column(DateTime, nullable=True)
    delivery_date = Column(DateTime, nullable=True)
    amount_untaxed = Column(Float, default=0.0)
    amount_tax = Column(Float, default=0.0)
    amount_total = Column(Float, default=0.0)
    status = Column(Enum(PurchaseOrderStatus), default=PurchaseOrderStatus.DRAFT)
    delivery_status = Column(Enum(DeliveryStatus), default=DeliveryStatus.NOT_DELIVERED)
    reference = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    incoterm = Column(String(50), nullable=True)
    payment_term = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    company_id = Column(Integer, ForeignKey('companies.id'), nullable=True, index=True)
    
    # IA Stratégique Achats
    ai_supplier_reliability = Column(Float, default=0.0) # Score de fiabilité basé sur l'historique
    ai_delivery_risk = Column(Float, default=0.0) # Risque estimé de retard
    ai_price_analysis = Column(JSON, default=dict) # Analyse des prix vs marché
    ai_fraud_risk = Column(Float, default=0.0) # Détection d'anomalies d'achat
    ai_insights = Column(JSON, default=dict) # Recommandations IA (ex: grouper les achats)
    last_ai_update = Column(DateTime, default=datetime.utcnow)
    
    # Relations
    supplier = relationship("Partner", foreign_keys=[supplier_id])
    partner = relationship("Partner", foreign_keys=[partner_id_old])
    lines = relationship("PurchaseOrderLine", back_populates="order", cascade="all, delete-orphan")
    creator = relationship("User", foreign_keys=[created_by])

class PurchaseOrderLine(Base):
    __tablename__ = 'purchase_order_lines'
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey('purchase_orders.id', ondelete='CASCADE'), nullable=False)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=True)
    product_name = Column(String(200), nullable=False)
    quantity = Column(Float, default=1.0)
    price_unit = Column(Float, default=0.0)
    price_subtotal = Column(Float, default=0.0)
    price_tax = Column(Float, default=0.0)
    price_total = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)
    date_planned = Column(DateTime, nullable=True)
    
    order = relationship("PurchaseOrder", back_populates="lines")
    product = relationship("Product")
