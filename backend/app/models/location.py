from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Location(Base):
    __tablename__ = "locations"
    __table_args__ = {'extend_existing': True}
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), nullable=False, unique=True)
    name = Column(String(100), nullable=False)
    zone = Column(String(50))
    aisle = Column(String(20))
    rack = Column(String(20))
    level = Column(String(20))
    description = Column(String(200))
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relations
    products = relationship("Product", back_populates="location")