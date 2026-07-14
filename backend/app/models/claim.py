# app/models/claim.py
"""
Modèles pour la gestion des sinistres
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON, Index
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.database import Base


# ===== ÉNUMÉRATIONS =====

class ClaimStatus:
    """Statut d'un sinistre"""
    PENDING = "pending"
    PROCESSING = "processing"
    REVIEW = "review"
    APPROVED = "approved"
    REJECTED = "rejected"
    PAID = "paid"
    COMPLETED = "completed"


class ClaimType:
    """Type de sinistre"""
    ACCIDENT = "accident"
    THEFT = "vol"
    FIRE = "incendie"
    WATER_DAMAGE = "degats_eau"
    OTHER = "autre"


# ===== MODÈLE PRINCIPAL =====

class Claim(Base):
    """Modèle des sinistres - Déclarations"""
    __tablename__ = 'claims'
    __table_args__ = (
        Index('idx_claims_user_id', 'user_id'),
        Index('idx_claims_status', 'status'),
        Index('idx_claims_claim_number', 'claim_number'),
        Index('idx_claims_created_at', 'created_at'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    claim_number = Column(String(50), unique=True, index=True, nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    
    # Informations utilisateur
    user_id = Column(Integer, nullable=False, index=True)
    user_email = Column(String(100), nullable=True)
    user_name = Column(String(200), nullable=True)
    
    # Informations sinistre
    claim_type = Column(String(50), nullable=False)
    claim_date = Column(DateTime, nullable=False)
    description = Column(Text, nullable=False)
    location = Column(String(500), nullable=True)
    
    # IA Stratégique Sinistres
    ai_fraud_score = Column(Float, default=0.0) # Risque de fraude détecté par IA
    ai_damage_validation = Column(JSON, default=dict) # Analyse de cohérence des dommages
    ai_payout_prediction = Column(Float, default=0.0) # Montant d'indemnisation estimé
    ai_urgency_score = Column(Float, default=0.0) # Priorisation automatique
    ai_insights = Column(JSON, default=dict) # Synthèse stratégique IA
    last_ai_update = Column(DateTime, default=datetime.utcnow)
    
    # Contact
    contact_phone = Column(String(50), nullable=True)
    contact_email = Column(String(100), nullable=True)
    
    # Statut
    status = Column(String(50), default="pending")
    
    # Estimations
    estimated_amount = Column(Float, default=0.0)
    final_amount = Column(Float, nullable=True)
    analysis_confidence = Column(Float, default=0.0)
    damage_score = Column(Float, default=0.0)
    
    # Expertise
    expert_assigned = Column(String(200), nullable=True)
    expertise_date = Column(DateTime, nullable=True)
    expertise_notes = Column(Text, nullable=True)
    
    # Dates
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    estimated_completion = Column(DateTime, nullable=True)
    
    # Paiement
    payment_date = Column(DateTime, nullable=True)
    payment_reference = Column(String(100), nullable=True)
    
    # Relations - AVEC FOREIGN KEY EXPLICITES
    photos = relationship("ClaimPhoto", back_populates="claim", cascade="all, delete-orphan", foreign_keys="ClaimPhoto.claim_id")
    analysis = relationship("ClaimAnalysis", back_populates="claim", cascade="all, delete-orphan", uselist=False, foreign_keys="ClaimAnalysis.claim_id")
    estimate = relationship("ClaimEstimate", back_populates="claim", cascade="all, delete-orphan", uselist=False, foreign_keys="ClaimEstimate.claim_id")
    activities = relationship("ClaimActivity", back_populates="claim", cascade="all, delete-orphan", foreign_keys="ClaimActivity.claim_id")
    
    def __repr__(self):
        return f"<Claim(id={self.id}, number='{self.claim_number}', status='{self.status}')>"
    
    def to_dict(self):
        return {
            "id": self.id,
            "claim_number": self.claim_number,
            "user_id": self.user_id,
            "user_email": self.user_email,
            "user_name": self.user_name,
            "claim_type": self.claim_type,
            "claim_date": self.claim_date.isoformat() if self.claim_date else None,
            "description": self.description,
            "location": self.location,
            "status": self.status,
            "estimated_amount": self.estimated_amount,
            "analysis_confidence": self.analysis_confidence,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class ClaimPhoto(Base):
    """Modèle des photos de sinistre"""
    __tablename__ = 'claim_photos'
    __table_args__ = (
        Index('idx_claim_photos_claim_id', 'claim_id'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    claim_id = Column(Integer, ForeignKey('claims.id', ondelete="CASCADE"), nullable=False, index=True)
    
    photo_url = Column(String(500), nullable=False)
    thumbnail_url = Column(String(500), nullable=True)
    file_name = Column(String(255), nullable=True)
    file_size = Column(Integer, default=0)
    mime_type = Column(String(100), nullable=True)
    
    # Analyse IA
    analysis_data = Column(JSON, nullable=True)
    damage_severity = Column(Integer, default=1)
    damage_type = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    estimated_repair_cost = Column(Float, default=0.0)
    analysis_confidence = Column(Float, default=0.0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relation
    claim = relationship("Claim", back_populates="photos")
    
    def __repr__(self):
        return f"<ClaimPhoto(id={self.id}, claim_id={self.claim_id})>"


class ClaimAnalysis(Base):
    """Modèle d'analyse des sinistres"""
    __tablename__ = 'claim_analyses'
    __table_args__ = (
        Index('idx_claim_analyses_claim_id', 'claim_id'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    claim_id = Column(Integer, ForeignKey('claims.id', ondelete="CASCADE"), nullable=False, index=True)
    
    # Analyse globale
    analysis_version = Column(String(20), default="1.0")
    analysis_date = Column(DateTime, default=datetime.utcnow)
    
    # Scores
    fraud_risk_score = Column(Float, default=0.0)
    inconsistency_score = Column(Float, default=0.0)
    photo_consistency = Column(Float, default=0.0)
    
    # Détails
    detected_anomalies = Column(JSON, default=list)
    fraud_indicators = Column(JSON, default=list)
    recommendations = Column(JSON, default=list)
    
    # Métriques
    total_damage_score = Column(Float, default=0.0)
    avg_confidence = Column(Float, default=0.0)
    photos_analyzed = Column(Integer, default=0)
    
    # Relation
    claim = relationship("Claim", back_populates="analysis")
    
    def __repr__(self):
        return f"<ClaimAnalysis(id={self.id}, claim_id={self.claim_id})>"


class ClaimEstimate(Base):
    """Modèle d'estimation des sinistres"""
    __tablename__ = 'claim_estimates'
    __table_args__ = (
        Index('idx_claim_estimates_claim_id', 'claim_id'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    claim_id = Column(Integer, ForeignKey('claims.id', ondelete="CASCADE"), nullable=False, index=True)
    
    # Détails
    estimate_version = Column(String(20), default="1.0")
    estimate_date = Column(DateTime, default=datetime.utcnow)
    
    # Montants
    labor_cost = Column(Float, default=0.0)
    material_cost = Column(Float, default=0.0)
    other_costs = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    
    # Détail des réparations
    repair_items = Column(JSON, default=list)
    replacement_items = Column(JSON, default=list)
    
    # Notes
    notes = Column(Text, nullable=True)
    validated_by = Column(String(100), nullable=True)
    validated_at = Column(DateTime, nullable=True)
    
    # Relation
    claim = relationship("Claim", back_populates="estimate")
    
    def __repr__(self):
        return f"<ClaimEstimate(id={self.id}, claim_id={self.claim_id}, total={self.total_amount})>"


class ClaimActivity(Base):
    """Modèle d'activité de suivi des sinistres"""
    __tablename__ = 'claim_activities'
    __table_args__ = (
        Index('idx_claim_activities_claim_id', 'claim_id'),
        Index('idx_claim_activities_created_at', 'created_at'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    claim_id = Column(Integer, ForeignKey('claims.id', ondelete="CASCADE"), nullable=False, index=True)
    
    activity_type = Column(String(50), nullable=False)
    description = Column(Text, nullable=False)
    details = Column(JSON, default=dict)
    
    created_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relation
    claim = relationship("Claim", back_populates="activities")
    
    def __repr__(self):
        return f"<ClaimActivity(id={self.id}, type='{self.activity_type}')>"


# ===== FONCTIONS UTILITAIRES =====

def generate_claim_number():
    """Génère un numéro de sinistre unique"""
    return f"CLAIM-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"