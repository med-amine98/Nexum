from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, JSON, Text, ForeignKey
from sqlalchemy.sql import func
from datetime import datetime
from app.database import Base

class Module(Base):
    __tablename__ = "modules"
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=False)  # Core Business, IA & Innovation, Technologies, Utilitaires
    icon = Column(String(50), nullable=False)  # Nom de l'icône Ant Design
    
    # Métadonnées
    path = Column(String(100), nullable=False)
    version = Column(String(20), default="1.0.0")
    author = Column(String(100), nullable=True)
    
    # Statistiques
    fields_count = Column(Integer, default=0)
    relations = Column(JSON, default=[])  # Liste des relations
    usage_percent = Column(Integer, default=0)
    
    # Tags
    tags = Column(JSON, default=[])
    
    # Couleurs et badges
    color = Column(String(20), default="#1890ff")
    badge = Column(String(20), nullable=True)
    badge_color = Column(String(20), nullable=True)
    highlight = Column(Boolean, default=False)
    
    # Statistiques détaillées
    stats = Column(JSON, default={
        "totalRecords": 0,
        "avgResponse": "0ms",
        "queries": 0
    })
    
    # Documentation
    documentation_url = Column(String(200), nullable=True)
    
    # Statut
    is_active = Column(Boolean, default=True)
    is_favorite = Column(Boolean, default=False)
    is_installed = Column(Boolean, default=False)
    
    # SaaS configuration
    is_free = Column(Boolean, default=True)
    price = Column(Float, default=0.0)
    currency = Column(String(10), default="EUR")
    
    # Dates
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_update = Column(DateTime, default=datetime.utcnow)

class ModuleCategory(Base):
    __tablename__ = "module_categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    display_name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String(20), default="#1890ff")
    icon = Column(String(50), nullable=True)
    order_index = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ModuleTag(Base):
    __tablename__ = "module_tags"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    color = Column(String(20), default="processing")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class UserModule(Base):
    __tablename__ = "user_modules"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    module_id = Column(Integer, nullable=False)
    is_favorite = Column(Boolean, default=False)
    is_installed = Column(Boolean, default=True)
    is_paid = Column(Boolean, default=False)
    payment_date = Column(DateTime, nullable=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)
    installed_at = Column(DateTime, default=datetime.utcnow)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())