from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, Text, JSON, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base

# Importez Category depuis l'autre fichier
from app.models.product import Category  # ou le nom de votre fichier

class MovementType(str, enum.Enum):
    RECEIPT = "reception"
    SHIPMENT = "expedition"
    TRANSFER = "transfert"
    ADJUSTMENT = "ajustement"
    RETURN = "retour"

class StockMovement(Base):
    __tablename__ = "stock_movements"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    movement_type = Column(Enum(MovementType), nullable=False)
    quantity = Column(Float, nullable=False)
    previous_stock = Column(Float, default=0.0)
    new_stock = Column(Float, default=0.0)
    source_location = Column(String(100), nullable=True)
    destination_location = Column(String(100), nullable=True)
    reference = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    unit_price = Column(Float, nullable=True)
    total_price = Column(Float, nullable=True)
    created_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    company_id = Column(Integer, ForeignKey('companies.id'), nullable=True, index=True)
    
    # IA Stratégique Logistique Nexum
    ai_anomaly_score = Column(Float, default=0.0)
    ai_suggested_reorder = Column(Boolean, default=False)
    ai_stock_forecast_7d = Column(Float, nullable=True)
    ai_optimized_storage_path = Column(String(200), nullable=True)
    ai_insights = Column(JSON, default=dict)
    last_ai_update = Column(DateTime, default=datetime.utcnow)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    product = relationship("Product", back_populates="movements")
    creator = relationship("User", foreign_keys=[created_by])