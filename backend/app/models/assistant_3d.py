from sqlalchemy import Column, String, JSON
from app.models.base import BaseModel

class Assistant3D(BaseModel):
    __tablename__ = "assistant_3d"

    # Human‑readable name of the assistant instance
    name = Column(String(100), nullable=False)
    # Optional description
    description = Column(String(255), nullable=True)
    # Path or URL to the 3‑D model/asset (e.g., stored in MinIO or local static folder)
    model_3d_path = Column(String(255), nullable=True)
    # JSON configuration for UI settings, animations, etc.
    config = Column(JSON, default=dict)
