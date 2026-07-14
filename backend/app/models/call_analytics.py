# app/models/call_analytics.py - Version corrigée
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, JSON, ForeignKey, Enum as SQLEnum
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import enum

from app.database import Base

class CallStatus(str, enum.Enum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    MISSED = "missed"
    CANCELLED = "cancelled"

class CallSentiment(str, enum.Enum):
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"

class CallTopic(str, enum.Enum):
    SERVICE = "service_client"
    FACTURE = "facturation"
    DOSSIER = "dossier"
    TECHNICAL = "technique"
    COMPLAINT = "reclamation"
    OTHER = "autre"


class CallRecord(Base):
    __tablename__ = "call_records"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    call_id = Column(String(100), unique=True, index=True)
    
    # Informations client
    client_name = Column(String(100))
    client_phone = Column(String(20))
    
    # Métadonnées de l'appel
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime)
    duration_seconds = Column(Integer, default=0)
    status = Column(SQLEnum(CallStatus), default=CallStatus.COMPLETED)
    
    # Audio
    audio_url = Column(String(500))
    audio_file_path = Column(String(500))
    
    # Analyse IA
    sentiment_score = Column(Float, default=0.0)
    sentiment_label = Column(SQLEnum(CallSentiment), default=CallSentiment.NEUTRAL)
    satisfaction_score = Column(Integer, default=0)
    
    # Transcription et résumé
    transcription = Column(JSON, default=list)
    summary = Column(Text)
    recommendations = Column(JSON, default=list)
    topics = Column(JSON, default=list)
    keywords = Column(JSON, default=list)
    
    # Métriques de conversation
    agent_talk_ratio = Column(Float, default=0.0)
    client_talk_ratio = Column(Float, default=0.0)
    silence_ratio = Column(Float, default=0.0)
    
    # Métadonnées IA avancées
    ai_intent_detection = Column(JSON, default=dict)
    ai_urgency_score = Column(Float, default=0.0)
    ai_upsell_opportunity = Column(JSON, default=dict)
    ai_agent_coaching = Column(JSON, default=dict)
    ai_insights = Column(JSON, default=dict)
    last_ai_update = Column(DateTime, default=datetime.utcnow)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CallAnalytics(Base):
    __tablename__ = "call_analytics"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    call_id = Column(Integer, ForeignKey("call_records.id"), nullable=False)
    
    # Analyse avancée
    sentiment_timeline = Column(JSON, default=list)
    emotions = Column(JSON, default=list)
    key_phrases = Column(JSON, default=list)
    named_entities = Column(JSON, default=list)
    interruptions = Column(Integer, default=0)
    response_time = Column(Float, default=0.0)
    quality_score = Column(Float, default=0.0)
    
    created_at = Column(DateTime, default=datetime.utcnow)


class CallTopicStats(Base):
    __tablename__ = "call_topic_stats"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, nullable=False)
    topic = Column(String(50), nullable=False)
    count = Column(Integer, default=0)
    positive_count = Column(Integer, default=0)
    negative_count = Column(Integer, default=0)
    avg_satisfaction = Column(Float, default=0.0)
    
    created_at = Column(DateTime, default=datetime.utcnow)


class CallDailyStats(Base):
    __tablename__ = "call_daily_stats"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, nullable=False, unique=True)
    total_calls = Column(Integer, default=0)
    avg_duration = Column(Float, default=0.0)
    avg_sentiment = Column(Float, default=0.0)
    avg_satisfaction = Column(Float, default=0.0)
    positive_calls = Column(Integer, default=0)
    neutral_calls = Column(Integer, default=0)
    negative_calls = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)