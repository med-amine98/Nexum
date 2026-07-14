from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, JSON, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum
from app.database import Base

class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"

class ModelRequestStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    IN_PROGRESS = "in_progress"

class ModelRequest(Base):
    __tablename__ = "model_requests"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Modèle demandé
    model_key = Column(String(50), nullable=False)
    model_name = Column(String(100), nullable=False)
    model_category = Column(String(50), nullable=False)
    
    # Statut et paiement
    status = Column(Enum(ModelRequestStatus), default=ModelRequestStatus.PENDING)
    payment_status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    payment_amount = Column(Float, default=0.0)
    payment_date = Column(DateTime, nullable=True)
    
    # Détails
    notes = Column(Text, nullable=True)
    admin_notes = Column(Text, nullable=True)
    
    # Dates
    requested_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relations
    company = relationship("Company", back_populates="model_requests")
    user = relationship("User", back_populates="model_requests")

class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    request_id = Column(Integer, ForeignKey("model_requests.id"), nullable=True)
    
    amount = Column(Float, nullable=False)
    currency = Column(String(3), default="EUR")
    payment_method = Column(String(50), nullable=True)  # card, transfer, etc.
    transaction_id = Column(String(100), unique=True, nullable=True)
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    
    payment_date = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    company = relationship("Company")
    user = relationship("User")
    request = relationship("ModelRequest")

class AdminLog(Base):
    __tablename__ = "admin_logs"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=False)  # user, company, request
    entity_id = Column(Integer, nullable=False)
    changes = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    admin = relationship("User", foreign_keys=[admin_id])