from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, JSON, Text, ForeignKey
from app.database import Base
from datetime import datetime

class Tax(Base):
    __tablename__ = "taxes"
    __table_args__ = {'extend_existing': True}
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    rate = Column(Float, nullable=False)  # 20.0 pour 20%
    code = Column(String(20), unique=True)
    
    # Comptes comptables
    account_id = Column(Integer, nullable=True)  # Compte de TVA collectée/déductible
    
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)
    company_id = Column(Integer, nullable=True, index=True) # ForeignKey("companies.id") à ajouter si nécessaire
    
    # IA Stratégique Fiscale Nexum (Elena)
    ai_optimization_score = Column(Float, default=0.0) # Score d'efficacité fiscale 0-1
    ai_compliance_risk = Column(Float, default=0.0) # Risque d'audit ou erreur 0-1
    ai_suggested_adjustments = Column(JSON, default=dict) # Recommandations optimisation
    ai_insights = Column(JSON, default=dict) # Analyse stratégique globale
    last_ai_update = Column(DateTime, default=datetime.utcnow)
    
    created_at = Column(DateTime, default=datetime.utcnow)