# app/models/fraud_detection.py - Version corrigée
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean, JSON, Index
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum
from app.database import Base

# ===== ÉNUMÉRATIONS =====
class FraudRiskLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class FraudStatus(str, enum.Enum):
    DETECTED = "detected"
    ANALYZING = "analyzing"
    BLOCKED = "blocked"
    APPROVED = "approved"
    INVESTIGATING = "investigating"
    FALSE_POSITIVE = "false_positive"

class DetectionMethod(str, enum.Enum):
    AUTOENCODER = "autoencoder"
    ISOLATION_FOREST = "isolation_forest"
    DBSCAN = "dbscan"
    ONE_CLASS_SVM = "one_class_svm"
    ENSEMBLE = "ensemble"

class FraudType(str, enum.Enum):
    TRANSACTION_FRAUD = "transaction_fraud"
    ACCOUNT_TAKEOVER = "account_takeover"
    IDENTITY_THEFT = "identity_theft"
    CARD_NOT_PRESENT = "card_not_present"
    PHISHING = "phishing"
    MONEY_LAUNDERING = "money_laundering"
    NONE = "none"

# ===== MODÈLE PRINCIPAL =====
class FraudAlert(Base):
    __tablename__ = "fraud_alerts"
    __table_args__ = (
        Index('idx_fraud_alerts_status', 'status'),
        Index('idx_fraud_alerts_risk_score', 'risk_score'),
        Index('idx_fraud_alerts_created_at', 'created_at'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    alert_id = Column(String(50), unique=True, index=True, nullable=False, default=lambda: f"ALT-{uuid.uuid4().hex[:8].upper()}")
    transaction_id = Column(String(50), unique=True, index=True, nullable=False)
    amount = Column(Float, nullable=False)
    risk_score = Column(Float, nullable=False)  # 0-100
    risk_level = Column(String(20), default="medium")
    fraud_type = Column(String(50), default="none")
    status = Column(String(20), default="detected")
    reason = Column(Text, nullable=False)
    
    # Détails de la transaction
    transaction_date = Column(DateTime, default=datetime.utcnow)
    customer_id = Column(Integer, nullable=True)
    customer_name = Column(String(200), nullable=True)
    customer_email = Column(String(100), nullable=True)
    payment_method = Column(String(50), nullable=True)
    ip_address = Column(String(45), nullable=True)
    location = Column(String(100), nullable=True)
    device_fingerprint = Column(String(100), nullable=True)
    
    # Indicateurs de risque avancés
    amount_velocity = Column(Float, default=0.0)
    location_risk = Column(Float, default=0.0)
    device_risk = Column(Float, default=0.0)
    behavioral_risk = Column(Float, default=0.0)
    temporal_risk = Column(Float, default=0.0)
    network_risk = Column(Float, default=0.0)
    
    # Scores des différentes méthodes de détection
    autoencoder_score = Column(Float, default=0.0)
    isolation_forest_score = Column(Float, default=0.0)
    dbscan_score = Column(Float, default=0.0)
    one_class_svm_score = Column(Float, default=0.0)
    ensemble_score = Column(Float, default=0.0)
    detection_method = Column(String(50), default="ensemble")
    
    # Features pour l'analyse
    features = Column(JSON, default=dict)
    anomaly_cluster = Column(Integer, nullable=True)
    anomaly_score = Column(Float, default=0.0)
    
    # IA Stratégique Détection Fraude Nexum (James)
    ai_logic_explanation = Column(Text, nullable=True)      # Vulgarisation de l'anomalie
    ai_investigation_priority = Column(Float, default=0.0)  # Priorité 0-1
    ai_suggested_actions = Column(JSON, default=list)       # Guide d'investigation
    ai_pattern_fingerprint = Column(JSON, default=dict)     # Empreinte du pattern frauduleux
    last_ai_update = Column(DateTime, default=datetime.utcnow)
    
    # Résolution
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    resolved_by = Column(Integer, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<FraudAlert(id={self.id}, transaction={self.transaction_id}, score={self.risk_score})>"
    
    def to_dict(self):
        return {
            "id": self.id,
            "alert_id": self.alert_id,
            "transaction_id": self.transaction_id,
            "amount": self.amount,
            "risk_score": self.risk_score,
            "risk_level": self.risk_level,
            "status": self.status,
            "reason": self.reason,
            "customer_name": self.customer_name,
            "customer_email": self.customer_email,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


# ===== MODÈLE POUR LES RÈGLES DE DÉTECTION =====
class FraudRule(Base):
    __tablename__ = "fraud_rules"
    __table_args__ = (
        Index('idx_fraud_rules_active', 'is_active'),
        Index('idx_fraud_rules_priority', 'priority'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(String(50), unique=True, index=True, nullable=False, default=lambda: f"RULE-{uuid.uuid4().hex[:8].upper()}")
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    rule_type = Column(String(50), nullable=False)
    condition = Column(JSON, nullable=False)
    threshold = Column(Float, nullable=False)
    risk_contribution = Column(Float, default=10.0)
    
    is_active = Column(Boolean, default=True)
    priority = Column(Integer, default=1)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<FraudRule(id={self.id}, name='{self.name}', active={self.is_active})>"


# ===== MODÈLE POUR LES CAS D'INVESTIGATION - RENOMMÉ =====
class FraudInvestigationCase(Base):  # Renommé de FraudCase à FraudInvestigationCase
    __tablename__ = "fraud_investigation_cases"  # Changé le nom de la table
    __table_args__ = (
        Index('idx_fraud_cases_status', 'status'),
        Index('idx_fraud_cases_severity', 'severity'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    case_id = Column(String(50), unique=True, index=True, nullable=False, default=lambda: f"CASE-{uuid.uuid4().hex[:8].upper()}")
    case_number = Column(String(50), unique=True, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    
    # Alertes associées
    alert_ids = Column(JSON, nullable=True)
    total_amount = Column(Float, default=0.0)
    
    # Statut
    status = Column(String(20), default="open")
    severity = Column(String(20), default="medium")
    
    # IA Stratégique Investigation Nexum (James)
    ai_case_summary = Column(Text, nullable=True)         # Résumé IA du dossier
    ai_recommended_steps = Column(JSON, default=list)     # Étapes recommandées
    ai_estimated_impact = Column(Float, default=0.0)      # Impact financier estimé
    last_ai_update = Column(DateTime, default=datetime.utcnow)
    
    # Assignation
    assigned_to = Column(Integer, nullable=True)
    investigation_notes = Column(Text, nullable=True)
    
    # Résolution
    resolved_at = Column(DateTime, nullable=True)
    resolution_type = Column(String(50), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<FraudInvestigationCase(id={self.id}, case_number='{self.case_number}', severity='{self.severity}')>"


# ===== MODÈLE POUR L'HISTORIQUE DES TRANSACTIONS =====
class TransactionHistory(Base):
    __tablename__ = "transaction_history"
    __table_args__ = (
        Index('idx_transaction_customer_id', 'customer_id'),
        Index('idx_transaction_timestamp', 'timestamp'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(String(50), unique=True, nullable=False)
    customer_id = Column(Integer, nullable=False)
    customer_name = Column(String(200), nullable=True)
    amount = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Métadonnées
    payment_method = Column(String(50), nullable=True)
    ip_address = Column(String(45), nullable=True)
    location = Column(String(100), nullable=True)
    device_id = Column(String(100), nullable=True)
    device_fingerprint = Column(String(100), nullable=True)
    
    # Métriques comportementales
    velocity_1h = Column(Integer, default=0)
    velocity_24h = Column(Integer, default=0)
    avg_amount = Column(Float, default=0.0)
    location_changes = Column(Integer, default=0)
    
    # Résultat
    fraud_score = Column(Float, default=0.0)
    fraud_risk = Column(String(20), default="low")
    is_fraudulent = Column(Boolean, default=False)
    detection_method = Column(String(50), nullable=True)
    
    # Analyse par modèles
    autoencoder_score = Column(Float, default=0.0)
    isolation_forest_score = Column(Float, default=0.0)
    dbscan_cluster = Column(Integer, nullable=True)
    one_class_svm_score = Column(Float, default=0.0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<TransactionHistory(id={self.id}, transaction='{self.transaction_id}', amount={self.amount})>"


# ===== MODÈLE POUR LES CLUSTERS D'ANOMALIES =====
class AnomalyCluster(Base):
    __tablename__ = "anomaly_clusters"
    __table_args__ = (
        Index('idx_anomaly_cluster_id', 'cluster_id'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    cluster_id = Column(Integer, nullable=False)
    cluster_type = Column(String(50), nullable=False)
    
    # Statistiques du cluster
    size = Column(Integer, default=0)
    avg_risk_score = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    
    # Caractéristiques
    features = Column(JSON, default=dict)
    centroid = Column(JSON, default=dict)
    
    # Transactions du cluster
    transaction_ids = Column(JSON, default=list)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<AnomalyCluster(id={self.id}, cluster={self.cluster_id}, size={self.size})>"


# ===== FONCTIONS UTILITAIRES =====
def generate_alert_id():
    return f"ALT-{uuid.uuid4().hex[:8].upper()}"

def generate_case_id():
    return f"CASE-{uuid.uuid4().hex[:8].upper()}"

def generate_rule_id():
    return f"RULE-{uuid.uuid4().hex[:8].upper()}"

def get_risk_level(score: float) -> str:
    if score >= 80:
        return "critical"
    elif score >= 60:
        return "high"
    elif score >= 40:
        return "medium"
    else:
        return "low"