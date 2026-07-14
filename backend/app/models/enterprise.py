from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class EnterpriseProject(Base):
    __tablename__ = "enterprise_projects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    progress = Column(Integer, default=0)
    budget = Column(Float, default=0)
    spent = Column(Float, default=0)
    deadline = Column(DateTime)
    status = Column(String(50), default="on_track")
    
    # ============================================
    # COLONNES TENANT (À AJOUTER)
    # ============================================
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class EnterpriseSale(Base):
    __tablename__ = "enterprise_sales"
    
    id = Column(Integer, primary_key=True, index=True)
    product = Column(String(200))
    client = Column(String(200))
    amount = Column(Float, default=0)
    status = Column(String(50), default="pending")
    satisfaction = Column(Float, default=0)
    is_new_client = Column(Boolean, default=False)
    date = Column(DateTime, default=datetime.utcnow)
    
    # ============================================
    # COLONNES TENANT (À AJOUTER)
    # ============================================
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class EnterpriseEmployee(Base):
    __tablename__ = "enterprise_employees"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200))
    email = Column(String(200))
    department = Column(String(100))
    position = Column(String(100))
    performance = Column(Integer, default=0)
    
    # ============================================
    # COLONNES TENANT (À AJOUTER)
    # ============================================
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class EnterpriseFinancialForecast(Base):
    __tablename__ = "enterprise_financial_forecasts"
    
    id = Column(Integer, primary_key=True, index=True)
    month = Column(String(20))
    actual = Column(Float, default=0)
    forecast = Column(Float, default=0)
    
    # ============================================
    # COLONNES TENANT (À AJOUTER)
    # ============================================
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class EnterpriseAlert(Base):
    __tablename__ = "enterprise_alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200))
    description = Column(String(500))
    type = Column(String(50), default="info")
    is_read = Column(Boolean, default=False)
    
    # ============================================
    # COLONNES TENANT (À AJOUTER)
    # ============================================
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)