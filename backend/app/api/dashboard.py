from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.database import get_db
from app.services.dashboard_service import DashboardService
from app.core.dependencies import get_current_active_user as get_current_user
from app.models.auth import User

router = APIRouter()

@router.get("/kpis")
async def get_kpis(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupère les KPIs du dashboard"""
    return DashboardService.get_kpis(db, current_user.company_id)

@router.get("/modules")
async def get_modules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupère le statut des modules"""
    return DashboardService.get_modules_status(db, current_user.company_id)

@router.get("/activities")
async def get_activities(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupère les activités récentes"""
    return DashboardService.get_recent_activities(db, current_user.company_id, limit)

@router.get("/sales-chart")
async def get_sales_chart(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupère les données du graphique des ventes"""
    return DashboardService.get_sales_chart_data(db, current_user.company_id)

@router.get("/alerts")
async def get_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupère les alertes"""
    return DashboardService.get_alerts_count(db, current_user.company_id)
