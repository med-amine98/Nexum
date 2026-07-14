from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.services.superadmin_service import AdminService
from app.schemas.superadmin import (
    AdminDashboardStats, UserDetail, CompanyDetail, ModelRequestDetail,
    ModelRequestCreate, ModelRequestUpdate, ModelRequestPayment,
    UserListResponse, CompanyListResponse, ModelRequestListResponse
)
from app.core.dependencies import get_current_user, get_current_active_admin

router = APIRouter(prefix="/admin", tags=["Admin Dashboard"])

# ========== DASHBOARD ==========
@router.get("/dashboard", response_model=AdminDashboardStats)
async def get_admin_dashboard(
    current_user = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Récupère les statistiques pour le dashboard admin"""
    service = AdminService(db)
    return service.get_dashboard_stats()

# ========== UTILISATEURS ==========
@router.get("/users", response_model=UserListResponse)
async def get_all_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Récupère tous les utilisateurs"""
    service = AdminService(db)
    users = service.get_all_users(skip, limit)
    return {
        "total": len(users),
        "users": users
    }

@router.get("/users/{user_id}", response_model=UserDetail)
async def get_user(
    user_id: int,
    current_user = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Récupère un utilisateur par son ID"""
    service = AdminService(db)
    user = service.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return user

@router.put("/users/{user_id}", response_model=UserDetail)
async def update_user(
    user_id: int,
    update_data: dict,
    current_user = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Met à jour un utilisateur"""
    service = AdminService(db)
    user = service.update_user(user_id, update_data, current_user.id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return user

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    current_user = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Supprime un utilisateur"""
    service = AdminService(db)
    if not service.delete_user(user_id, current_user.id):
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return {"message": "Utilisateur supprimé avec succès"}

# ========== ENTREPRISES ==========
@router.get("/companies", response_model=CompanyListResponse)
async def get_all_companies(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Récupère toutes les entreprises"""
    service = AdminService(db)
    companies = service.get_all_companies(skip, limit)
    return {
        "total": len(companies),
        "companies": companies
    }

@router.get("/companies/{company_id}", response_model=CompanyDetail)
async def get_company(
    company_id: int,
    current_user = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Récupère une entreprise par son ID"""
    service = AdminService(db)
    company = service.get_company(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    return company

@router.put("/companies/{company_id}", response_model=CompanyDetail)
async def update_company(
    company_id: int,
    update_data: dict,
    current_user = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Met à jour une entreprise"""
    service = AdminService(db)
    company = service.update_company(company_id, update_data, current_user.id)
    if not company:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    return company

# ========== DEMANDES DE MODÈLES ==========
@router.get("/requests", response_model=ModelRequestListResponse)
async def get_all_requests(
    status: Optional[str] = None,
    current_user = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Récupère toutes les demandes de modèles"""
    service = AdminService(db)
    requests = service.get_all_requests(status)
    
    stats = {
        "total": len(requests),
        "pending": len([r for r in requests if r.status == "pending"]),
        "approved": len([r for r in requests if r.status == "approved"]),
        "rejected": len([r for r in requests if r.status == "rejected"]),
        "requests": requests
    }
    return stats

@router.get("/requests/{request_id}", response_model=ModelRequestDetail)
async def get_request(
    request_id: int,
    current_user = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Récupère une demande par son ID"""
    service = AdminService(db)
    request = service.get_request(request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    return request

@router.post("/requests", response_model=ModelRequestDetail)
async def create_request(
    request_data: ModelRequestCreate,
    company_id: int,
    user_id: int,
    current_user = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Crée une nouvelle demande (pour un utilisateur spécifique)"""
    service = AdminService(db)
    return service.create_request(company_id, user_id, request_data.dict())

@router.post("/requests/{request_id}/process", response_model=ModelRequestDetail)
async def process_request(
    request_id: int,
    status: str = Query(..., regex="^(approved|rejected)$"),
    admin_notes: Optional[str] = None,
    current_user = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Approuve ou rejette une demande"""
    service = AdminService(db)
    request = service.process_request(request_id, current_user.id, status, admin_notes)
    if not request:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    return request

@router.post("/requests/{request_id}/pay", response_model=ModelRequestDetail)
async def mark_request_paid(
    request_id: int,
    payment_data: ModelRequestPayment,
    current_user = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Marque une demande comme payée"""
    service = AdminService(db)
    request = service.mark_paid(request_id, payment_data.dict())
    if not request:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    return request

# ========== STATISTIQUES ==========
@router.get("/stats/sectors")
async def get_sector_stats(
    current_user = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Statistiques par secteur d'activité"""
    service = AdminService(db)
    stats = service.get_dashboard_stats()
    return stats.companies_by_sector

@router.get("/stats/roles")
async def get_role_stats(
    current_user = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Statistiques par rôle utilisateur"""
    service = AdminService(db)
    stats = service.get_dashboard_stats()
    return stats.users_by_role