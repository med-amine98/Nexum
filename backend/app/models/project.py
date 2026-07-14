# app/models/project.py
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text, JSON, Index, func, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base

class ProjectStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    ARCHIVED = "archived"

class ProjectPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ProjectPhase(str, enum.Enum):
    PLANNING = "planning"
    DEVELOPMENT = "development"
    TESTING = "testing"
    DEPLOYMENT = "deployment"
    MAINTENANCE = "maintenance"

class Project(Base):
    __tablename__ = "projects"
    __table_args__ = (
        Index('idx_projects_status', 'status'),
        Index('idx_projects_priority', 'priority'),
        Index('idx_projects_created_at', 'created_at'),
        {'extend_existing': True}
    )

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String(50), unique=True, index=True, nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    
    # Statut et priorité
    status = Column(String(20), default="active")
    priority = Column(String(20), default="medium")
    current_phase = Column(String(20), default="planning")
    
    # Métriques de performance
    progress = Column(Float, default=0.0)
    health_score = Column(Float, default=0.0)
    performance_score = Column(Float, default=0.0)
    security_score = Column(Float, default=0.0)
    innovation_score = Column(Float, default=0.0)
    growth_score = Column(Float, default=0.0)
    
    # IA Stratégique Projectielle
    ai_risk_score = Column(Float, default=0.0)  # Probabilité de retard ou dépassement budget
    ai_completion_prediction = Column(DateTime, nullable=True) # Date de fin estimée par IA
    ai_resource_optimization = Column(JSON, default=dict) # Recommandations allocation ressources
    ai_insights = Column(JSON, default=dict) # Analyse contextuelle IA
    last_ai_update = Column(DateTime, default=datetime.utcnow)
    
    # Indicateurs clés
    kpi_revenue = Column(Float, default=0.0)
    kpi_orders = Column(Integer, default=0)
    kpi_clients = Column(Integer, default=0)
    kpi_alerts = Column(Integer, default=0)
    kpi_trends = Column(JSON, default=dict)
    
    # Équipe
    project_manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    team_members = Column(JSON, default=list)
    
    # Dates
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    project_manager = relationship("User", foreign_keys=[project_manager_id])
    modules = relationship("ProjectModule", back_populates="project", cascade="all, delete-orphan")
    activities = relationship("ProjectActivity", back_populates="project", cascade="all, delete-orphan")
    milestones = relationship("ProjectMilestone", back_populates="project", cascade="all, delete-orphan")
    insights = relationship("ProjectInsight", back_populates="project", cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            "id": self.id,
            "project_id": self.project_id,
            "company_id": self.company_id,
            "name": self.name,
            "description": self.description,
            "status": self.status.value if hasattr(self.status, 'value') else str(self.status),
            "priority": self.priority.value if hasattr(self.priority, 'value') else str(self.priority),
            "current_phase": self.current_phase.value if hasattr(self.current_phase, 'value') else str(self.current_phase),
            "progress": self.progress,
            "health_score": self.health_score,
            "performance_score": self.performance_score,
            "security_score": self.security_score,
            "innovation_score": self.innovation_score,
            "growth_score": self.growth_score,
            "ai_risk_score": self.ai_risk_score,
            "ai_completion_prediction": self.ai_completion_prediction.isoformat() if self.ai_completion_prediction else None,
            "ai_resource_optimization": self.ai_resource_optimization,
            "ai_insights": self.ai_insights,
            "kpi_revenue": self.kpi_revenue,
            "kpi_orders": self.kpi_orders,
            "kpi_clients": self.kpi_clients,
            "kpi_alerts": self.kpi_alerts,
            "kpi_trends": self.kpi_trends,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class ProjectModule(Base):
    __tablename__ = "project_modules"
    __table_args__ = (
        Index('idx_project_modules_project_id', 'project_id'),
        {'extend_existing': True}
    )

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    progress = Column(Float, default=0.0)
    trend = Column(String(10), default="up")
    trend_change = Column(Float, default=0.0)
    color = Column(String(20), default="#1890ff")
    is_active = Column(Boolean, default=True)
    order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    project = relationship("Project", back_populates="modules")
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "progress": self.progress,
            "trend": self.trend,
            "change": f"{'+' if self.trend == 'up' else '-'}{abs(self.trend_change)}%",
            "color": self.color,
            "is_active": self.is_active,
            "order": self.order
        }

class ProjectActivity(Base):
    __tablename__ = "project_activities"
    __table_args__ = (
        Index('idx_project_activities_project_id', 'project_id'),
        Index('idx_project_activities_created_at', 'created_at'),
        {'extend_existing': True}
    )

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    action = Column(String(200), nullable=False)
    username = Column(String(100), nullable=True)
    amount = Column(String(50), nullable=True)
    module = Column(String(50), nullable=True)
    status = Column(String(20), default="success")
    activity_metadata = Column(JSON, default=dict)  # Changé de 'metadata' à 'activity_metadata'
    created_at = Column(DateTime, default=datetime.utcnow)
    
    project = relationship("Project", back_populates="activities")
    
    def to_dict(self):
        return {
            "id": self.id,
            "action": self.action,
            "username": self.username,
            "amount": self.amount,
            "module": self.module,
            "status": self.status,
            "metadata": self.activity_metadata,
            "time": self.created_at.isoformat() if self.created_at else None
        }

class ProjectMilestone(Base):
    __tablename__ = "project_milestones"
    __table_args__ = (
        Index('idx_project_milestones_project_id', 'project_id'),
        Index('idx_project_milestones_order', 'order'),
        {'extend_existing': True}
    )

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    order = Column(Integer, default=0)
    status = Column(String(20), default="pending")
    target_date = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    project = relationship("Project", back_populates="milestones")
    
    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "order": self.order,
            "status": self.status,
            "target_date": self.target_date.isoformat() if self.target_date else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None
        }

class ProjectInsight(Base):
    __tablename__ = "project_insights"
    __table_args__ = (
        Index('idx_project_insights_project_id', 'project_id'),
        Index('idx_project_insights_type', 'insight_type'),
        {'extend_existing': True}
    )

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    insight_type = Column(String(50), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(String(20), default="medium")
    impact = Column(String(50), nullable=True)
    action_path = Column(String(200), nullable=True)
    insight_metadata = Column(JSON, default=dict)  # Changé de 'metadata' à 'insight_metadata'
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    
    project = relationship("Project", back_populates="insights")
    
    def to_dict(self):
        return {
            "id": self.id,
            "type": self.insight_type,
            "title": self.title,
            "description": self.description,
            "priority": self.priority,
            "impact": self.impact,
            "action_path": self.action_path,
            "metadata": self.insight_metadata,
            "is_resolved": self.is_resolved,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class KanbanTask(Base):
    __tablename__ = "kanban_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="todo") # todo, in-progress, done
    priority = Column(String(20), default="medium") # low, medium, high
    assignee = Column(String(100), nullable=True)
    order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": str(self.id),
            "title": self.title,
            "description": self.description,
            "status": self.status,
            "priority": self.priority,
            "assignee": self.assignee,
            "order": self.order,
            "created_at": self.created_at.isoformat()
        }