# app/models/scraping.py
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()


class ScrapingTask(Base):
    """Modèle pour les tâches de scraping"""
    __tablename__ = "scraping_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)  # Suppression de ForeignKey("users.id")
    urls = Column(JSON, default=[])
    config = Column(JSON, default={})
    status = Column(String(50), default="pending")
    progress = Column(Integer, default=0)
    pages_scraped = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)


class ScrapingResult(Base):
    """Modèle pour les résultats de scraping"""
    __tablename__ = "scraping_results"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("scraping_tasks.id", ondelete="CASCADE"), nullable=False)
    url = Column(String(500), nullable=False)
    title = Column(String(500))
    content = Column(Text)
    page_metadata = Column(JSON, default={})
    images = Column(JSON, default=[])
    links = Column(JSON, default=[])
    scraped_at = Column(DateTime, default=datetime.utcnow)


class SocialMention(Base):
    """Modèle pour les mentions sur les réseaux sociaux"""
    __tablename__ = "social_mentions"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("scraping_tasks.id", ondelete="CASCADE"), nullable=False)
    platform = Column(String(50), nullable=False)
    author = Column(String(200))
    author_url = Column(String(500))
    content = Column(Text, nullable=False)
    published_at = Column(DateTime)
    engagement = Column(Integer, default=0)
    sentiment = Column(String(20))
    sentiment_score = Column(Float)
    url = Column(String(500))
    mention_metadata = Column(JSON, default={})


class SentimentAnalysis(Base):
    """Modèle pour l'analyse de sentiment"""
    __tablename__ = "sentiment_analyses"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("scraping_tasks.id", ondelete="CASCADE"), nullable=False)
    positive_count = Column(Integer, default=0)
    negative_count = Column(Integer, default=0)
    neutral_count = Column(Integer, default=0)
    average_score = Column(Float, default=0.0)
    top_keywords = Column(JSON, default=[])
    entities = Column(JSON, default=[])
    created_at = Column(DateTime, default=datetime.utcnow)


# Définir les relations APRÈS les classes
ScrapingTask.results = relationship("ScrapingResult", back_populates="task", cascade="all, delete-orphan")
ScrapingTask.social_mentions = relationship("SocialMention", back_populates="task", cascade="all, delete-orphan")
ScrapingTask.sentiment_analysis = relationship("SentimentAnalysis", back_populates="task", uselist=False, cascade="all, delete-orphan")

ScrapingResult.task = relationship("ScrapingTask", back_populates="results")
SocialMention.task = relationship("ScrapingTask", back_populates="social_mentions")
SentimentAnalysis.task = relationship("ScrapingTask", back_populates="sentiment_analysis")