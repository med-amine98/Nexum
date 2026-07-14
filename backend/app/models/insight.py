# app/models/insight.py
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, JSON, ForeignKey, Enum as SQLEnum
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import enum

Base = declarative_base()

class InsightType(str, enum.Enum):
    OPPORTUNITY = "opportunity"
    RISK = "risk"
    RECOMMENDATION = "recommendation"
    ALERT = "alert"

class InsightCategory(str, enum.Enum):
    MARCHE = "Marché"
    CONCURRENCE = "Concurrence"
    OPERATIONS = "Opérations"
    CLIENT = "Client"
    FINANCES = "Finances"
    TECHNOLOGIE = "Technologie"
    REGLEMENTATION = "Réglementation"

class Insight(Base):
    __tablename__ = "business_insights"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    insight_type = Column(SQLEnum(InsightType), nullable=False)
    category = Column(SQLEnum(InsightCategory), nullable=False)
    impact = Column(String(50))
    potential_value = Column(Float, default=0)
    confidence = Column(Integer, default=0)
    urgency = Column(Integer, default=0)
    is_applied = Column(Boolean, default=False)
    is_dismissed = Column(Boolean, default=False)
    is_read = Column(Boolean, default=False)
    recommended_actions = Column(JSON, default=list)
    
    # Métadonnées IA Stratégique Nexum
    ai_source_model = Column(String(50), nullable=True) # Elena, Sophie, James
    ai_reasoning = Column(Text, nullable=True) # Logique derrière l'insight
    ai_impact_forecast = Column(JSON, default=dict) # ROI estimé, gain temps, etc.
    ai_execution_strategy = Column(JSON, default=dict) # Étapes recommandées
    ai_confidence_score = Column(Float, default=0.0) # 0-1
    last_ai_update = Column(DateTime, default=datetime.utcnow)
    
    # RENOMMER metadata en extra_data (car metadata est réservé)
    extra_data = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

class Keyword(Base):
    __tablename__ = "business_keywords"
    
    id = Column(Integer, primary_key=True, index=True)
    text = Column(String(100), nullable=False, index=True)
    value = Column(Integer, default=1)
    category = Column(String(50))
    source = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class MarketTrend(Base):
    __tablename__ = "market_trends"
    
    id = Column(Integer, primary_key=True, index=True)
    segment = Column(String(100), nullable=False)
    growth_rate = Column(Float, nullable=False)
    confidence = Column(Integer, default=80)
    data_points = Column(JSON, default=list)
    source = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)

class PerformanceMetric(Base):
    __tablename__ = "performance_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    value = Column(Float, nullable=False)
    trend = Column(Float, default=0)
    unit = Column(String(20))
    category = Column(String(50))
    recorded_at = Column(DateTime, default=datetime.utcnow)

class Feedback(Base):
    __tablename__ = "insight_feedback"
    
    id = Column(Integer, primary_key=True, index=True)
    insight_id = Column(Integer, ForeignKey("business_insights.id"), nullable=False)
    action_taken = Column(Text)
    result = Column(Text)
    roi = Column(Float)
    rating = Column(Integer)
    comments = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)