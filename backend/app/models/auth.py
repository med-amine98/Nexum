# app/models/auth.py
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Table, Text, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base

# Énumérations
class UserRole(str, enum.Enum):
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"
    USER = "user"
    MANAGER = "manager"

class UserStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING = "pending"

class AuditAction(str, enum.Enum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    READ = "read"
    LOGIN = "login"
    LOGOUT = "logout"
    EXPORT = "export"
    IMPORT = "import"

# Table d'association pour les rôles et permissions
role_permissions = Table(
    'role_permissions',
    Base.metadata,
    Column('role_id', Integer, ForeignKey('roles.id')),
    Column('permission_id', Integer, ForeignKey('permissions.id'))
)

# Table d'association pour les utilisateurs et rôles
user_roles = Table(
    'user_roles',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id')),
    Column('role_id', Integer, ForeignKey('roles.id'))
)

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(200), nullable=False)
    full_name = Column(String(200), nullable=True)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    
    # Informations de l'entreprise (champs ajoutés pour le frontend)
    company_name = Column(String(200), nullable=True)
    company_size = Column(String(50), nullable=True)
    registration_number = Column(String(100), nullable=True)
    position = Column(String(100), nullable=True)
    bio = Column(Text, nullable=True)
    website = Column(String(200), nullable=True)
    github = Column(String(100), nullable=True)
    linkedin = Column(String(200), nullable=True)
    twitter = Column(String(100), nullable=True)
    avatar = Column(String(500), nullable=True)
    
    address = Column(String(500), nullable=True)
    city = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True)
    siret = Column(String(50), nullable=True)
    phone = Column(String(50), nullable=True)
    
    # Statut utilisateur
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    role = Column(SQLEnum(UserRole), default=UserRole.USER)
    status = Column(SQLEnum(UserStatus), default=UserStatus.ACTIVE)
    two_factor_enabled = Column(Boolean, default=False)
    email_verified = Column(Boolean, default=False)
    notification_settings = Column(JSON, nullable=True)
    security_settings = Column(JSON, nullable=True)
    
    # Relations
    company_id = Column(Integer, ForeignKey('companies.id'), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    
    # Relations
    company = relationship("Company", foreign_keys=[company_id])
    roles = relationship("Role", secondary=user_roles, back_populates="users")
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")

class UserSession(Base):
    __tablename__ = 'user_sessions'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    token = Column(String(500), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(Text, nullable=True)
    
    # Relations
    user = relationship("User", back_populates="sessions")

class Role(Base):
    __tablename__ = 'roles'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relations
    users = relationship("User", secondary=user_roles, back_populates="roles")
    permissions = relationship("Permission", secondary=role_permissions, back_populates="roles")

class Permission(Base):
    __tablename__ = 'permissions'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    code = Column(String(100), unique=True, nullable=False)
    module = Column(String(100), nullable=True)
    description = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relations
    roles = relationship("Role", secondary=role_permissions, back_populates="permissions")

class AuditLog(Base):
    __tablename__ = 'audit_logs'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    action = Column(SQLEnum(AuditAction), nullable=False)
    resource = Column(String(100), nullable=False)  # Nom de la table/module
    resource_id = Column(String(100), nullable=True)  # ID de l'enregistrement
    old_data = Column(JSON, nullable=True)  # Anciennes données
    new_data = Column(JSON, nullable=True)  # Nouvelles données
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relations
    user = relationship("User", back_populates="audit_logs")