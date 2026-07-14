# app/models/claim_tracking.py
from sqlalchemy import Column, Integer, String, DateTime, Text, Float, Boolean, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class ClaimStatus(str, enum.Enum):
    PENDING = "pending"
    ANALYZING = "analyzing"
    EXPERT_ASSIGNED = "expert_assigned"
    APPROVED = "approved"
    REJECTED = "rejected"
    PAID = "paid"


class ClaimTracking(Base):
    __tablename__ = "claim_tracking"
    
    id = Column(Integer, primary_key=True, index=True)
    claim_number = Column(String(50), unique=True, index=True, nullable=False)
    claim_type = Column(String(100), nullable=False)
    status = Column(String(50), default=ClaimStatus.PENDING)
    status_color = Column(String(20), default="orange")
    current_step = Column(Integer, default=0)
    
    user_id = Column(Integer, nullable=True)
    user_name = Column(String(200), nullable=True)
    user_email = Column(String(200), nullable=True)
    
    description = Column(Text, nullable=True)
    amount = Column(Float, default=0)
    
    expert_id = Column(Integer, nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    # Relations
    steps = relationship("ClaimTrackingStep", back_populates="claim", cascade="all, delete-orphan")
    notifications = relationship("ClaimTrackingNotification", back_populates="claim", cascade="all, delete-orphan")
    documents = relationship("ClaimTrackingDocument", back_populates="claim", cascade="all, delete-orphan")
    messages = relationship("ClaimTrackingMessage", back_populates="claim", cascade="all, delete-orphan")


class ClaimTrackingStep(Base):
    __tablename__ = "claim_tracking_steps"
    
    id = Column(Integer, primary_key=True, index=True)
    claim_id = Column(Integer, ForeignKey("claim_tracking.id", ondelete="CASCADE"))
    title = Column(String(200))
    description = Column(Text)
    status = Column(String(50), default="pending")
    date = Column(DateTime, server_default=func.now())
    
    claim = relationship("ClaimTracking", back_populates="steps")


class ClaimTrackingNotification(Base):
    __tablename__ = "claim_tracking_notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    claim_id = Column(Integer, ForeignKey("claim_tracking.id", ondelete="CASCADE"))
    title = Column(String(200))
    message = Column(Text)
    type = Column(String(50), default="info")
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    
    claim = relationship("ClaimTracking", back_populates="notifications")


class ClaimTrackingDocument(Base):
    __tablename__ = "claim_tracking_documents"
    
    id = Column(Integer, primary_key=True, index=True)
    claim_id = Column(Integer, ForeignKey("claim_tracking.id", ondelete="CASCADE"))
    name = Column(String(200))
    file_name = Column(String(200))
    type = Column(String(50))
    file_path = Column(String(500))
    uploaded_at = Column(DateTime, server_default=func.now())
    
    claim = relationship("ClaimTracking", back_populates="documents")


class ClaimTrackingMessage(Base):
    __tablename__ = "claim_tracking_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    claim_id = Column(Integer, ForeignKey("claim_tracking.id", ondelete="CASCADE"))
    role = Column(String(20))  # user, assistant, expert
    content = Column(Text)
    time = Column(DateTime, server_default=func.now())
    
    claim = relationship("ClaimTracking", back_populates="messages")


class Expert(Base):
    __tablename__ = "experts"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200))
    specialty = Column(String(200))
    phone = Column(String(50))
    email = Column(String(200))