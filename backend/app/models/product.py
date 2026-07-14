from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Category(Base):
    __tablename__ = 'categories'
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    parent_id = Column(Integer, ForeignKey('categories.id'), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relations - avec foreign_keys explicite
    parent = relationship("Category", remote_side=[id])
    products = relationship("Product", back_populates="category")

class Product(Base):
    __tablename__ = 'products'
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    sku = Column(String(100), unique=True, nullable=False)
    barcode = Column(String(100), nullable=True)
    category_id = Column(Integer, ForeignKey('categories.id'), nullable=True)
    unit_price = Column(Float, default=0.0)
    cost_price = Column(Float, default=0.0)
    quantity_on_hand = Column(Float, default=0.0)
    current_stock = Column(Float, default=0.0)
    min_stock = Column(Float, default=0.0)
    max_stock = Column(Float, default=0.0)
    reorder_level = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    company_id = Column(Integer, ForeignKey('companies.id'), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Intelligence IA & Stock Prédictif Nexum
    ai_demand_forecast = Column(Float, default=0.0) # Ventes prévues sur les 30 prochains jours
    smart_reorder_point = Column(Float, default=0.0) # Point de commande calculé par James (IA)
    ai_stock_analysis = Column(JSON, nullable=True)  # Analyse des risques de rupture ou sur-stockage
    ai_price_optimization = Column(JSON, default=dict) # Recommandations de prix dynamiques
    ai_customer_interest_score = Column(Float, default=0.0) # Score d'attractivité 0-1
    ai_obsolescence_risk = Column(Float, default=0.0) # Risque de devenir un "mort" 0-1
    ai_insights = Column(JSON, default=dict) # Analyse stratégique globale
    last_ai_update = Column(DateTime, nullable=True) # Date de la dernière prédiction
    
    # Relations
    category = relationship("Category", back_populates="products")
    movements = relationship("StockMovement", back_populates="product")
