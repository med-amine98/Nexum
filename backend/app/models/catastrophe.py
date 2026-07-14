# app/models/catastrophe.py
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, JSON, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum
import uuid
from datetime import datetime

# ===== ÉNUMÉRATIONS =====
class RiskLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class FraudLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class CatastropheType(str, enum.Enum):
    FLOOD = "inondation"
    HURRICANE = "ouragan"
    EARTHQUAKE = "seisme"
    WILDFIRE = "feu_foret"
    AVALANCHE = "avalanche"
    DROUGHT = "secheresse"
    STORM = "tempete"
    OTHER = "autre"

class DetectionMethod(str, enum.Enum):
    SATELLITE_IMAGERY = "satellite_imagery_ai"
    GAN_DAMAGE_ASSESSMENT = "gan_damage_assessment"
    GEOSPATIAL_AI = "geospatial_ai"
    REINSURANCE_COMPLIANCE = "reinsurance_compliance"
    CROSS_VALIDATION = "cross_validation"

# ===== MODÈLES PRINCIPAUX =====
class CatastropheZone(Base):
    __tablename__ = "catastrophe_zones"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    zone_id = Column(String(50), unique=True, index=True, nullable=False, default=lambda: f"ZNE-{uuid.uuid4().hex[:8].upper()}")
    
    # Informations zone
    zone_name = Column(String(200), nullable=False)
    region = Column(String(100), nullable=False)
    country = Column(String(100), nullable=False)
    area_km2 = Column(Float, nullable=True)
    population = Column(Integer, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    # Analyse risque
    risk_level = Column(String(20), default=RiskLevel.MEDIUM.value)
    risk_score = Column(Float, default=0.0)
    
    # Exposition financière
    total_exposure = Column(Float, default=0.0)
    insured_value = Column(Float, default=0.0)
    probable_max_loss = Column(Float, default=0.0)
    
    # Probabilités
    probability = Column(Float, default=0.0)
    return_period_years = Column(Integer, nullable=True)
    
    # Types de risques
    main_risk_type = Column(String(50), nullable=False)
    secondary_risks = Column(JSON, default=list)
    
    # Historique
    last_event_date = Column(DateTime, nullable=True)
    events_count = Column(Integer, default=0)
    historical_losses = Column(Float, default=0.0)
    
    # Modélisation IA Stratégique Nexum (James)
    ai_climate_impact_forecast = Column(JSON, default=dict)
    ai_resilience_score = Column(Float, default=0.0)
    ai_reinsurance_optimization = Column(JSON, default=dict)
    ai_payout_projection = Column(Float, default=0.0)
    ai_insights = Column(JSON, default=dict)
    last_ai_update = Column(DateTime, default=datetime.utcnow)
    
    # Métadonnées
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    # Relations
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    analyzed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    company = relationship("Company", foreign_keys=[company_id], backref="catastrophe_zones")
    analyzed_by = relationship("User", foreign_keys=[analyzed_by_id], backref="analyzed_zones")
    events = relationship("CatastropheEvent", back_populates="zone", cascade="all, delete-orphan")
    fraud_alerts = relationship("CatastropheFraudAlert", back_populates="zone", cascade="all, delete-orphan")
    
    def to_dict(self):
        """Convertit l'objet en dictionnaire pour l'API"""
        return {
            "id": self.id,
            "zone_id": self.zone_id,
            "zone_name": self.zone_name,
            "region": self.region,
            "country": self.country,
            "area_km2": self.area_km2,
            "population": self.population,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "risk_level": self.risk_level,
            "risk_score": self.risk_score,
            "total_exposure": self.total_exposure,
            "insured_value": self.insured_value,
            "probable_max_loss": self.probable_max_loss,
            "probability": self.probability,
            "return_period_years": self.return_period_years,
            "main_risk_type": self.main_risk_type,
            "secondary_risks": self.secondary_risks,
            "last_event_date": self.last_event_date.isoformat() if self.last_event_date else None,
            "events_count": self.events_count,
            "historical_losses": self.historical_losses,
            "ai_climate_impact_forecast": self.ai_climate_impact_forecast,
            "ai_resilience_score": self.ai_resilience_score,
            "ai_reinsurance_optimization": self.ai_reinsurance_optimization,
            "ai_payout_projection": self.ai_payout_projection,
            "ai_insights": self.ai_insights,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }


class CatastropheEvent(Base):
    __tablename__ = "catastrophe_events"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String(50), unique=True, index=True, nullable=False, default=lambda: f"EVT-{uuid.uuid4().hex[:8].upper()}")
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    
    # Informations
    event_name = Column(String(200), nullable=False)
    event_type = Column(String(50), nullable=False)
    zone_id = Column(Integer, ForeignKey("catastrophe_zones.id"), nullable=False)
    
    # IA Réponse Nexum
    ai_automated_response_plan = Column(JSON, default=dict)
    ai_damage_prediction_accuracy = Column(Float, default=0.0)
    ai_recovery_time_objective = Column(Integer, nullable=True)
    
    # Caractéristiques
    magnitude = Column(Float, nullable=True)
    intensity = Column(String(50), nullable=True)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=True)
    
    # Impact
    affected_area_km2 = Column(Float, nullable=True)
    affected_population = Column(Integer, nullable=True)
    fatalities = Column(Integer, default=0)
    injuries = Column(Integer, default=0)
    
    # Pertes
    economic_loss = Column(Float, default=0.0)
    insured_loss = Column(Float, default=0.0)
    
    # Données
    event_data = Column(JSON, default=dict)
    damage_reports = Column(JSON, default=list)
    
    # Fraude
    fraud_suspected = Column(Boolean, default=False)
    fraud_score = Column(Float, default=0.0)
    
    created_at = Column(DateTime, server_default=func.now())
    
    zone = relationship("CatastropheZone", foreign_keys=[zone_id], back_populates="events")
    
    def to_dict(self):
        return {
            "id": self.id,
            "event_id": self.event_id,
            "event_name": self.event_name,
            "event_type": self.event_type,
            "zone_id": self.zone_id,
            "magnitude": self.magnitude,
            "intensity": self.intensity,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "affected_area_km2": self.affected_area_km2,
            "affected_population": self.affected_population,
            "fatalities": self.fatalities,
            "injuries": self.injuries,
            "economic_loss": self.economic_loss,
            "insured_loss": self.insured_loss,
            "fraud_suspected": self.fraud_suspected,
            "fraud_score": self.fraud_score,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class CatastropheScenario(Base):
    __tablename__ = "catastrophe_scenarios"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    scenario_id = Column(String(50), unique=True, index=True, nullable=False, default=lambda: f"SCN-{uuid.uuid4().hex[:8].upper()}")
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    scenario_name = Column(String(200), nullable=False)
    scenario_type = Column(String(50), nullable=False)
    
    # Paramètres IA
    ai_simulation_version = Column(String(20), default="1.0")
    ai_monte_carlo_params = Column(JSON, default=dict)
    
    # Paramètres
    parameters = Column(JSON, default=dict)
    probability = Column(Float, default=0.0)
    severity = Column(String(20), default="medium")
    
    # Résultats
    projected_loss = Column(Float, default=0.0)
    affected_zones = Column(JSON, default=list)
    impact_analysis = Column(JSON, default=dict)
    
    # Statut
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by = relationship("User", foreign_keys=[created_by_id])
    
    def to_dict(self):
        return {
            "id": self.id,
            "scenario_id": self.scenario_id,
            "scenario_name": self.scenario_name,
            "scenario_type": self.scenario_type,
            "probability": self.probability,
            "severity": self.severity,
            "projected_loss": self.projected_loss,
            "affected_zones": self.affected_zones,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }


class CatastropheAlert(Base):
    __tablename__ = "catastrophe_alerts"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(String(50), unique=True, index=True, nullable=False, default=lambda: f"ALT-{uuid.uuid4().hex[:8].upper()}")
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    alert_type = Column(String(50), nullable=False)
    severity = Column(String(20), default="medium")
    
    # IA Alerte
    ai_confidence_level = Column(Float, default=0.0)
    ai_source_reliability = Column(Float, default=0.0)
    
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    affected_zones = Column(JSON, default=list)
    
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=True)
    
    is_active = Column(Boolean, default=True)
    acknowledged = Column(Boolean, default=False)
    acknowledged_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by = relationship("User", foreign_keys=[created_by_id])
    
    def to_dict(self):
        return {
            "id": self.id,
            "alert_id": self.alert_id,
            "alert_type": self.alert_type,
            "severity": self.severity,
            "title": self.title,
            "description": self.description,
            "affected_zones": self.affected_zones,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "is_active": self.is_active,
            "acknowledged": self.acknowledged,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class CatastropheFraudAlert(Base):
    __tablename__ = "catastrophe_fraud_alerts"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(String(50), unique=True, index=True, nullable=False, default=lambda: f"FRD-{uuid.uuid4().hex[:8].upper()}")
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    zone_id = Column(Integer, ForeignKey("catastrophe_zones.id"), nullable=False)
    event_id = Column(Integer, ForeignKey("catastrophe_events.id"), nullable=True)
    
    # IA Fraude
    ai_logic_explanation = Column(Text, nullable=True)
    ai_suggested_investigation_steps = Column(JSON, default=list)
    ai_estimated_saving = Column(Float, default=0.0)
    
    zone_name = Column(String(200), nullable=False)
    fraud_score = Column(Float, default=0.0)
    fraud_level = Column(String(20), default=FraudLevel.MEDIUM.value)
    
    detection_method = Column(String(50), nullable=False)
    indicators = Column(JSON, default=list)
    techniques_used = Column(JSON, default=list)
    
    recommendation = Column(Text, nullable=True)
    
    resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    zone = relationship("CatastropheZone", foreign_keys=[zone_id], back_populates="fraud_alerts")
    event = relationship("CatastropheEvent", foreign_keys=[event_id])
    resolved_by = relationship("User", foreign_keys=[resolved_by_id])
    
    def to_dict(self):
        return {
            "id": self.id,
            "alert_id": self.alert_id,
            "zone_id": self.zone_id,
            "zone_name": self.zone_name,
            "fraud_score": self.fraud_score,
            "fraud_level": self.fraud_level,
            "detection_method": self.detection_method,
            "indicators": self.indicators,
            "techniques_used": self.techniques_used,
            "recommendation": self.recommendation,
            "resolved": self.resolved,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }


# ===== FONCTIONS UTILITAIRES =====
def generate_zone_id():
    return f"ZNE-{uuid.uuid4().hex[:8].upper()}"

def get_risk_level_from_score(score: float) -> str:
    if score >= 70: return RiskLevel.CRITICAL.value
    elif score >= 50: return RiskLevel.HIGH.value
    elif score >= 30: return RiskLevel.MEDIUM.value
    return RiskLevel.LOW.value

def get_fraud_level_from_score(score: float) -> str:
    if score >= 80: return FraudLevel.CRITICAL.value
    elif score >= 60: return FraudLevel.HIGH.value
    elif score >= 40: return FraudLevel.MEDIUM.value
    return FraudLevel.LOW.value


# Models Catastrophe loaded