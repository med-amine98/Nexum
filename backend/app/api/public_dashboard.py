from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/public/dashboard", tags=["Public Dashboard"])

@router.get("/kpis")
async def get_public_kpis(
    db: Session = Depends(get_db)
):
    """KPIs publics sans authentification"""
    return DashboardService.get_kpis(db)

@router.get("/modules")
async def get_public_modules(
    db: Session = Depends(get_db)
):
    """Modules publics sans authentification"""
    return DashboardService.get_modules_status(db)

@router.get("/activities")
async def get_public_activities(
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Activités publiques sans authentification"""
    return DashboardService.get_recent_activities(db, limit)

@router.get("/sales-chart")
async def get_public_sales_chart(
    db: Session = Depends(get_db)
):
    """Graphique des ventes public sans authentification"""
    return DashboardService.get_sales_chart_data(db)

@router.get("/alerts")
async def get_public_alerts(
    db: Session = Depends(get_db)
):
    """Alertes publiques sans authentification"""
    return DashboardService.get_alerts_count(db)
