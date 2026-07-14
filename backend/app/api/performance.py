# app/api/performance.py
from fastapi import APIRouter, Depends, Query, HTTPException
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import random
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.database import get_db
from app.models.performance import (
    SystemMetric, ServiceStatus, PerformanceHistory, Alert, SecurityEvent,
    NetworkTraffic, ServiceStatusEnum, AlertSeverity, AlertType, AttackType
)
import logging
logger = logging.getLogger(__name__)
router = APIRouter(prefix="/performance", tags=["performance"])

# ===== DONNÉES MOCK POUR DÉMO =====
def get_mock_metrics():
    return {
        "cpu": random.randint(15, 95),
        "memory": random.randint(30, 88),
        "disk": random.randint(45, 92),
        "network_in": random.randint(1000000, 50000000),
        "network_out": random.randint(500000, 25000000),
        "response_time": random.randint(50, 500),
        "requests_per_second": random.randint(100, 5000),
        "active_connections": random.randint(50, 500)
    }

def get_mock_services():
    """Retourne la liste des services avec les bonnes clés pour le frontend"""
    services = [
        {"id": 1, "service_name": "API Gateway", "status": "opérationnel", "response_time": 45, "uptime": 99.99, "load": 32},
        {"id": 2, "service_name": "Base de données PostgreSQL", "status": "opérationnel", "response_time": 12, "uptime": 99.95, "load": 28},
        {"id": 3, "service_name": "Blockchain Network", "status": "opérationnel", "response_time": 234, "uptime": 99.87, "load": 56},
        {"id": 4, "service_name": "Anti-Fraude IA", "status": "opérationnel", "response_time": 89, "uptime": 99.92, "load": 43},
        {"id": 5, "service_name": "Credit Scoring (30 modèles)", "status": "opérationnel", "response_time": 156, "uptime": 99.78, "load": 67},
        {"id": 6, "service_name": "Neo4j Graph Database", "status": "opérationnel", "response_time": 45, "uptime": 99.91, "load": 34},
        {"id": 7, "service_name": "Apache Kafka", "status": "opérationnel", "response_time": 8, "uptime": 99.98, "load": 22},
        {"id": 8, "service_name": "Apache Spark", "status": "opérationnel", "response_time": 234, "uptime": 99.65, "load": 78},
        {"id": 9, "service_name": "MinIO Storage", "status": "opérationnel", "response_time": 56, "uptime": 99.99, "load": 45},
        {"id": 10, "service_name": "Qdrant Vector DB", "status": "opérationnel", "response_time": 34, "uptime": 99.97, "load": 31}
    ]
    return services

def get_mock_history(hours=24):
    """Retourne l'historique avec timestamps pour le graphique"""
    history = []
    now = datetime.now()
    
    for i in range(hours):
        timestamp = now - timedelta(hours=hours-i)
        history.append({
            "hour": i,
            "timestamp": timestamp.isoformat(),
            "value": random.randint(20, 90),
            "memory": random.randint(30, 85),
            "requests": random.randint(100, 5000)
        })
    return history

def get_mock_alerts():
    return [
        {
            "id": 1,
            "title": "CPU élevé détecté",
            "description": "L'utilisation CPU a dépassé 85% pendant 5 minutes",
            "severity": "warning",
            "service": "API Gateway",
            "created_at": (datetime.now() - timedelta(minutes=15)).isoformat()
        },
        {
            "id": 2,
            "title": "Tentative d'intrusion",
            "description": "Multiple tentatives de connexion depuis IP suspecte",
            "severity": "critical",
            "service": "Security",
            "created_at": (datetime.now() - timedelta(minutes=30)).isoformat()
        },
        {
            "id": 3,
            "title": "Latence élevée",
            "description": "Le temps de réponse de la base de données dépasse 200ms",
            "severity": "warning",
            "service": "Base de données",
            "created_at": (datetime.now() - timedelta(hours=1)).isoformat()
        },
        {
            "id": 4,
            "title": "Erreur de connexion",
            "description": "Échec de connexion à Neo4j",
            "severity": "error",
            "service": "Neo4j",
            "created_at": (datetime.now() - timedelta(hours=2)).isoformat()
        }
    ]

# ===== ENDPOINTS =====
@router.get("/metrics")
async def get_metrics(db: Session = Depends(get_db)):
    """Récupérer les métriques système actuelles"""
    return get_mock_metrics()

@router.get("/history/cpu")
async def get_cpu_history(
    hours: int = Query(24, ge=1, le=168),
    db: Session = Depends(get_db)
):
    """Récupérer l'historique CPU avec timestamps"""
    return {
        "history": get_mock_history(hours),
        "hours": hours,
        "unit": "%"
    }
@router.get("/history")
async def get_history(hours: int = 24):
    """Historique global performance"""
    return {
        "history": get_mock_history(hours),
        "hours": hours
    }
@router.get("/alert-rules")
async def get_alert_rules():
    """Règles d'alerting système"""
    return {
        "rules": [
            {"name": "CPU High", "threshold": 85, "severity": "warning"},
            {"name": "Memory High", "threshold": 90, "severity": "critical"},
            {"name": "Latency High", "threshold": 200, "severity": "warning"}
        ]
    }
@router.get("/dashboards")
async def get_dashboards():
    """Dashboards système"""
    return {
        "dashboards": [
            {"id": 1, "name": "System Overview", "status": "active"},
            {"id": 2, "name": "Security Dashboard", "status": "active"},
            {"id": 3, "name": "AI Performance", "status": "active"}
        ]
    }
@router.get("/services")
async def get_services(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Récupérer l'état des services"""
    services = get_mock_services()
    
    if status:
        services = [s for s in services if s['status'] == status]
    
    return {
        "services": services,
        "total": len(services)
    }

@router.get("/alerts")
async def get_performance_alerts(
    resolved: Optional[bool] = Query(None),
    severity: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """Récupérer les alertes système"""
    alerts = get_mock_alerts()
    
    if resolved is not None:
        alerts = [a for a in alerts if a.get('resolved', False) == resolved]
    
    if severity:
        alerts = [a for a in alerts if a['severity'] == severity]
    
    return {
        "alerts": alerts[skip:skip+limit],
        "total": len(alerts),
        "skip": skip,
        "limit": limit
    }

@router.get("/alerts/{alert_id}")
async def get_alert(
    alert_id: int,
    db: Session = Depends(get_db)
):
    """Récupérer une alerte spécifique"""
    alerts = get_mock_alerts()
    alert = next((a for a in alerts if a['id'] == alert_id), None)
    
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alerte {alert_id} non trouvée")
    
    return alert

@router.post("/alerts/{alert_id}/resolve")
async def resolve_alert(
    alert_id: int,
    resolution_note: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Marquer une alerte comme résolue"""
    return {
        "success": True,
        "alert_id": alert_id,
        "resolved": True,
        "resolution_note": resolution_note,
        "resolved_at": datetime.now().isoformat()
    }

@router.get("/request-stats")
async def get_request_stats(
    hours: int = Query(24, ge=1, le=168),
    db: Session = Depends(get_db)
):
    """Statistiques des requêtes"""
    return {
        "total_requests": random.randint(10000, 100000),
        "avg_response_time": random.randint(50, 200),
        "error_rate": random.randint(0, 5),
        "requests_per_second": random.randint(50, 500),
        "by_endpoint": [
            {"endpoint": "/api/v1/credit-scoring", "count": random.randint(1000, 5000)},
            {"endpoint": "/api/v1/blockchain", "count": random.randint(500, 3000)},
            {"endpoint": "/api/v1/fraud-detection", "count": random.randint(800, 4000)},
            {"endpoint": "/api/v1/fraud-insurance", "count": random.randint(600, 3500)},
            {"endpoint": "/api/v1/document", "count": random.randint(300, 2000)}
        ]
    }
@router.get("/history")
async def get_history(hours: int = 24):
    return {
        "history": [
            {"t": i, "value": 50 + i} for i in range(hours)
        ]
    }
logger.info("✅ MODULE PERFORMANCE CHARGÉ")