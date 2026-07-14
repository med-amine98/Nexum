# backend/app/models/profile/user_activity.py
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import uuid

Base = declarative_base()

class ProfileActivity(Base):
    """Modèle pour les activités du profil utilisateur"""
    __tablename__ = "profile_activities"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    
    # Activité spécifique au profil
    action = Column(String(255), nullable=False)  # update_profile, change_password, etc.
    status = Column(String(50), default="success")
    
    # Métadonnées
    field_changed = Column(String(100), nullable=True)  # Quel champ a été modifié
    old_value = Column(JSON, nullable=True)
    new_value = Column(JSON, nullable=True)
    
    # Contexte
    ip_address = Column(String(50))
    user_agent = Column(String(500))
    location = Column(String(255))
    
    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    def __repr__(self):
        return f"<ProfileActivity {self.action} at {self.created_at}>"