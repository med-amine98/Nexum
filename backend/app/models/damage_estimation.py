# app/models/damage_estimation.py
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class DamageAnalysis(Base):
    """Analyse des dommages à partir d'images"""
    __tablename__ = "damage_analyses"
    
    id = Column(Integer, primary_key=True, index=True)
    claim_id = Column(Integer, ForeignKey("insurance_claims.id"), nullable=True)
    image_url = Column(String(500), nullable=False)
    
    # Résultats de l'analyse IA
    damage_type = Column(String(100))  # rayure, bosse, fissure, cassure, etc.
    damage_severity = Column(Integer, default=0)  # 0-10
    damage_location = Column(String(200))
    detected_parts = Column(JSON, default=[])  # Liste des pièces détectées
    confidence_score = Column(Float, default=0)  # 0-100
    
    # Métadonnées
    analyzed_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relation
    claim = relationship("InsuranceClaim", foreign_keys=[claim_id])


class DamageEstimation(Base):
    """Estimation des dommages"""
    __tablename__ = "damage_estimations"
    
    id = Column(Integer, primary_key=True, index=True)
    claim_id = Column(Integer, ForeignKey("insurance_claims.id"), nullable=True)
    analysis_id = Column(Integer, ForeignKey("damage_analyses.id"), nullable=True)
    
    # Estimation globale
    total_amount = Column(Float, nullable=False)
    confidence = Column(Float, default=0)
    
    # Détails de l'estimation
    details = Column(JSON, default=[])  # Liste des détails par pièce
    parts_affected = Column(JSON, default=[])  # Liste des pièces affectées
    
    # Statut
    is_validated = Column(Boolean, default=False)
    validated_by = Column(Integer, nullable=True)
    validated_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    claim = relationship("InsuranceClaim", foreign_keys=[claim_id])
    analysis = relationship("DamageAnalysis", foreign_keys=[analysis_id])


class RepairOption(Base):
    """Options de réparation"""
    __tablename__ = "repair_options"
    
    id = Column(Integer, primary_key=True, index=True)
    estimation_id = Column(Integer, ForeignKey("damage_estimations.id"), nullable=False)
    
    name = Column(String(200), nullable=False)
    description = Column(Text)
    cost = Column(Float, nullable=False)
    delay_days = Column(Integer, nullable=False)
    warranty_months = Column(Integer, default=12)
    recommended = Column(Boolean, default=False)
    
    # Détails de la réparation
    parts_to_replace = Column(JSON, default=[])
    labor_hours = Column(Float, default=0)
    materials_cost = Column(Float, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relation
    estimation = relationship("DamageEstimation", foreign_keys=[estimation_id])


class DamageReference(Base):
    """Base de référence des prix de réparation"""
    __tablename__ = "damage_references"
    
    id = Column(Integer, primary_key=True, index=True)
    part_name = Column(String(200), nullable=False)
    damage_type = Column(String(100), nullable=False)
    repair_cost_min = Column(Float, nullable=False)
    repair_cost_max = Column(Float, nullable=False)
    replacement_cost = Column(Float)
    labor_hours = Column(Float, default=0)
    
    # Catégorie (auto, habitation, etc.)
    category = Column(String(50), default="auto")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)