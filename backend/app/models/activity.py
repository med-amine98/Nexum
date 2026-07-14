# app/models/activity.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base

class ActivityType(str, enum.Enum):
    APPEL = "appel"
    EMAIL = "email"
    REUNION = "réunion"
    TACHE = "tâche"
    NOTE = "note"
    RENDEZ_VOUS = "rendez-vous"

class Activity(Base):
    __tablename__ = "activities"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    
    activity_type = Column(Enum(ActivityType), nullable=False)
    description = Column(Text, nullable=False)
    
    scheduled_date = Column(DateTime, nullable=True)
    completed_date = Column(DateTime, nullable=True)
    
    outcome = Column(String(500), nullable=True)
    created_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relations
    lead = relationship("Lead", back_populates="activities")
    
    @property
    def lead_name(self):
        return self.lead.full_name if self.lead else None