# app/enterprise_models.py
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text
from datetime import datetime
from app.database import Base

class EnterpriseSale(Base):
    __tablename__ = "enterprise_sales"
    
    id = Column(Integer, primary_key=True, index=True)
    product = Column(String(200), nullable=False)
    client = Column(String(200), nullable=False)
    amount = Column(Float, nullable=False)
    date = Column(DateTime, default=datetime.now)
    status = Column(String(50), default="pending")
    satisfaction = Column(Float, nullable=True)
    is_new_client = Column(Boolean, default=False)


class EnterpriseProject(Base):
    __tablename__ = "enterprise_projects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    progress = Column(Integer, default=0)
    budget = Column(Float, nullable=False)
    spent = Column(Float, default=0)
    deadline = Column(DateTime, nullable=False)
    status = Column(String(50), default="planning")


class EnterpriseEmployee(Base):  # Renommé de Employee à EnterpriseEmployee
    __tablename__ = "enterprise_employees"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    email = Column(String(200), unique=True, nullable=False)
    department = Column(String(100), nullable=False)
    position = Column(String(100), nullable=False)
    performance = Column(Integer, default=75)
    hire_date = Column(DateTime, default=datetime.now)


class EnterpriseFinancialForecast(Base):
    __tablename__ = "enterprise_financial_forecasts"
    
    id = Column(Integer, primary_key=True, index=True)
    month = Column(String(20), nullable=False)
    actual = Column(Float, nullable=True)
    forecast = Column(Float, nullable=False)


class EnterpriseRiskMetric(Base):
    __tablename__ = "enterprise_risk_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    credit = Column(Integer, default=25)
    market = Column(Integer, default=45)
    operational = Column(Integer, default=30)
    liquidity = Column(Integer, default=20)
    overall = Column(Integer, default=35)
    updated_at = Column(DateTime, default=datetime.now)


class EnterprisePerformanceMetric(Base):
    __tablename__ = "enterprise_performance_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    retention = Column(Integer, default=92)
    employee_satisfaction = Column(Integer, default=84)
    employee_engagement = Column(Integer, default=82)
    sales_target = Column(Integer, default=85)


class EnterpriseSupplyChain(Base):
    __tablename__ = "enterprise_supply_chain"
    
    id = Column(Integer, primary_key=True, index=True)
    week = Column(String(20), nullable=False)
    demand = Column(Integer, nullable=False)
    supply = Column(Integer, nullable=False)
    inventory = Column(Integer, nullable=False)


class EnterpriseAlert(Base):
    __tablename__ = "enterprise_alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    amount = Column(Float, nullable=True)
    deadline = Column(DateTime, nullable=True)
    type = Column(String(50), default="info")
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.now)


class EnterpriseTrend(Base):
    __tablename__ = "enterprise_trends"
    
    id = Column(Integer, primary_key=True, index=True)
    topic = Column(String(200), nullable=False)
    volume = Column(Integer, nullable=False)
    trend = Column(String(20), default="up")
    category = Column(String(100), nullable=False)


class EnterpriseSectorTrend(Base):
    __tablename__ = "enterprise_sector_trends"
    
    id = Column(Integer, primary_key=True, index=True)
    sector = Column(String(100), nullable=False)
    growth = Column(Float, nullable=False)
    confidence = Column(Integer, nullable=False)
    impact = Column(String(50), default="stable")


class EnterpriseYouthTrend(Base):
    __tablename__ = "enterprise_youth_trends"
    
    id = Column(Integer, primary_key=True, index=True)
    topic = Column(String(200), nullable=False)
    interest = Column(Integer, nullable=False)
    growth = Column(String(20), nullable=False)
    category = Column(String(100), nullable=False)


class EnterpriseNews(Base):
    __tablename__ = "enterprise_news"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    source = Column(String(200), nullable=False)
    url = Column(String(500), nullable=True)
    published_at = Column(DateTime, default=datetime.now)