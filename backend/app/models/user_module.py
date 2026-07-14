from sqlalchemy import Column, Integer, Boolean, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.models.base import Base

class UserModule(Base):
    __tablename__ = "user_modules"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    module_id = Column(Integer, nullable=False)
    is_favorite = Column(Boolean, default=False)
    is_installed = Column(Boolean, default=True)
    is_paid = Column(Boolean, default=False)
    company_id = Column(Integer, nullable=True)
    installed_at = Column(DateTime, default=func.now())
    created_at = Column(DateTime, default=func.now())
    payment_date = Column(DateTime, nullable=True)