from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, Text
from sqlalchemy.sql import func
from app.database import Base

class MobileEModel(Base):
    __tablename__ = "mobilee_model"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    sector = Column(String(50), nullable=False)
    status = Column(String(20), default="pending")
    version = Column(String(20), default="1.0.0")
    accuracy = Column(Float, default=0)
    precision = Column(Float, default=0)
    recall = Column(Float, default=0)
    f1_score = Column(Float, default=0)
    roc_auc = Column(Float, default=0)
    features = Column(JSON, default=[])
    last_update = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())