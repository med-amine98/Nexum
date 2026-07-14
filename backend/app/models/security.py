# app/models/security.py
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from enum import Enum

class ComplianceStatus(str, Enum):
    COMPLIANT = "compliant"
    WARNING = "warning"
    NON_COMPLIANT = "non-compliant"

class AuditLogStatus(str, Enum):
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"
    INFO = "info"

class BucketStatus(str, Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    DEGRADED = "degraded"

# Modèle pour les contrôles ISO
class ISOControl(BaseModel):
    key: str = Field(..., description="Identifiant unique du contrôle")
    control: str = Field(..., description="Référence du contrôle ISO")
    status: ComplianceStatus = Field(..., description="Statut de conformité")
    last_audit: Optional[str] = Field(None, description="Date du dernier audit")
    description: Optional[str] = Field(None, description="Description du contrôle")
    controls: List[str] = Field(default=[], description="Contrôles mis en place")
    evidence: Optional[str] = Field(None, description="Preuves d'audit")
    next_audit: Optional[str] = Field(None, description="Date du prochain audit")
    action_required: Optional[str] = Field(None, description="Action requise si non conforme")

# Modèle pour les logs d'audit
class AuditLog(BaseModel):
    id: Optional[str] = None
    event: str = Field(..., description="Nom de l'événement")
    user: str = Field(..., description="Utilisateur ayant effectué l'action")
    status: AuditLogStatus = Field(default=AuditLogStatus.INFO, description="Statut de l'action")
    ip: str = Field(..., description="Adresse IP source")
    timestamp: datetime = Field(default_factory=datetime.now, description="Date et heure de l'événement")
    details: Optional[dict] = Field(default=None, description="Détails supplémentaires")

# Modèle pour le Data Lake
class BucketInfo(BaseModel):
    name: str = Field(..., description="Nom du bucket")
    status: BucketStatus = Field(..., description="Statut du bucket")
    size: Optional[float] = Field(None, description="Taille en GB")
    created_at: Optional[str] = Field(None, description="Date de création")

class DataLakeStatus(BaseModel):
    buckets: List[BucketInfo] = Field(default=[], description="Liste des buckets")
    total_storage: float = Field(default=0.0, description="Stockage total en GB")
    encryption: str = Field(default="active", description="Statut du chiffrement")

# Modèle pour la réponse de la checklist
class ChecklistResponse(BaseModel):
    controls: List[ISOControl]
    summary: dict = Field(..., description="Résumé des statistiques")

# Modèle pour la réponse des logs
class AuditLogsResponse(BaseModel):
    logs: List[AuditLog]
    total: int = Field(..., description="Nombre total de logs")
    page: int = Field(default=1, description="Page actuelle")
    per_page: int = Field(default=50, description="Nombre d'éléments par page")

# Modèle pour la réponse du Data Lake
class DataLakeResponse(BaseModel):
    status: DataLakeStatus
    last_updated: datetime = Field(default_factory=datetime.now)