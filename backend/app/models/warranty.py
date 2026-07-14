# app/models/warranty.py
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON, Boolean, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base


class WarrantyType(str, enum.Enum):
    """Types de garanties"""
    HOME = "home"          # Habitation
    CAR = "car"            # Automobile
    HEALTH = "health"      # Santé
    LIFE = "life"          # Vie
    TRAVEL = "travel"      # Voyage
    ELECTRONICS = "electronics"  # Électronique


class WarrantyStatus(str, enum.Enum):
    """Statuts de garantie"""
    ACTIVE = "active"
    EXPIRED = "expired"
    CANCELLED = "cancelled"
    PENDING = "pending"


class Warranty(Base):
    """Garanties disponibles"""
    __tablename__ = "warranties"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    type = Column(Enum(WarrantyType), nullable=False)
    description = Column(Text, nullable=False)
    
    # Caractéristiques
    coverage_amount = Column(Float, nullable=False)  # Montant de couverture annuel
    monthly_price = Column(Float, nullable=False)    # Prix mensuel
    yearly_price = Column(Float, nullable=False)     # Prix annuel
    
    # Options
    deductible = Column(Float, default=0)            # Franchise
    features = Column(JSON, default=[])              # Liste des fonctionnalités
    
    # Critères d'éligibilité
    min_age = Column(Integer, default=18)
    max_age = Column(Integer, default=99)
    min_credit_score = Column(Integer, default=300)
    required_documents = Column(JSON, default=[])
    
    # Métriques de performance
    subscribers_count = Column(Integer, default=0)
    claims_rate = Column(Float, default=0)           # Taux de sinistralité
    satisfaction_score = Column(Float, default=0)    # Score de satisfaction
    
    is_active = Column(Boolean, default=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    
    # IA Stratégique Garantie Nexum
    ai_optimized_premium = Column(Float, nullable=True) # Prime recommandée par IA
    ai_risk_segment = Column(String(50), nullable=True) # Segmentation du risque IA
    ai_market_position = Column(JSON, default=dict) # Comparaison marché
    ai_insights = Column(JSON, default=dict) # Analyse de rentabilité IA
    last_ai_update = Column(DateTime, default=datetime.utcnow)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    subscriptions = relationship("WarrantySubscription", back_populates="warranty")


class WarrantySubscription(Base):
    """Souscription de garantie par un client"""
    __tablename__ = "warranty_subscriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("banking_clients.id"), nullable=False)
    warranty_id = Column(Integer, ForeignKey("warranties.id"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    
    # Détails de la souscription
    start_date = Column(DateTime, default=datetime.utcnow)
    end_date = Column(DateTime, nullable=True)
    status = Column(Enum(WarrantyStatus), default=WarrantyStatus.ACTIVE)
    
    # Montants
    price_paid = Column(Float, nullable=False)
    payment_frequency = Column(String(20), default="monthly")  # monthly, yearly
    
    # Documents
    documents = Column(JSON, default=[])
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    client = relationship("Client", foreign_keys=[client_id])
    warranty = relationship("Warranty", back_populates="subscriptions")
    claims = relationship("WarrantyClaim", back_populates="subscription")


class WarrantyClaim(Base):
    """Réclamation sur une garantie"""
    __tablename__ = "warranty_claims"
    
    id = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(Integer, ForeignKey("warranty_subscriptions.id"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    
    # Détails de la réclamation
    claim_date = Column(DateTime, default=datetime.utcnow)
    amount = Column(Float, nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(50), default="pending")  # pending, approved, rejected, paid
    
    # IA Stratégique Réclamation Nexum
    ai_fraud_risk = Column(Float, default=0.0) # Risque de fraude détecté 0-1
    ai_validity_score = Column(Float, default=0.0) # Score de conformité 0-1
    ai_payout_recommendation = Column(Float, nullable=True) # Montant suggéré par IA
    ai_insights = Column(JSON, default=dict) # Analyse de cause racine IA
    last_ai_update = Column(DateTime, default=datetime.utcnow)
    
    # Documents
    documents = Column(JSON, default=[])
    
    # Traitement
    approved_at = Column(DateTime, nullable=True)
    paid_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    subscription = relationship("WarrantySubscription", back_populates="claims")


class ClientProfile(Base):
    """Profil client pour la recommandation de garanties"""
    __tablename__ = "client_warranty_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("banking_clients.id"), unique=True, nullable=False)
    
    # Score et profil
    risk_score = Column(Float, default=0)          # 0-100
    confidence_score = Column(Float, default=0)   # 0-100
    rating = Column(Float, default=0)             # 1-5
    
    # Facteurs de risque
    has_home = Column(Boolean, default=False)
    has_car = Column(Boolean, default=False)
    has_dependents = Column(Boolean, default=False)
    age = Column(Integer, default=0)
    annual_income = Column(Float, default=0)
    
    # Historique
    previous_claims = Column(Integer, default=0)
    previous_claims_amount = Column(Float, default=0)
    
    # Préférences
    preferred_coverages = Column(JSON, default=[])
    budget_monthly = Column(Float, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    client = relationship("Client", foreign_keys=[client_id])