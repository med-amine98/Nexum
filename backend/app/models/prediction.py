# app/models/prediction.py

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON, Boolean, Index, func
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum
from app.database import Base

# ===== ÉNUMÉRATIONS =====
class PredictionMetric(str, enum.Enum):
    REVENUE = "revenue"
    ORDERS = "orders"
    AVG_BASKET = "avg_basket"
    CONVERSION = "conversion"
    NEW_CLIENTS = "new_clients"
    CHURN = "churn"
    RISK = "risk"

class ScenarioType(str, enum.Enum):
    OPTIMISTIC = "optimistic"
    PESSIMISTIC = "pessimistic"
    REALISTIC = "realistic"
    CUSTOM = "custom"

class ExogenousFactorType(str, enum.Enum):
    WEATHER = "weather"
    ECONOMIC = "economic"
    SEASONAL = "seasonal"
    NEWS = "news"

class AlertLevel(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"

class AlertCondition(str, enum.Enum):
    GT = "gt"  # greater than
    LT = "lt"  # less than
    EQ = "eq"  # equal

# ===== MODÈLE DONNÉES HISTORIQUES =====
class HistoricalData(Base):
    __tablename__ = 'historical_data'
    __table_args__ = (
        Index('idx_historical_metric_date', 'metric', 'date'),
        Index('idx_historical_company_id', 'company_id'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    data_id = Column(String(50), unique=True, index=True, nullable=False, default=lambda: f"HD-{uuid.uuid4().hex[:8].upper()}")
    metric = Column(String(50), nullable=False)
    value = Column(Float, nullable=False)
    date = Column(DateTime, nullable=False, default=datetime.now)
    notes = Column(Text, nullable=True)
    
    # ✅ AJOUT DE company_id
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=True, index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            "id": self.id,
            "data_id": self.data_id,
            "metric": self.metric,
            "value": self.value,
            "date": self.date.isoformat() if self.date else None,
            "notes": self.notes,
            "company_id": self.company_id,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


# ===== MODÈLE PRÉDICTIONS =====
class Prediction(Base):
    __tablename__ = 'predictions'
    __table_args__ = (
        Index('idx_predictions_metric_date', 'metric', 'date'),
        Index('idx_predictions_company_id', 'company_id'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    prediction_id = Column(String(50), unique=True, index=True, nullable=False, default=lambda: f"PRED-{uuid.uuid4().hex[:8].upper()}")
    metric = Column(String(50), nullable=False)
    predicted_value = Column(Float, nullable=False)
    lower_bound = Column(Float, nullable=True)
    upper_bound = Column(Float, nullable=True)
    confidence = Column(Float, default=0.0)
    
    # ✅ DATE AVEC VALEUR PAR DÉFAUT
    date = Column(DateTime, nullable=False, default=datetime.now)
    
    # ✅ AJOUT DE company_id
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=True, index=True)
    
    # Métadonnées
    model_version = Column(String(50), default="1.0.0")
    features_used = Column(JSON, default=list)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            "id": self.id,
            "prediction_id": self.prediction_id,
            "metric": self.metric,
            "predicted_value": self.predicted_value,
            "lower_bound": self.lower_bound,
            "upper_bound": self.upper_bound,
            "confidence": self.confidence,
            "date": self.date.isoformat() if self.date else None,
            "company_id": self.company_id,
            "model_version": self.model_version,
            "features_used": self.features_used or [],
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


# ===== MODÈLE SCÉNARIOS =====
class Scenario(Base):
    __tablename__ = 'scenarios'
    __table_args__ = (
        Index('idx_scenarios_company_id', 'company_id'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    scenario_id = Column(String(50), unique=True, index=True, nullable=False, default=lambda: f"SCEN-{uuid.uuid4().hex[:8].upper()}")
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    scenario_type = Column(String(20), default=ScenarioType.REALISTIC)
    impact = Column(Float, default=0.0)  # pourcentage d'impact
    probability = Column(Float, default=0.0)  # probabilité en %
    parameters = Column(JSON, default=dict)
    is_active = Column(Boolean, default=True)
    
    # ✅ AJOUT DE company_id
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=True, index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            "id": self.id,
            "scenario_id": self.scenario_id,
            "name": self.name,
            "description": self.description,
            "scenario_type": self.scenario_type.value if hasattr(self.scenario_type, 'value') else str(self.scenario_type),
            "impact": self.impact,
            "probability": self.probability,
            "parameters": self.parameters or {},
            "is_active": self.is_active,
            "company_id": self.company_id,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


# ===== MODÈLE FACTEURS EXOGÈNES =====
class ExogenousFactor(Base):
    __tablename__ = 'exogenous_factors'
    __table_args__ = (
        Index('idx_exogenous_factors_company_id', 'company_id'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    factor_id = Column(String(50), unique=True, index=True, nullable=False, default=lambda: f"FACT-{uuid.uuid4().hex[:8].upper()}")
    name = Column(String(100), nullable=False)
    factor_type = Column(String(20), default=ExogenousFactorType.ECONOMIC)
    frequency = Column(String(20), default="daily")
    description = Column(Text, nullable=True)
    current_value = Column(Float, default=0.0)
    historical_values = Column(JSON, default=list)
    
    # ✅ AJOUT DE company_id
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=True, index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            "id": self.id,
            "factor_id": self.factor_id,
            "name": self.name,
            "factor_type": self.factor_type.value if hasattr(self.factor_type, 'value') else str(self.factor_type),
            "frequency": self.frequency,
            "description": self.description,
            "current_value": self.current_value,
            "historical_values": self.historical_values or [],
            "company_id": self.company_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }


# ===== MODÈLE SEUILS D'ALERTE =====
class AlertThreshold(Base):
    __tablename__ = 'alert_thresholds'
    __table_args__ = (
        Index('idx_alert_thresholds_company_id', 'company_id'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    threshold_id = Column(String(50), unique=True, index=True, nullable=False, default=lambda: f"THR-{uuid.uuid4().hex[:8].upper()}")
    metric = Column(String(50), nullable=False)
    condition = Column(String(10), nullable=False)
    threshold = Column(Float, nullable=False)
    level = Column(String(20), default=AlertLevel.INFO)
    notification_method = Column(JSON, default=["email"])  # email, push, sms
    is_active = Column(Boolean, default=True)
    last_triggered = Column(DateTime, nullable=True)
    
    # ✅ AJOUT DE company_id
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=True, index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            "id": self.id,
            "threshold_id": self.threshold_id,
            "metric": self.metric,
            "condition": self.condition,
            "threshold": self.threshold,
            "level": self.level.value if hasattr(self.level, 'value') else str(self.level),
            "notification_method": self.notification_method or ["email"],
            "is_active": self.is_active,
            "last_triggered": self.last_triggered.isoformat() if self.last_triggered else None,
            "company_id": self.company_id,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


# ===== MODÈLE ALERTES =====
class PredictionAlert(Base):
    __tablename__ = 'prediction_alerts'
    __table_args__ = (
        Index('idx_prediction_alerts_company_id', 'company_id'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(String(50), unique=True, index=True, nullable=False, default=lambda: f"ALERT-{uuid.uuid4().hex[:8].upper()}")
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(String(20), default=AlertLevel.INFO)
    metric = Column(String(50), nullable=True)
    actual_value = Column(Float, nullable=True)
    threshold_value = Column(Float, nullable=True)
    is_read = Column(Boolean, default=False)
    
    # ✅ AJOUT DE company_id
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=True, index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    
    def to_dict(self):
        return {
            "id": self.id,
            "alert_id": self.alert_id,
            "title": self.title,
            "message": self.message,
            "severity": self.severity.value if hasattr(self.severity, 'value') else str(self.severity),
            "metric": self.metric,
            "actual_value": self.actual_value,
            "threshold_value": self.threshold_value,
            "is_read": self.is_read,
            "company_id": self.company_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None
        }


# ===== FONCTIONS UTILITAIRES =====
def generate_data_id():
    return f"HD-{uuid.uuid4().hex[:8].upper()}"

def generate_prediction_id():
    return f"PRED-{uuid.uuid4().hex[:8].upper()}"

def generate_scenario_id():
    return f"SCEN-{uuid.uuid4().hex[:8].upper()}"

def generate_factor_id():
    return f"FACT-{uuid.uuid4().hex[:8].upper()}"

def generate_threshold_id():
    return f"THR-{uuid.uuid4().hex[:8].upper()}"

def generate_alert_id():
    return f"ALERT-{uuid.uuid4().hex[:8].upper()}"