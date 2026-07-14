# app/models/performance.py
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, JSON, Text, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base

class AlertSeverity(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

class AlertType(str, enum.Enum):
    SYSTEM = "system"
    SECURITY = "security"
    PERFORMANCE = "performance"
    FRAUD = "fraud"
    BLOCKCHAIN = "blockchain"

class AttackType(str, enum.Enum):
    INTRUSION = "intrusion"
    RANSOMWARE = "ransomware"
    DDOS = "ddos"
    DATA_EXFILTRATION = "data_exfiltration"
    PHISHING = "phishing"
    MALWARE = "malware"

class ServiceStatusEnum(str, enum.Enum):
    OPERATIONAL = "opérationnel"
    MAINTENANCE = "maintenance"
    ERROR = "erreur"
    DEGRADED = "dégradé"

class SystemMetric(Base):
    __tablename__ = "system_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    metric_name = Column(String(50), nullable=False)  # cpu, memory, disk, network
    value = Column(Float, nullable=False)
    unit = Column(String(20), default="%")
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    created_at = Column(DateTime, default=datetime.utcnow)

class ServiceStatus(Base):
    __tablename__ = "service_status"
    
    id = Column(Integer, primary_key=True, index=True)
    service_name = Column(String(100), nullable=False)
    status = Column(Enum(ServiceStatusEnum), default=ServiceStatusEnum.OPERATIONAL)
    response_time = Column(Float, default=0.0)  # en ms
    uptime = Column(Float, default=99.9)  # en %
    load = Column(Float, default=0.0)  # en %
    
    last_check = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class PerformanceHistory(Base):
    __tablename__ = "performance_history"
    
    id = Column(Integer, primary_key=True, index=True)
    metric_type = Column(String(50), nullable=False)  # cpu, memory, requests
    value = Column(Float, nullable=False)
    hour = Column(Integer, nullable=False)  # 0-23
    date = Column(DateTime, default=datetime.utcnow)
    
    created_at = Column(DateTime, default=datetime.utcnow)

class RequestLog(Base):
    __tablename__ = "request_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    endpoint = Column(String(200), nullable=False)
    method = Column(String(10), nullable=False)
    response_time = Column(Float, nullable=False)  # en ms
    status_code = Column(Integer, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    user_id = Column(Integer, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)

class ErrorLog(Base):
    __tablename__ = "error_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    error_type = Column(String(100), nullable=False)
    message = Column(Text, nullable=False)
    service = Column(String(100), nullable=False)
    severity = Column(String(20), default="warning")  # info, warning, error, critical
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)

class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    type = Column(Enum(AlertType), default=AlertType.SYSTEM)
    severity = Column(Enum(AlertSeverity), default=AlertSeverity.WARNING)
    service = Column(String(100), nullable=True)
    source_ip = Column(String(45), nullable=True)
    target_ip = Column(String(45), nullable=True)
    attack_type = Column(Enum(AttackType), nullable=True)
    detection_method = Column(String(100), nullable=True)
    mitigation = Column(Text, nullable=True)
    
    # IA Stratégique Sécurité Nexum (James)
    ai_threat_score = Column(Float, default=0.0)          # Score de menace 0-1
    ai_root_cause = Column(Text, nullable=True)            # Cause racine analysée
    ai_suggested_mitigation = Column(JSON, default=list)  # Plan de mitigation IA
    last_ai_update = Column(DateTime, default=datetime.utcnow)
    
    is_read = Column(Boolean, default=False)
    is_resolved = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

class SecurityEvent(Base):
    __tablename__ = "security_events"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False)
    severity = Column(Enum(AlertSeverity), default=AlertSeverity.WARNING)
    description = Column(Text, nullable=False)
    source_ip = Column(String(45), nullable=True)
    target_ip = Column(String(45), nullable=True)
    attack_type = Column(Enum(AttackType), nullable=True)
    detection_method = Column(String(100), nullable=True)
    event_metadata = Column(JSON, nullable=True)
    
    # IA Stratégique Événement Sécurité Nexum (James)
    ai_attack_fingerprint = Column(JSON, default=dict)    # Signature de l'attaque
    ai_impact_estimate = Column(Float, default=0.0)       # Impact estimé 0-1
    ai_response_plan = Column(JSON, default=list)         # Plan de réponse automatisé
    last_ai_update = Column(DateTime, default=datetime.utcnow)
    
    is_mitigated = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class NetworkTraffic(Base):
    __tablename__ = "network_traffic"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    type = Column(String(50), nullable=False)  # inbound, outbound, internal
    bytes_transferred = Column(Float, nullable=False)
    source_ip = Column(String(45), nullable=True)
    destination_ip = Column(String(45), nullable=True)
    protocol = Column(String(20), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)