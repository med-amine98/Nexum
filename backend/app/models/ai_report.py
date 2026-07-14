# app/models/ai_report.py
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class AIReport(Base):
    """Modèle pour les rapports générés par l'IA"""
    __tablename__ = "ai_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)  # Suppression de ForeignKey("users.id")
    title = Column(String(500))
    prompt = Column(Text)
    content = Column(Text)
    insights = Column(JSON, default=[])
    recommendations = Column(JSON, default=[])
    report_metadata = Column(JSON, default={})
    scraping_task_id = Column(Integer, nullable=True)
    generation_time = Column(Float)
    tokens_used = Column(Integer)
    relevance_score = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)