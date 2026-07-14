# app/models/settings.py
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON, Boolean, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base

class PreferenceType(str, enum.Enum):
    GENERAL = "general"
    NOTIFICATION = "notification"
    APPEARANCE = "appearance"
    SECURITY = "security"

class RulePriority(str, enum.Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class RuleAction(str, enum.Enum):
    BLOCK = "bloquer"
    ALERT = "alerter"
    VALIDATE = "valider"
    LOG = "journaliser"

class IntegrationType(str, enum.Enum):
    REST = "rest"
    SOAP = "soap"
    GRAPHQL = "graphql"
    WEBHOOK = "webhook"

class IntegrationStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"

class UserRole(str, enum.Enum):
    ADMIN = "administrateur"
    MANAGER = "manager"
    USER = "utilisateur"


class UserPreference(Base):
    """Préférences utilisateur"""
    __tablename__ = "settings_user_preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    preference_type = Column(Enum(PreferenceType), nullable=False)
    key = Column(String(100), nullable=False)
    value = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class BusinessRule(Base):
    """Règles métier"""
    __tablename__ = "settings_business_rules"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    condition = Column(Text, nullable=False)
    action = Column(Enum(RuleAction), nullable=False)
    priority = Column(Enum(RulePriority), default=RulePriority.MEDIUM)
    is_enabled = Column(Boolean, default=True)
    created_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Integration(Base):
    """Intégrations API"""
    __tablename__ = "settings_integrations"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    type = Column(Enum(IntegrationType), nullable=False)
    url = Column(String(500), nullable=False)
    credentials = Column(Text, nullable=True)
    headers = Column(JSON, nullable=True)
    mapping = Column(JSON, nullable=True)
    status = Column(Enum(IntegrationStatus), default=IntegrationStatus.INACTIVE)
    last_test_at = Column(DateTime, nullable=True)
    last_error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SecurityConfig(Base):
    """Configuration de sécurité"""
    __tablename__ = "settings_security_config"
    
    id = Column(Integer, primary_key=True, index=True)
    two_factor_auth = Column(Boolean, default=False)
    password_expiry_days = Column(Integer, default=90)
    session_timeout_minutes = Column(Integer, default=30)
    max_login_attempts = Column(Integer, default=5)
    allowed_ips = Column(JSON, default=[])
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SystemUser(Base):
    """Utilisateurs système"""
    __tablename__ = "settings_system_users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(200))
    role = Column(Enum(UserRole), default=UserRole.USER)
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)