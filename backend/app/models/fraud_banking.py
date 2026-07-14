from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, JSON, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class FraudTransaction(Base):
    __tablename__ = "fraud_transactions"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    transaction_id = Column(String(50), unique=True, index=True, nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(3), default="EUR")
    
    # Client
    client_name = Column(String(200), nullable=False)
    client_id = Column(String(50), index=True)
    account_number = Column(String(50), nullable=True)
    
    # Localisation
    location = Column(String(200), nullable=False)
    ip_address = Column(String(45), nullable=True)
    device_id = Column(String(100), nullable=True)
    
    # Analyse de risque
    risk_level = Column(String(20), default="low")
    risk_score = Column(Float, default=0.0)
    fraud_probability = Column(Float, default=0.0)
    
    # Indicateurs de fraude
    fraud_indicators = Column(JSON, default=list)
    suspicious_patterns = Column(JSON, default=list)
    
    # IA Stratégique Fraude Bancaire Nexum (James)
    ai_anomaly_score = Column(Float, default=0.0)          # Score d'anomalie comportementale
    ai_network_risk = Column(Float, default=0.0)           # Risque réseau de fraude
    ai_suggested_action = Column(String(50), nullable=True) # Action recommandée par IA
    ai_insights = Column(JSON, default=dict)               # Synthèse stratégique
    last_ai_update = Column(DateTime, server_default=func.now())
    
    # Statut
    status = Column(String(20), default="investigating")
    blocked_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    
    # Métadonnées
    transaction_date = Column(DateTime, nullable=False)
    detection_date = Column(DateTime, server_default=func.now())
    
    # Notes
    notes = Column(Text, nullable=True)
    analyst_notes = Column(Text, nullable=True)
    
    # Relations
    banking_alerts = relationship("FraudBankingAlert", back_populates="transaction")
    company = relationship("Company", foreign_keys=[company_id])
    analyzed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    analyzed_by = relationship("User", foreign_keys=[analyzed_by_id])

class FraudBankingAlert(Base):  # Nom changé pour éviter conflit
    __tablename__ = "fraud_banking_alerts"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer, ForeignKey("fraud_transactions.id"))
    
    alert_type = Column(String(100), nullable=False)
    severity = Column(String(20), default="medium")
    description = Column(Text, nullable=False)
    
    # Détails
    rule_name = Column(String(200), nullable=True)
    rule_score = Column(Float, default=0.0)
    triggered_at = Column(DateTime, server_default=func.now())
    
    # Résolution
    resolved_at = Column(DateTime, nullable=True)
    resolved_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Relations
    transaction = relationship("FraudTransaction", back_populates="banking_alerts")
    resolved_by_user = relationship("User", foreign_keys=[resolved_by_user_id])

class FraudBankingRule(Base):  # Nom changé
    __tablename__ = "fraud_banking_rules"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    rule_name = Column(String(200), unique=True, nullable=False)
    rule_description = Column(Text)
    rule_type = Column(String(50), nullable=False)
    
    # Paramètres
    parameters = Column(JSON, default=dict)
    threshold = Column(Float, nullable=False)
    risk_score = Column(Float, default=0.0)
    
    # Activation
    is_active = Column(Boolean, default=True)
    priority = Column(Integer, default=0)
    
    # Métadonnées
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by = relationship("User", foreign_keys=[created_by_id])
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

class FraudBankingStats(Base):  # Nom changé
    __tablename__ = "fraud_banking_stats"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, nullable=False, index=True)
    
    total_detected = Column(Integer, default=0)
    blocked = Column(Integer, default=0)
    investigating = Column(Integer, default=0)
    false_positive = Column(Integer, default=0)
    amount_saved = Column(Float, default=0.0)
    
    # Détails
    by_risk_level = Column(JSON, default=dict)
    by_location = Column(JSON, default=dict)
    by_hour = Column(JSON, default=dict)