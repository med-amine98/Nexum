# app/models/predictive_analytics.py
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON, Boolean, Enum
from datetime import datetime
import enum
from app.database import Base
class MetricType(str, enum.Enum):
    REVENUE = "revenue"
    ORDERS = "orders"
    AVG_BASKET = "avg_basket"
    CONVERSION = "conversion"
    NEW_CLIENTS = "new_clients"

class AlertLevel(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"

class HistoricalData(Base):
    __tablename__ = "predictive_historical_data"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, nullable=False) 
    metric = Column(String(50), nullable=False)
    value = Column(Float, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class SalesForecast(Base):
    __tablename__ = "predictive_sales_forecast"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, nullable=False)
    predicted_value = Column(Float, nullable=False)
    actual_value = Column(Float, default=0)
    lower_bound = Column(Float)
    upper_bound = Column(Float)
    confidence = Column(Float, default=0.95)
    model_used = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)

class MetricPrediction(Base):
    __tablename__ = "predictive_metric_predictions"
    
    id = Column(Integer, primary_key=True, index=True)
    metric = Column(Enum(MetricType), nullable=False)
    current_value = Column(Float, nullable=False)
    predicted_value = Column(Float, nullable=False)
    trend = Column(Float, default=0)
    confidence = Column(Float, default=85)
    unit = Column(String(20), default="€")
    created_at = Column(DateTime, default=datetime.utcnow)

class SimulationScenario(Base):
    __tablename__ = "predictive_scenarios"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    impact = Column(Float, default=0)
    probability = Column(Float, default=50)
    created_at = Column(DateTime, default=datetime.utcnow)

class ExogenousFactor(Base):
    __tablename__ = "predictive_exogenous_factors"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    type = Column(String(50))
    frequency = Column(String(20))
    description = Column(Text)
    values = Column(JSON, default={})
    created_at = Column(DateTime, default=datetime.utcnow)

class AlertThreshold(Base):
    __tablename__ = "predictive_alert_thresholds"
    
    id = Column(Integer, primary_key=True, index=True)
    metric = Column(String(50), nullable=False)  # ✅ Changer en String au lieu de Enum
    condition = Column(String(10), nullable=False)
    threshold = Column(Float, nullable=False)
    level = Column(String(20), default="warning")  # ✅ Changer en String
    notification_method = Column(JSON, default=["email"])
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class PredictionAlert(Base):
    __tablename__ = "predictive_alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200))
    message = Column(Text)
    severity = Column(Enum(AlertLevel))
    timestamp = Column(DateTime, default=datetime.utcnow)
    is_read = Column(Boolean, default=False)