# app/models/hr.py
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean, Date, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base

class EmployeeStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    ON_LEAVE = "on_leave"
    TERMINATED = "terminated"

class LeaveType(str, enum.Enum):
    ANNUAL = "annual"
    SICK = "sick"
    MATERNITY = "maternity"
    PATERNITY = "paternity"
    UNPAID = "unpaid"

class LeaveStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class Department(Base):
    __tablename__ = 'hr_departments'
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(20), nullable=True)
    manager_id = Column(Integer, ForeignKey('hr_employees.id'), nullable=True)
    company_id = Column(Integer, ForeignKey('companies.id'), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relations avec foreign_keys explicites
    manager = relationship("Employee", foreign_keys=[manager_id], backref="managed_department")
    employees = relationship("Employee", back_populates="department", foreign_keys="Employee.department_id")

class Employee(Base):
    __tablename__ = 'hr_employees'
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), unique=True, nullable=True)
    department_id = Column(Integer, ForeignKey('hr_departments.id'), nullable=True)
    employee_number = Column(String(50), unique=True, nullable=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(100), nullable=False)
    phone = Column(String(50), nullable=True)
    position = Column(String(100), nullable=True)
    hire_date = Column(Date, nullable=True)
    birth_date = Column(Date, nullable=True)
    status = Column(SQLEnum(EmployeeStatus), default=EmployeeStatus.ACTIVE)
    salary = Column(Float, default=0.0)
    company_id = Column(Integer, ForeignKey('companies.id'), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Intelligence IA & Capital Humain Nexum
    ai_performance_score = Column(Float, default=0.0)
    churn_risk_score = Column(Float, default=0.0)
    ai_burnout_risk_score = Column(Float, default=0.0)
    ai_skill_gap_analysis = Column(JSON, default=dict)
    ai_career_path_suggestion = Column(Text, nullable=True)
    ai_training_recommendations = Column(JSON, default=list)
    ai_insights = Column(JSON, nullable=True)
    last_ai_review = Column(DateTime, nullable=True)
    
    # Relations avec foreign_keys explicites
    user = relationship("User", foreign_keys=[user_id])
    department = relationship("Department", back_populates="employees", foreign_keys=[department_id])
    leaves = relationship("Leave", back_populates="employee", cascade="all, delete-orphan")

class Leave(Base):
    __tablename__ = 'hr_leaves'
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey('hr_employees.id'), nullable=False)
    company_id = Column(Integer, ForeignKey('companies.id'), nullable=False)  # ← AJOUTER
    leave_type = Column(SQLEnum(LeaveType), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    duration = Column(Float, default=0.0)
    reason = Column(Text, nullable=True)
    status = Column(SQLEnum(LeaveStatus), default=LeaveStatus.PENDING)
    approved_by_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relations avec foreign_keys explicites
    employee = relationship("Employee", back_populates="leaves", foreign_keys=[employee_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])