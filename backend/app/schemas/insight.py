# app/schemas/insight.py
from pydantic import BaseModel, validator, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# ========== INSIGHT SCHEMAS (CORRIGÉS) ==========

class InsightBase(BaseModel):
    title: str
    description: Optional[str] = None  # ← Changé: optionnel
    impact: Optional[str] = None       # ← Changé: optionnel
    category: Optional[str] = None     # ← Changé: optionnel
    confidence: Optional[float] = Field(None, ge=0, le=100)  # ← Changé: optionnel
    insight_type: str = "opportunity"
    potential_value: Optional[float] = 0.0
    
    # CORRIGÉ: urgency et trend sont des strings (pas des nombres)
    urgency: Optional[str] = None  # ← Changé de int à str
    trend: Optional[str] = None    # ← Changé de float à str

    @validator('urgency', pre=True)
    def validate_urgency(cls, v):
        """Convertit les valeurs numériques en strings"""
        if v is None:
            return None
        if isinstance(v, (int, float)):
            return str(v)
        return v

    @validator('trend', pre=True)
    def validate_trend(cls, v):
        """Convertit les valeurs numériques en strings"""
        if v is None:
            return None
        if isinstance(v, (int, float)):
            return f"{v:+.0f}%" if v != 0 else "0%"
        return v

class InsightCreate(InsightBase):
    source_data: Optional[Dict[str, Any]] = None
    related_entities: Optional[List[int]] = None

class InsightUpdate(BaseModel):
    is_read: Optional[bool] = None
    is_applied: Optional[bool] = None
    is_dismissed: Optional[bool] = None

class InsightInDB(InsightBase):
    id: int
    is_read: bool = False
    is_applied: bool = False
    is_dismissed: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# ========== KEYWORD SCHEMAS ==========

class KeywordBase(BaseModel):
    text: str
    value: int = 1
    category: Optional[str] = None
    trend: Optional[float] = 0.0

class KeywordCreate(KeywordBase):
    pass

class KeywordInDB(KeywordBase):
    id: int
    last_updated: datetime
    
    class Config:
        from_attributes = True

# ========== PERFORMANCE SCHEMAS ==========

class PerformanceMetricBase(BaseModel):
    name: str
    value: float
    target: float = 100.0
    unit: str = "%"
    category: str = "health"
    trend: Optional[float] = 0.0

class PerformanceMetricInDB(PerformanceMetricBase):
    id: int
    updated_at: datetime
    
    class Config:
        from_attributes = True

# ========== MARKET TREND SCHEMAS ==========

class MarketTrendBase(BaseModel):
    segment: str
    growth_rate: float
    market_size: float
    confidence: float

class MarketTrendInDB(MarketTrendBase):
    id: int
    opportunities: Optional[List[str]] = None
    threats: Optional[List[str]] = None
    updated_at: datetime
    
    class Config:
        from_attributes = True

# ========== DASHBOARD SCHEMAS ==========

class BusinessInsightsDashboard(BaseModel):
    insights: List[InsightInDB]
    keywords: List[KeywordInDB]
    performance: PerformanceMetricInDB
    top_opportunities: List[InsightInDB]
    strategic_alerts: List[InsightInDB]
    market_trends: List[MarketTrendInDB]