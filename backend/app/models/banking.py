# app/models/banking.py
"""
Modèles pour le module Banking
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON, Boolean, Enum, Index
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base


class TransactionStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    BLOCKED = "blocked"
    SUSPICIOUS = "suspicious"


class TransactionType(str, enum.Enum):
    TRANSFER = "virement"
    CARD = "carte"
    DIRECT_DEBIT = "prélèvement"
    CASH = "espèces"
    CHECK = "chèque"


class FraudLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RiskLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AccountType(str, enum.Enum):
    CURRENT = "courant"
    SAVINGS = "épargne"
    BUSINESS = "professionnel"
    JOINT = "joint"


class LoanStatus(str, enum.Enum):
    PENDING = "en_attente"
    APPROVED = "approuvé"
    REJECTED = "rejeté"
    ACTIVE = "actif"
    CLOSED = "clôturé"


class Client(Base):
    """Modèle Client Banking"""
    __tablename__ = "banking_clients"
    __table_args__ = (
        Index('idx_banking_clients_email', 'email'),
        Index('idx_banking_clients_phone', 'phone'),
        Index('idx_banking_clients_status', 'is_active'),
        Index('idx_banking_clients_risk_level', 'risk_level'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(String(50), unique=True, index=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True)
    phone = Column(String(20))
    address = Column(Text)
    city = Column(String(100))
    postal_code = Column(String(20))
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    segment = Column(String(20), default="standard")
    profession = Column(String(100))
    annual_income = Column(Float, default=0)
    credit_score = Column(Integer, default=500)
    risk_level = Column(String(20), default="low")
    risk_score = Column(Float, default=0)
    
    total_transactions = Column(Integer, default=0)
    total_spent = Column(Float, default=0)
    average_transaction = Column(Float, default=0)
    last_activity = Column(DateTime, nullable=True)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    agency_id = Column(Integer, ForeignKey("banking_agencies.id"), nullable=True)
    
    # Relations - Utiliser BankAccount au lieu de Account
    agency = relationship("Agency", foreign_keys=[agency_id])
    accounts = relationship("BankAccount", back_populates="client", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="client", cascade="all, delete-orphan")
    loans = relationship("Loan", back_populates="client", cascade="all, delete-orphan")
    fraud_alerts = relationship("BankingFraudAlert", back_populates="client", cascade="all, delete-orphan")  # ← Changé


class BankAccount(Base):
    """Modèle Compte Bancaire - RENOMMÉ de Account à BankAccount"""
    __tablename__ = "banking_accounts"
    __table_args__ = (
        Index('idx_banking_accounts_account_number', 'account_number'),
        Index('idx_banking_accounts_iban', 'iban'),
        Index('idx_banking_accounts_client_id', 'client_id'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    account_number = Column(String(50), unique=True, index=True, nullable=False)
    iban = Column(String(34), unique=True, index=True)
    account_type = Column(Enum(AccountType), default=AccountType.CURRENT)
    balance = Column(Float, default=0)
    currency = Column(String(3), default="EUR")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    client_id = Column(Integer, ForeignKey("banking_clients.id"))
    
    # Relations
    client = relationship("Client", back_populates="accounts")
    transactions = relationship("Transaction", foreign_keys="Transaction.account_id", back_populates="account")


class Transaction(Base):
    """Modèle Transaction Bancaire"""
    __tablename__ = "banking_transactions"
    __table_args__ = (
        Index('idx_banking_transactions_transaction_id', 'transaction_id'),
        Index('idx_banking_transactions_client_id', 'client_id'),
        Index('idx_banking_transactions_account_id', 'account_id'),
        Index('idx_banking_transactions_timestamp', 'timestamp'),
        Index('idx_banking_transactions_status', 'status'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(String(50), unique=True, index=True, nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(3), default="EUR")
    transaction_type = Column(Enum(TransactionType), default=TransactionType.TRANSFER)
    status = Column(Enum(TransactionStatus), default=TransactionStatus.PENDING)
    description = Column(Text, nullable=True)
    reference = Column(String(100), nullable=True)
    
    # Détails de la transaction
    counterparty_name = Column(String(255), nullable=True)
    counterparty_iban = Column(String(34), nullable=True)
    counterparty_bic = Column(String(11), nullable=True)
    
    # Détection de fraude
    fraud_score = Column(Float, default=0)
    fraud_level = Column(Enum(FraudLevel), default=FraudLevel.LOW)
    fraud_indicators = Column(JSON, nullable=True)
    fraud_analysis = Column(JSON, nullable=True)
    
    # IA Stratégique Transactionnelle Nexum
    ai_category = Column(String(100), nullable=True) # Catégorisation auto par IA
    ai_merchant_analysis = Column(JSON, default=dict) # Analyse du marchand/prestataire
    ai_cashflow_impact = Column(Float, default=0.0) # Impact sur le cashflow (prévisionnel)
    ai_insights = Column(JSON, default=dict) # Analyse contextuelle IA
    last_ai_update = Column(DateTime, default=datetime.utcnow)
    
    # Métadonnées
    ip_address = Column(String(45), nullable=True)
    device_id = Column(String(255), nullable=True)
    location = Column(String(255), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    client_id = Column(Integer, ForeignKey("banking_clients.id"))
    account_id = Column(Integer, ForeignKey("banking_accounts.id"))
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    
    # Relations
    client = relationship("Client", back_populates="transactions")
    account = relationship("BankAccount", back_populates="transactions")


class Loan(Base):
    """Modèle Prêt Bancaire"""
    __tablename__ = "banking_loans"
    __table_args__ = (
        Index('idx_banking_loans_loan_number', 'loan_number'),
        Index('idx_banking_loans_client_id', 'client_id'),
        Index('idx_banking_loans_status', 'status'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    loan_number = Column(String(50), unique=True, index=True, nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    duration_months = Column(Integer, nullable=False)
    interest_rate = Column(Float, nullable=False)
    monthly_payment = Column(Float, nullable=False)
    purpose = Column(String(255), nullable=True)
    status = Column(Enum(LoanStatus), default=LoanStatus.PENDING)
    
    # IA Stratégique Crédit Nexum
    ai_approval_probability = Column(Float, default=0.0) # Score d'acceptation estimé
    ai_default_risk = Column(Float, default=0.0) # Risque de défaut prédictif
    ai_suggested_rate = Column(Float, nullable=True) # Taux recommandé par IA
    ai_insights = Column(JSON, default=dict) # Analyse solvabilité IA
    last_ai_update = Column(DateTime, default=datetime.utcnow)
    
    credit_score_at_application = Column(Integer, nullable=False)
    risk_assessment_score = Column(Float, default=0)
    approved_at = Column(DateTime, nullable=True)
    disbursed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    client_id = Column(Integer, ForeignKey("banking_clients.id"))
    
    # Relations
    client = relationship("Client", back_populates="loans")


class BankingFraudAlert(Base):
    """Modèle Alerte Fraude Bancaire - RENOMMÉ de FraudAlert à BankingFraudAlert"""
    __tablename__ = "banking_fraud_alerts"
    __table_args__ = (
        Index('idx_banking_fraud_alerts_alert_id', 'alert_id'),
        Index('idx_banking_fraud_alerts_client_id', 'client_id'),
        Index('idx_banking_fraud_alerts_fraud_level', 'fraud_level'),
        Index('idx_banking_fraud_alerts_is_resolved', 'is_resolved'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(String(50), unique=True, index=True, nullable=False)
    transaction_id = Column(String(50), nullable=False)
    amount = Column(Float, nullable=False)
    fraud_score = Column(Float, nullable=False)
    fraud_level = Column(Enum(FraudLevel), nullable=False)
    description = Column(Text, nullable=False)
    indicators = Column(JSON, nullable=True)
    detection_method = Column(String(100), nullable=True)
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)
    resolution_note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    client_id = Column(Integer, ForeignKey("banking_clients.id"))
    
    # Relations
    client = relationship("Client", back_populates="fraud_alerts")


class AMLAAlert(Base):
    """Modèle Alerte AML (Anti-Blanchiment)"""
    __tablename__ = "banking_aml_alerts"
    __table_args__ = (
        Index('idx_banking_aml_alerts_alert_id', 'alert_id'),
        Index('idx_banking_aml_alerts_alert_type', 'alert_type'),
        Index('idx_banking_aml_alerts_level', 'level'),
        Index('idx_banking_aml_alerts_is_investigated', 'is_investigated'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(String(50), unique=True, index=True, nullable=False)
    client_id = Column(String(50), nullable=False)
    client_name = Column(String(255), nullable=False)
    alert_type = Column(String(100), nullable=False)
    level = Column(Enum(FraudLevel), default=FraudLevel.MEDIUM)
    amount = Column(Float, nullable=False)
    description = Column(Text, nullable=False)
    transactions = Column(JSON, nullable=True)
    is_investigated = Column(Boolean, default=False)
    investigated_at = Column(DateTime, nullable=True)
    investigation_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class MarketData(Base):
    """Modèle Données de Marché"""
    __tablename__ = "banking_market_data"
    __table_args__ = (
        Index('idx_banking_market_data_symbol', 'symbol'),
        Index('idx_banking_market_data_timestamp', 'timestamp'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(20), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    price = Column(Float, nullable=False)
    variation = Column(Float, default=0)
    volume = Column(Integer, default=0)
    market_cap = Column(Float, nullable=True)
    sector = Column(String(100), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)


class RiskMetric(Base):
    """Modèle Métrique de Risque"""
    __tablename__ = "banking_risk_metrics"
    __table_args__ = (
        Index('idx_banking_risk_metrics_category', 'category'),
        Index('idx_banking_risk_metrics_timestamp', 'timestamp'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    metric_name = Column(String(100), nullable=False)
    metric_value = Column(Float, nullable=False)
    category = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)


class CreditScoreHistory(Base):
    """Modèle Historique Score de Crédit"""
    __tablename__ = "banking_credit_score_history"
    __table_args__ = (
        Index('idx_banking_credit_score_history_client_id', 'client_id'),
        Index('idx_banking_credit_score_history_created_at', 'created_at'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("banking_clients.id"), nullable=False)
    score = Column(Integer, nullable=False)
    factors = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Country(Base):
    """Modèle Pays"""
    __tablename__ = "banking_countries"
    __table_args__ = (
        Index('idx_banking_countries_code', 'code'),
        Index('idx_banking_countries_name', 'name'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(2), unique=True, nullable=False)
    currency = Column(String(3), default="EUR")
    central_bank = Column(String(200))
    latitude = Column(Float)
    longitude = Column(Float)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    agencies = relationship("Agency", back_populates="country")


class Agency(Base):
    """Modèle Agence Bancaire"""
    __tablename__ = "banking_agencies"
    __table_args__ = (
        Index('idx_banking_agencies_code', 'code'),
        Index('idx_banking_agencies_city', 'city'),
        Index('idx_banking_agencies_country_id', 'country_id'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    address = Column(Text)
    city = Column(String(100))
    postal_code = Column(String(20))
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    phone = Column(String(20))
    email = Column(String(255))
    manager = Column(String(100))
    
    employees = Column(Integer, default=0)
    total_clients = Column(Integer, default=0)
    total_deposits = Column(Float, default=0)
    total_loans = Column(Float, default=0)
    performance_score = Column(Float, default=85)
    
    has_atm = Column(Boolean, default=True)
    has_advisor = Column(Boolean, default=True)
    has_parking = Column(Boolean, default=False)
    has_wheelchair = Column(Boolean, default=True)
    
    opening_hours = Column(JSON)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    country_id = Column(Integer, ForeignKey("banking_countries.id"))
    
    # Relations
    country = relationship("Country", back_populates="agencies")
    performances = relationship("AgencyPerformance", back_populates="agency")
    clients = relationship("Client", back_populates="agency")


class AgencyPerformance(Base):
    """Modèle Performance d'Agence"""
    __tablename__ = "banking_agency_performances"
    __table_args__ = (
        Index('idx_banking_agency_performances_agency_id', 'agency_id'),
        Index('idx_banking_agency_performances_date', 'date'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    agency_id = Column(Integer, ForeignKey("banking_agencies.id"))
    date = Column(DateTime, default=datetime.utcnow)
    clients_count = Column(Integer, default=0)
    deposits_amount = Column(Float, default=0)
    loans_amount = Column(Float, default=0)
    transactions_count = Column(Integer, default=0)
    satisfaction_score = Column(Float, default=85)
    
    # Relations
    agency = relationship("Agency", back_populates="performances")


class BankingProduct(Base):
    """Modèle Produit Bancaire"""
    __tablename__ = "banking_products"
    __table_args__ = (
        Index('idx_banking_products_code', 'code'),
        Index('idx_banking_products_product_type', 'product_type'),
        Index('idx_banking_products_category', 'category'),
        {'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    product_type = Column(String(50), nullable=False)
    category = Column(String(50))
    description = Column(Text)
    interest_rate = Column(Float, default=0)
    min_amount = Column(Float, default=0)
    max_amount = Column(Float, nullable=True)
    duration_months = Column(Integer, nullable=True)
    fees = Column(Float, default=0)
    outstanding_amount = Column(Float, default=0)
    clients_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)