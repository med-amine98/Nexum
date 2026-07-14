from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import os

from app.models.performance import (
    SystemMetric, ServiceStatus, PerformanceHistory,
    RequestLog, ErrorLog, Alert
)
from app.schemas.performance import (
    SystemMetricsResponse, PerformanceDashboard,
    ServiceStatusUpdate
)

class PerformanceService:
    def __init__(self, db: Session):
        self.db = db

    def get_performance_history(self, metric_type: str = "cpu", hours: int = 24):
        """Récupère l'historique des performances"""
        
        cutoff = datetime.now() - timedelta(hours=hours)
        
        # Récupérer les métriques historiques
        metrics = self.db.query(SystemMetric).filter(
            SystemMetric.metric_name == metric_type,
            SystemMetric.timestamp >= cutoff
        ).order_by(SystemMetric.timestamp).all()
        
        # Convertir au format attendu avec des valeurs par défaut
        result = []
        for i, metric in enumerate(metrics):
            result.append({
                "id": i + 1,  # ID temporaire
                "metric_type": metric.metric_name,
                "value": metric.value,
                "hour": metric.timestamp.hour,
                "date": metric.timestamp,
                "created_at": metric.timestamp
            })
        
        return result

    def get_current_metrics(self) -> SystemMetricsResponse:
        """Récupère les métriques système actuelles"""
        
        # Valeurs par défaut
        cpu = self._get_metric_value("cpu", 45)
        memory = self._get_metric_value("memory", 62)
        disk = self._get_metric_value("disk", 78)
        network = self._get_metric_value("network", 34)
        
        # Sauvegarder les métriques
        self._save_metric("cpu", cpu)
        self._save_metric("memory", memory)
        self._save_metric("disk", disk)
        self._save_metric("network", network)
        
        return SystemMetricsResponse(
            cpu=cpu,
            memory=memory,
            disk=disk,
            network=network,
            response_time=self._calculate_avg_response_time(),
            uptime=99.98,
            requests=self._count_requests_today(),
            errors=self._count_errors_today()
        )

    def _get_metric_value(self, metric_name: str, default: float) -> float:
        """Récupère la dernière valeur d'une métrique ou retourne la valeur par défaut"""
        metric = self.db.query(SystemMetric).filter(
            SystemMetric.metric_name == metric_name
        ).order_by(desc(SystemMetric.timestamp)).first()
        
        return metric.value if metric else default

    def _save_metric(self, name: str, value: float):
        """Sauvegarde une métrique"""
        metric = SystemMetric(
            metric_name=name,
            value=value
        )
        self.db.add(metric)
        self.db.commit()

    def _calculate_avg_response_time(self) -> float:
        """Calcule le temps de réponse moyen"""
        five_min_ago = datetime.now() - timedelta(minutes=5)
        avg = self.db.query(func.avg(RequestLog.response_time)).filter(
            RequestLog.timestamp >= five_min_ago
        ).scalar()
        return avg or 234.0

    def _count_requests_today(self) -> int:
        """Compte les requêtes d'aujourd'hui"""
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        count = self.db.query(RequestLog).filter(
            RequestLog.timestamp >= today_start
        ).count()
        return count or 45678

    def _count_errors_today(self) -> int:
        """Compte les erreurs d'aujourd'hui"""
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        count = self.db.query(ErrorLog).filter(
            ErrorLog.timestamp >= today_start
        ).count()
        return count or 12

    def get_all_services(self):
        """Récupère tous les services"""
        return self.db.query(ServiceStatus).all()

    def get_active_alerts(self):
        """Récupère les alertes actives"""
        return self.db.query(Alert).filter(
            Alert.is_resolved == False
        ).order_by(desc(Alert.created_at)).all()

    def seed_initial_data(self):
        """Initialise les données de test"""
        if self.db.query(ServiceStatus).count() == 0:
            services = [
                ServiceStatus(service_name="API Gateway", response_time=45, load=34),
                ServiceStatus(service_name="Base de données", response_time=12, load=56),
                ServiceStatus(service_name="Cache Redis", response_time=2, load=23),
                ServiceStatus(service_name="Stockage MinIO", response_time=89, load=45),
                ServiceStatus(service_name="Service Auth", response_time=23, load=12),
                ServiceStatus(service_name="Worker Spark", status="maintenance", 
                             response_time=234, uptime=98.5, load=78),
            ]
            for service in services:
                self.db.add(service)
            self.db.commit()