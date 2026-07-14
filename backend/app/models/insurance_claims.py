# app/models/insurance_claims.py
"""
Modèles pour les réclamations d'assurance
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON, Boolean, Enum, Index
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base


class ClaimType(str, enum.Enum):
    """Types de sinistres possibles"""
    AUTO = "AUTO"
    HABITATION = "HABITATION"
    SANTE = "SANTE"
    VIE = "VIE"
    PROFESSIONNEL = "PROFESSIONNEL"
    AUTRE = "AUTRE"
    
    @classmethod
    def _missing_(cls, value):
        """Gère les valeurs manquantes ou mal formatées"""
        if isinstance(value, str):
            value_upper = value.upper()
            for member in cls:
                if member.value == value_upper:
                    return member
        return None


class ClaimInsuranceStatus(str, enum.Enum):
    """Statut d'une réclamation d'assurance"""
    DECLARED = "declared"
    UNDER_ANALYSIS = "under_analysis"
    EXPERT_ASSIGNED = "expert_assigned"
    UNDER_EXPERTISE = "under_expertise"
    ESTIMATION_DONE = "estimation_done"
    APPROVED = "approved"
    PAID = "paid"
    REJECTED = "rejected"
    CLOSED = "closed"
    
    @classmethod
    def _missing_(cls, value):
        """Gère les valeurs manquantes"""
        if isinstance(value, str):
            value_lower = value.lower()
            for member in cls:
                if member.value == value_lower:
                    return member
        return None


class ClaimInsuranceStep(str, enum.Enum):
    """Étapes de traitement d'une réclamation"""
    DECLARATION = "declaration"
    ANALYSIS = "analysis"
    EXPERTISE = "expertise"
    INDEMNIFICATION = "indemnification"


class ClaimInsurance(Base):
    """Réclamation d'assurance"""
    __tablename__ = "claim_insurance"
    __table_args__ = (
        Index('idx_claim_insurance_client_id', 'client_id'),
        Index('idx_claim_insurance_status', 'status'),
        Index('idx_claim_insurance_claim_number', 'claim_number'),
        Index('idx_claim_insurance_created_at', 'created_at'),
        Index('idx_claim_insurance_claim_type', 'claim_type'),  # Ajout d'un index sur claim_type
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    claim_number = Column(String(50), unique=True, index=True, nullable=False)
    
    # Informations générales
    client_id = Column(Integer, ForeignKey("banking_clients.id"), nullable=False)
    client_name = Column(String(255), nullable=False)
    client_email = Column(String(255))
    client_phone = Column(String(20))
    
    # Détails de la réclamation
    claim_type = Column(Enum(ClaimType), nullable=False, default=ClaimType.AUTRE)  # ← Utilisation de l'Enum
    incident_date = Column(DateTime, nullable=False)
    incident_location = Column(Text)
    description = Column(Text, nullable=False)
    
    # Statut
    status = Column(Enum(ClaimInsuranceStatus), default=ClaimInsuranceStatus.DECLARED)
    current_step = Column(Integer, default=0)
    status_color = Column(String(20), default="processing")
    
    # Montants
    estimated_amount = Column(Float, default=0)
    approved_amount = Column(Float, default=0)
    paid_amount = Column(Float, default=0)
    
    # Dates
    declared_at = Column(DateTime, default=datetime.utcnow)
    analysis_started_at = Column(DateTime, nullable=True)
    expert_assigned_at = Column(DateTime, nullable=True)
    expertise_completed_at = Column(DateTime, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    paid_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)
    
    # Documents
    documents = Column(JSON, default=list)
    photos = Column(JSON, default=list)
    
    # Expert
    expert_id = Column(Integer, nullable=True)
    expert_name = Column(String(255), nullable=True)
    expert_phone = Column(String(20), nullable=True)
    expert_email = Column(String(255), nullable=True)
    
    # Métadonnées
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    client = relationship("Client", foreign_keys=[client_id])
    timeline = relationship(
        "ClaimInsuranceTimeline",
        back_populates="claim",
        cascade="all, delete-orphan"
    )
    required_documents = relationship(
        "ClaimInsuranceRequiredDocument",
        back_populates="claim",
        cascade="all, delete-orphan"
    )
    estimations = relationship(
        "ClaimInsuranceEstimation",
        back_populates="claim",
        cascade="all, delete-orphan"
    )
    notifications = relationship(
        "ClaimInsuranceNotification",
        back_populates="claim",
        cascade="all, delete-orphan"
    )
    
    def __repr__(self):
        return f"<ClaimInsurance(id={self.id}, number='{self.claim_number}', type='{self.claim_type}', status='{self.status}')>"
    
    def to_dict(self):
        return {
            "id": self.id,
            "claim_number": self.claim_number,
            "client_id": self.client_id,
            "client_name": self.client_name,
            "client_email": self.client_email,
            "client_phone": self.client_phone,
            "claim_type": self.claim_type.value if hasattr(self.claim_type, 'value') else str(self.claim_type),
            "incident_date": self.incident_date.isoformat() if self.incident_date else None,
            "incident_location": self.incident_location,
            "description": self.description,
            "status": self.status.value if hasattr(self.status, 'value') else str(self.status),
            "current_step": self.current_step,
            "estimated_amount": self.estimated_amount,
            "approved_amount": self.approved_amount,
            "paid_amount": self.paid_amount,
            "declared_at": self.declared_at.isoformat() if self.declared_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }


class ClaimInsuranceTimeline(Base):
    """Timeline des événements d'une réclamation"""
    __tablename__ = "claim_insurance_timelines"
    __table_args__ = (
        Index('idx_claim_insurance_timelines_claim_id', 'claim_id'),
        Index('idx_claim_insurance_timelines_date', 'date'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    claim_id = Column(Integer, ForeignKey("claim_insurance.id", ondelete="CASCADE"), nullable=False)
    
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    date = Column(DateTime, default=datetime.utcnow)
    status = Column(String(20), default="pending")
    documents = Column(JSON, default=list)
    
    claim = relationship("ClaimInsurance", back_populates="timeline")
    
    def __repr__(self):
        return f"<ClaimInsuranceTimeline(id={self.id}, claim_id={self.claim_id}, title='{self.title}')>"


class ClaimInsuranceRequiredDocument(Base):
    """Documents requis pour une réclamation"""
    __tablename__ = "claim_insurance_required_documents"
    __table_args__ = (
        Index('idx_claim_insurance_required_documents_claim_id', 'claim_id'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    claim_id = Column(Integer, ForeignKey("claim_insurance.id", ondelete="CASCADE"), nullable=False)
    
    name = Column(String(255), nullable=False)
    description = Column(Text)
    uploaded = Column(Boolean, default=False)
    uploaded_at = Column(DateTime, nullable=True)
    file_url = Column(String(500), nullable=True)
    
    claim = relationship("ClaimInsurance", back_populates="required_documents")
    
    def __repr__(self):
        return f"<ClaimInsuranceRequiredDocument(id={self.id}, claim_id={self.claim_id}, name='{self.name}')>"


class ClaimInsuranceEstimation(Base):
    """Estimations pour une réclamation"""
    __tablename__ = "claim_insurance_estimations"
    __table_args__ = (
        Index('idx_claim_insurance_estimations_claim_id', 'claim_id'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    claim_id = Column(Integer, ForeignKey("claim_insurance.id", ondelete="CASCADE"), nullable=False)
    
    estimated_amount = Column(Float, nullable=False)
    confidence = Column(Float, default=0)
    details = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    claim = relationship("ClaimInsurance", back_populates="estimations")
    
    def __repr__(self):
        return f"<ClaimInsuranceEstimation(id={self.id}, claim_id={self.claim_id}, amount={self.estimated_amount})>"


class ClaimInsuranceNotification(Base):
    """Notifications pour une réclamation"""
    __tablename__ = "claim_insurance_notifications"
    __table_args__ = (
        Index('idx_claim_insurance_notifications_claim_id', 'claim_id'),
        Index('idx_claim_insurance_notifications_client_id', 'client_id'),
        Index('idx_claim_insurance_notifications_is_read', 'is_read'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    claim_id = Column(Integer, ForeignKey("claim_insurance.id", ondelete="CASCADE"), nullable=False)
    client_id = Column(Integer, nullable=False)
    
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="info")
    is_read = Column(Boolean, default=False)
    sent_at = Column(DateTime, default=datetime.utcnow)
    
    claim = relationship("ClaimInsurance", back_populates="notifications")
    
    def __repr__(self):
        return f"<ClaimInsuranceNotification(id={self.id}, claim_id={self.claim_id}, title='{self.title}')>"