from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://odoo:odoo@localhost:5432/erp")
engine = create_engine(DATABASE_URL)
Base = declarative_base()

class KanbanTask(Base):
    __tablename__ = "kanban_tasks"
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="todo")
    priority = Column(String(20), default="medium")
    assignee = Column(String(100), nullable=True)
    order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

class UserPreference(Base):
    __tablename__ = "settings_user_preferences"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    preference_type = Column(String(50), nullable=False)
    key = Column(String(100), nullable=False)
    value = Column(Text, nullable=False) # Simplifié pour la création
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

logger.info("Migration: Creating tables...")
Base.metadata.create_all(bind=engine)
logger.info("Migration: Tables created successfully!")
