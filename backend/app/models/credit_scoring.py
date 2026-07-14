# app/models/credit_scoring.py
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON, Boolean, Index, func, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum
from app.database import Base

# ===== ÉNUMÉRATIONS =====
class IncomeType(str, enum.Enum):
    SALAIRE = "salaire"
    FREELANCE = "freelance"
    ENTREPRISE = "entreprise"
    INVESTISSEMENTS = "investissements"
    PENSION = "pension"
    LOCATIF = "locatif"
    AUTRES = "autres"

class ExpenseType(str, enum.Enum):
    LOYER = "loyer"
    CREDIT_AUTO = "credit_auto"
    CREDIT_IMMOBILIER = "credit_immobilier"
    CREDIT_CONSOMMATION = "credit_consommation"
    PENSION = "pension"
    ASSURANCES = "assurances"
    AUTRES = "autres"

class PropertyType(str, enum.Enum):
    RESIDENCE_PRINCIPALE = "residence_principale"
    RESIDENCE_SECONDAIRE = "residence_secondaire"
    LOCATIF = "locatif"
    TERRAIN = "terrain"
    COMMERCIAL = "commercial"

class InvestmentType(str, enum.Enum):
    ACTIONS = "actions"
    OBLIGATIONS = "obligations"
    PEA = "pea"
    ASSURANCE_VIE = "assurance_vie"
    CRYPTO = "crypto"
    AUTRES = "autres"

class BankIncidentType(str, enum.Enum):
    DECOUVERT = "decouvert"
    IMPAYE = "impaye"
    FICHAGE = "fichage"
    LITIGE = "litige"

# ===== MODÈLE POUR LES REVENUS =====
class IncomeSource(Base):
    __tablename__ = 'income_sources'
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey('credit_requests.id', ondelete="CASCADE"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    type = Column(SQLEnum(IncomeType), nullable=False)
    amount = Column(Float, nullable=False)
    frequency = Column(String(20), default="mensuel")
    justification_path = Column(String(500), nullable=True)  # Chemin du justificatif
    created_at = Column(DateTime, default=datetime.utcnow)
    
    request = relationship("CreditRequest", back_populates="income_sources")

# ===== MODÈLE POUR LES CHARGES =====
class Expense(Base):
    __tablename__ = 'expenses'
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey('credit_requests.id', ondelete="CASCADE"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    type = Column(SQLEnum(ExpenseType), nullable=False)
    amount = Column(Float, nullable=False)
    creditor = Column(String(200), nullable=True)
    remaining_balance = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    request = relationship("CreditRequest", back_populates="expenses")

# ===== MODÈLE POUR LE PATRIMOINE IMMOBILIER =====
class Property(Base):
    __tablename__ = 'properties'
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey('credit_requests.id', ondelete="CASCADE"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    type = Column(SQLEnum(PropertyType), nullable=False)
    value = Column(Float, nullable=False)
    location = Column(String(300), nullable=True)
    mortgage_balance = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    request = relationship("CreditRequest", back_populates="properties")

# ===== MODÈLE POUR LES INVESTISSEMENTS =====
class Investment(Base):
    __tablename__ = 'investments'
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey('credit_requests.id', ondelete="CASCADE"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    type = Column(SQLEnum(InvestmentType), nullable=False)
    amount = Column(Float, nullable=False)
    institution = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    request = relationship("CreditRequest", back_populates="investments")

# ===== MODÈLE POUR L'HISTORIQUE BANCAIRE =====
class BankHistory(Base):
    __tablename__ = 'bank_histories'
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey('credit_requests.id', ondelete="CASCADE"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    incident_type = Column(SQLEnum(BankIncidentType), nullable=True)
    incident_date = Column(DateTime, nullable=True)
    incident_amount = Column(Float, default=0.0)
    incident_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    request = relationship("CreditRequest", back_populates="bank_histories")

# ===== MODÈLE PRINCIPAL (CREDIT REQUEST) MIS À JOUR =====
class CreditRequest(Base):
    __tablename__ = 'credit_requests'
    __table_args__ = (
        Index('idx_credit_requests_status', 'status'),
        Index('idx_credit_requests_risk_level', 'risk_level'),
        Index('idx_credit_requests_fraud_risk', 'fraud_risk'),
        Index('idx_credit_requests_request_date', 'request_date'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(String(50), unique=True, index=True, nullable=False, default=lambda: f"CR-{uuid.uuid4().hex[:8].upper()}")
    company_id = Column(Integer, ForeignKey('companies.id'), nullable=False, index=True)
    
    # Informations client
    client_name = Column(String(200), nullable=False)
    client_id = Column(String(100), nullable=True)
    client_email = Column(String(100), nullable=True)
    client_phone = Column(String(50), nullable=True)
    client_address = Column(Text, nullable=True)
    client_income = Column(Float, nullable=True)
    client_employment_years = Column(Integer, nullable=True)
    
    # IA Stratégique Scoring Nexum (Elena & James)
    ai_credit_score_v2 = Column(Integer, default=0) # Score optimisé par Nexum IA
    ai_repayment_capacity = Column(Float, default=0.0) # Capacité réelle projetée
    ai_suggested_limit = Column(Float, default=0.0) # Plafond recommandé par IA
    ai_default_risk_12m = Column(Float, default=0.0) # Risque de défaut à 12 mois
    ai_insights = Column(JSON, default=dict) # Synthèse stratégique IA
    last_ai_update = Column(DateTime, default=datetime.utcnow)
    
    # Épargne
    savings_amount = Column(Float, default=0.0)
    
    # Détails de la demande
    amount = Column(Float, nullable=False)
    term_months = Column(Integer, default=12)
    purpose = Column(String(100), nullable=True)
    
    # Scoring crédit (historique/traditionnel)
    credit_score = Column(Integer, default=0)
    approval_probability = Column(Float, default=0.0)
    risk_level = Column(String(20), default="medium")
    risk_factors = Column(JSON, default=list)
    
    # Métriques financières
    monthly_income = Column(Float, default=0.0)
    monthly_expenses = Column(Float, default=0.0)
    debt_to_income_ratio = Column(Float, default=0.0)
    
    # Détection de fraude
    fraud_risk = Column(String(20), default="low")
    fraud_score = Column(Float, default=0.0)
    fraud_type = Column(String(50), default="none")
    fraud_indicators = Column(JSON, default=list)
    detection_method = Column(String(50), default="traditional")
    
    # Dates
    request_date = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    rejected_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Statut
    status = Column(String(20), default="pending")
    
    # Notes et décisions
    notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    
    # Relations
    processed_by_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    approved_by_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    
    processed_by = relationship("User", foreign_keys=[processed_by_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])
    company = relationship("Company", foreign_keys=[company_id])
    
    # Nouvelles relations
    income_sources = relationship("IncomeSource", back_populates="request", cascade="all, delete-orphan")
    expenses = relationship("Expense", back_populates="request", cascade="all, delete-orphan")
    properties = relationship("Property", back_populates="request", cascade="all, delete-orphan")
    investments = relationship("Investment", back_populates="request", cascade="all, delete-orphan")
    bank_histories = relationship("BankHistory", back_populates="request", cascade="all, delete-orphan")
    fraud_alerts = relationship("CreditFraudAlert", back_populates="request", cascade="all, delete-orphan")
    notifications = relationship("CreditNotification", back_populates="request", cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            "id": self.id,
            "request_id": self.request_id,
            "client_name": self.client_name,
            "client_email": self.client_email,
            "amount": self.amount,
            "term_months": self.term_months,
            "purpose": self.purpose,
            "credit_score": self.credit_score,
            "risk_level": self.risk_level,
            "fraud_risk": self.fraud_risk,
            "fraud_score": self.fraud_score,
            "fraud_indicators": self.fraud_indicators or [],
            "risk_factors": self.risk_factors or [],
            "status": self.status,
            "request_date": self.request_date,
            "monthly_income": self.monthly_income,
            "monthly_expenses": self.monthly_expenses,
            "debt_to_income_ratio": self.debt_to_income_ratio,
            "savings_amount": self.savings_amount,
            "income_sources": [{"type": s.type.value, "amount": s.amount} for s in self.income_sources],
            "expenses": [{"type": e.type.value, "amount": e.amount} for e in self.expenses],
            "properties": [{"type": p.type.value, "value": p.value, "location": p.location} for p in self.properties],
            "investments": [{"type": i.type.value, "amount": i.amount} for i in self.investments],
            "bank_incidents": [{"type": b.incident_type.value if b.incident_type else None, "amount": b.incident_amount} for b in self.bank_histories]
        }

# ===== MODÈLE POUR LES ALERTES DE FRAUDE =====
class CreditFraudAlert(Base):
    __tablename__ = 'credit_fraud_alerts'
    __table_args__ = (
        Index('idx_credit_fraud_alerts_request_id', 'request_id'),
        Index('idx_credit_fraud_alerts_resolved', 'resolved'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(String(50), unique=True, index=True, nullable=False, default=lambda: f"FRD-{uuid.uuid4().hex[:8].upper()}")
    request_id = Column(Integer, ForeignKey('credit_requests.id', ondelete="CASCADE"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    
    client_name = Column(String(200), nullable=False)
    fraud_score = Column(Float, default=0.0)
    fraud_level = Column(String(20), default="medium")
    fraud_type = Column(String(50), nullable=False)
    
    # IA Stratégique Alerte Crédit Nexum
    ai_logic_explanation = Column(Text, nullable=True) # Vulgarisation de l'anomalie
    ai_investigation_priority = Column(Float, default=0.0) # Priorité 0-1
    ai_confidence_score = Column(Float, default=0.0) # Confiance de l'IA dans l'alerte
    ai_suggested_investigation_steps = Column(JSON, default=list) # Guide pour l'expert
    last_ai_update = Column(DateTime, default=datetime.utcnow)
    
    detection_method = Column(String(50), nullable=False)
    indicators = Column(JSON, default=list)
    techniques_used = Column(JSON, default=list)
    
    recommendation = Column(Text, nullable=True)
    
    resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    request = relationship("CreditRequest", foreign_keys=[request_id], back_populates="fraud_alerts")
    resolved_by = relationship("User", foreign_keys=[resolved_by_id])

# ===== MODÈLE POUR LES NOTIFICATIONS =====
class CreditNotification(Base):
    __tablename__ = 'credit_notifications'
    __table_args__ = (
        Index('idx_credit_notifications_request_id', 'request_id'),
        Index('idx_credit_notifications_sent', 'sent'),
        Index('idx_credit_notifications_created_at', 'created_at'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    notification_id = Column(String(50), unique=True, index=True, nullable=False, default=lambda: f"NOTIF-{uuid.uuid4().hex[:8].upper()}")
    request_id = Column(Integer, ForeignKey('credit_requests.id', ondelete="CASCADE"), nullable=False)
    
    notification_type = Column(String(50), nullable=False)
    severity = Column(String(20), default="info")
    
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    data = Column(JSON, default=dict)
    
    recipient_email = Column(String(100), nullable=True)
    recipient_phone = Column(String(50), nullable=True)
    recipient_user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    
    sent = Column(Boolean, default=False)
    sent_at = Column(DateTime, nullable=True)
    read = Column(Boolean, default=False)
    read_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    
    request = relationship("CreditRequest", foreign_keys=[request_id], back_populates="notifications")
    recipient_user = relationship("User", foreign_keys=[recipient_user_id])

# ===== MODÈLE POUR LES CLIENTS =====
class CreditClient(Base):
    __tablename__ = 'credit_clients'
    __table_args__ = (
        Index('idx_credit_clients_email', 'client_email'),
        Index('idx_credit_clients_phone', 'client_phone'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(String(50), unique=True, index=True, nullable=False, default=lambda: f"CL-{uuid.uuid4().hex[:8].upper()}")
    client_name = Column(String(200), nullable=False)
    client_email = Column(String(100), nullable=True)
    client_phone = Column(String(50), nullable=True)
    client_address = Column(Text, nullable=True)
    client_income = Column(Float, nullable=True)
    client_employment_years = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            "id": self.id,
            "client_id": self.client_id,
            "client_name": self.client_name,
            "client_email": self.client_email,
            "client_phone": self.client_phone,
            "client_address": self.client_address,
            "client_income": self.client_income,
            "client_employment_years": self.client_employment_years,
            "created_at": self.created_at
        }

# ===== FONCTIONS UTILITAIRES =====
def generate_request_id():
    return f"CR-{uuid.uuid4().hex[:8].upper()}"

def generate_client_id():
    return f"CL-{uuid.uuid4().hex[:8].upper()}"

def generate_alert_id():
    return f"FRD-{uuid.uuid4().hex[:8].upper()}"

def generate_notification_id():
    return f"NOTIF-{uuid.uuid4().hex[:8].upper()}"