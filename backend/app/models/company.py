from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, JSON, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum

class CompanySector(str, enum.Enum):
    BANK = "BANK"  # Majuscules comme dans la base
    INSURANCE = "INSURANCE"  # Majuscules
    ENTERPRISE = "ENTERPRISE"  # Majuscules
    TECH = "TECH"
    COMMERCE = "COMMERCE"
    INDUSTRY = "INDUSTRY"
    SERVICE = "SERVICE"
    OTHER = "OTHER"  # Majuscules

class CompanySize(str, enum.Enum):
    MICRO = "1-10"
    SMALL = "11-50"
    MEDIUM = "51-200"
    LARGE = "201-500"
    ENTERPRISE = "500+"

class Company(Base):
    __tablename__ = "companies"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    legal_name = Column(String(200), nullable=True)
    
    # Secteur et taille
    sector = Column(Enum(CompanySector), nullable=False)
    size = Column(Enum(CompanySize), nullable=True)
    
    # Identification
    registration_number = Column(String(50), nullable=True)
    siret = Column(String(50), nullable=True)
    
    # Adresse
    address = Column(String(200), nullable=True)
    address2 = Column(String(200), nullable=True)
    city = Column(String(100), nullable=True)
    postal_code = Column(String(20), nullable=True)
    country = Column(String(50), nullable=True)
    
    # Contact
    phone = Column(String(20), nullable=True)
    email = Column(String(100), nullable=True)
    website = Column(String(200), nullable=True)
    
    # Logo et branding
    logo_url = Column(String(500), nullable=True)
    primary_color = Column(String(20), default="#1890ff")
    
    # Statut
    is_active = Column(Boolean, default=True)
    subscription_tier = Column(String(50), default="free")
    subscription_expires = Column(DateTime, nullable=True)
    grace_period_until = Column(DateTime, nullable=True)
    
    # Relations
    users = relationship("User", back_populates="company", cascade="all, delete-orphan")
    
    # Dates
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())