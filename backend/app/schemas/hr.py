from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, List

# ================== DÉPARTEMENTS ==================
class DepartmentBase(BaseModel):
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    color: str = "#3498db"
    budget: float = 0
    manager_id: Optional[int] = None

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentResponse(DepartmentBase):
    id: int
    head_count: int
    active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# ================== EMPLOYÉS ==================
class EmployeeBase(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    mobile: Optional[str] = None
    job_title: str
    department_id: int
    manager_id: Optional[int] = None
    hire_date: date
    contract_type: str = "CDI"
    status: str = "présent"
    work_hours: float = 35

class EmployeeCreate(EmployeeBase):
    personal_email: Optional[str] = None
    birth_date: Optional[date] = None
    address: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    gender: Optional[str] = None

class EmployeeUpdate(BaseModel):
    job_title: Optional[str] = None
    department_id: Optional[int] = None
    status: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

class EmployeeResponse(EmployeeBase):
    id: int
    employee_id: str
    full_name: str
    initials: str
    avatar_url: Optional[str] = None
    is_manager: bool
    created_at: datetime
    department_name: Optional[str] = None
    manager_name: Optional[str] = None
    
    class Config:
        from_attributes = True

# ================== CONGÉS ==================
class LeaveBase(BaseModel):
    employee_id: int
    leave_type: str
    start_date: date
    end_date: date
    reason: Optional[str] = None

class LeaveCreate(LeaveBase):
    pass

class LeaveResponse(LeaveBase):
    id: int
    status: str
    days_count: float
    created_at: datetime
    employee_name: Optional[str] = None
    
    class Config:
        from_attributes = True

# ================== DASHBOARD ==================
class DashboardKPI(BaseModel):
    title: str
    value: int
    icon: str
    color: str
    trend: float

class DepartmentStats(BaseModel):
    name: str
    count: int
    color: str