from sqlalchemy import Column, Integer, String, Float, JSON, DateTime, ForeignKey
from datetime import datetime
from app.models.base import Base

class DigitalTwin(Base):
    __tablename__ = 'digital_twins'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    status = Column(String(50), default="active")  # active, maintenance, failed
    model_3d_path = Column(String(255), nullable=True)  # File path or MinIO key
    
    # Real-time sensor metrics (temperature, vibration, hours, etc.)
    sensor_data = Column(JSON, default=dict)
    
    # Predictive Analytics results
    remaining_useful_life = Column(Float, default=100.0)  # RUL in operating days
    failure_probability = Column(Float, default=0.0)      # Probability of failure (0-100%)
    
    last_sync = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    company_id = Column(Integer, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "status": self.status,
            "model_3d_path": self.model_3d_path,
            "sensor_data": self.sensor_data,
            "remaining_useful_life": self.remaining_useful_life,
            "failure_probability": self.failure_probability,
            "last_sync": self.last_sync.isoformat() if self.last_sync else None,
            "company_id": self.company_id
        }
