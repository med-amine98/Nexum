from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, JSON
from sqlalchemy.sql import func
from app.database import Base
import enum

class ParameterScope(str, enum.Enum):
    SYSTEM = "system"
    COMPANY = "company"
    USER = "user"

class Parameter(Base):
    __tablename__ = "parameters"
    __table_args__ = {
        "extend_existing": True
    }

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(JSON, nullable=True)
    scope = Column(Enum(ParameterScope), default=ParameterScope.SYSTEM, nullable=False)
    description = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    is_deleted = Column(Boolean, default=False, nullable=False)
