from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

# System Metric schemas
class SystemMetricBase(BaseModel):
    metric_name: str
    value: float
    unit: str = "%"

class SystemMetricCreate(SystemMetricBase):
    pass

class SystemMetricInDB(SystemMetricBase):
    id: int
    timestamp: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True

# Service Status schemas
class ServiceStatusBase(BaseModel):
    service_name: str
    status: str = "opérationnel"
    response_time: float = 0.0
    uptime: float = 99.9
    load: float = 0.0

class ServiceStatusCreate(ServiceStatusBase):
    pass

class ServiceStatusUpdate(BaseModel):
    status: Optional[str] = None
    response_time: Optional[float] = None
    load: Optional[float] = None

class ServiceStatusInDB(ServiceStatusBase):
    id: int
    last_check: datetime
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Performance History schemas
class PerformanceHistoryBase(BaseModel):
    metric_type: str
    value: float
    hour: int

class PerformanceHistoryCreate(PerformanceHistoryBase):
    pass

class PerformanceHistoryInDB(PerformanceHistoryBase):
    id: int
    date: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True

# Request Log schemas
class RequestLogBase(BaseModel):
    endpoint: str
    method: str
    response_time: float
    status_code: int

class RequestLogCreate(RequestLogBase):
    user_id: Optional[int] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

class RequestLogInDB(RequestLogBase):
    id: int
    timestamp: datetime
    
    class Config:
        from_attributes = True

# Error Log schemas
class ErrorLogBase(BaseModel):
    error_type: str
    message: str
    service: str
    severity: str = "warning"

class ErrorLogCreate(ErrorLogBase):
    pass

class ErrorLogInDB(ErrorLogBase):
    id: int
    timestamp: datetime
    resolved: bool
    resolved_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Alert schemas
class AlertBase(BaseModel):
    title: str
    description: str
    type: str = "warning"
    service: Optional[str] = None

class AlertCreate(AlertBase):
    pass

class AlertUpdate(BaseModel):
    is_read: Optional[bool] = None
    is_resolved: Optional[bool] = None

class AlertInDB(AlertBase):
    id: int
    is_read: bool
    is_resolved: bool
    created_at: datetime
    resolved_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Dashboard schemas
class SystemMetricsResponse(BaseModel):
    cpu: float
    memory: float
    disk: float
    network: float
    response_time: float
    uptime: float
    requests: int
    errors: int

class PerformanceDashboard(BaseModel):
    current_metrics: SystemMetricsResponse
    history: List[PerformanceHistoryInDB]
    services: List[ServiceStatusInDB]
    alerts: List[AlertInDB]
    recent_errors: List[ErrorLogInDB]