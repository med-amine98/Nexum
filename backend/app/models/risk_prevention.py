# app/models/risk_prevention.py
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON, Boolean, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base


class AlertSeverity(str, enum.Enum):
    """Niveaux de sévérité des alertes"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AlertType(str, enum.Enum):
    """Types d'alertes"""
    WEATHER = "weather"           # Météo
    FIRE = "fire"                 # Incendie
    FLOOD = "flood"               # Inondation
    STORM = "storm"               # Tempête
    EARTHQUAKE = "earthquake"     # Séisme
    THEFT = "theft"               # Vol
    ACCIDENT = "accident"         # Accident
    HEALTH = "health"             # Santé


class RecommendationPriority(str, enum.Enum):
    """Priorités des recommandations"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class RiskAlert(Base):
    """Alertes de risque"""
    __tablename__ = "risk_prevention_alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("banking_clients.id"), nullable=True)
    
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(Enum(AlertSeverity), nullable=False)
    alert_type = Column(Enum(AlertType), nullable=False)
    
    # Localisation
    location = Column(String(255), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    # Dates
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Statut
    is_active = Column(Boolean, default=True)
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime, nullable=True)
    
    # Métadonnées
    data_source = Column(String(100), default="system")
    extra_data = Column(JSON, default={})
    
    # Relations
    client = relationship("Client", foreign_keys=[client_id])


class RiskPreventionRecommendation(Base):
    """Recommandations de prévention"""
    __tablename__ = "risk_prevention_recommendations"
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("banking_clients.id"), nullable=True)
    
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(Enum(RecommendationPriority), default=RecommendationPriority.MEDIUM)
    
    # Catégorie
    category = Column(String(100), nullable=False)  # home, car, health, etc.
    
    # Actions
    action_url = Column(String(500), nullable=True)
    action_label = Column(String(100), nullable=True)
    
    # Impact
    potential_savings = Column(Float, default=0)  # Économies potentielles en €
    risk_reduction = Column(Float, default=0)      # Réduction du risque en %
    
    # Statut
    is_applied = Column(Boolean, default=False)
    applied_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    
    # Relations
    client = relationship("Client", foreign_keys=[client_id])


class RiskScore(Base):
    """Score de risque pour un client"""
    __tablename__ = "risk_prevention_scores"
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("banking_clients.id"), nullable=False)
    
    # Score global
    current_score = Column(Float, default=50)  # 0-100
    previous_score = Column(Float, default=50)
    trend = Column(Float, default=0)  # Variation en points
    
    # Scores par catégorie
    home_risk = Column(Float, default=50)
    car_risk = Column(Float, default=50)
    health_risk = Column(Float, default=50)
    financial_risk = Column(Float, default=50)
    
    # Facteurs
    risk_factors = Column(JSON, default=[])  # Liste des facteurs de risque
    
    # Calcul
    calculated_at = Column(DateTime, default=datetime.utcnow)
    
    # Relations
    client = relationship("Client", foreign_keys=[client_id])


class WeatherRiskData(Base):
    """Données météo pour l'évaluation des risques"""
    __tablename__ = "risk_prevention_weather"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, nullable=False, index=True)
    
    # Localisation
    region = Column(String(100), nullable=False)
    latitude = Column(Float)
    longitude = Column(Float)
    
    # Données météo
    temperature = Column(Float)
    rainfall = Column(Float)  # mm
    wind_speed = Column(Float)  # km/h
    humidity = Column(Float)  # %
    
    # Risques calculés
    flood_risk = Column(Float, default=0)  # 0-100
    storm_risk = Column(Float, default=0)
    fire_risk = Column(Float, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)


class HistoricalIncident(Base):
    """Historique des incidents pour l'apprentissage"""
    __tablename__ = "risk_prevention_incidents"
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("banking_clients.id"), nullable=True)
    
    incident_type = Column(String(100), nullable=False)
    incident_date = Column(DateTime, nullable=False)
    severity = Column(String(50), default="medium")
    
    # Localisation
    location = Column(String(255))
    latitude = Column(Float)
    longitude = Column(Float)
    
    # Conditions
    weather_conditions = Column(JSON, default={})
    damages_amount = Column(Float, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relations
    client = relationship("Client", foreign_keys=[client_id])