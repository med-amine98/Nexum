# app/api/modules.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.services.module_service import ModuleService
from app.core.dependencies import get_current_active_user as get_current_user
from app.models.auth import User
from app.schemas.module import (
    ModuleInDB, ModuleCreate, ModuleUpdate,
    ModuleCategoryInDB, ModuleCategoryCreate,
    ModuleTagInDB, ModuleTagCreate,
    UserModuleInDB, UserModuleCreate, UserModuleUpdate,
    ModulesResponse
)

router = APIRouter(tags=["Modules"])


@router.get("/modules/installed-keys", response_model=List[str])
async def get_installed_module_keys(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupère les clés des modules installés pour l'entreprise du user"""
    service = ModuleService(db)
    result = service.get_installed_module_keys(current_user.company_id)
    return result if result is not None else []


# ========== DASHBOARD ==========
@router.get("/modules/dashboard", response_model=ModulesResponse)
async def get_modules_dashboard(
    user_id: Optional[int] = Query(None, description="ID de l'utilisateur"),
    db: Session = Depends(get_db)
):
    """Récupère toutes les données pour le dashboard des modules"""
    service = ModuleService(db)
    result = service.get_dashboard_data(user_id)
    if result is None:
        return ModulesResponse(modules=[], categories=[], tags=[], installed_modules=[], favorite_modules=[])
    return result


# ========== MODULES ==========
@router.get("/modules/", response_model=List[ModuleInDB])
async def get_all_modules(
    category: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = Query("name", regex="^(name|usage|fields|date)$"),
    sort_order: str = Query("asc", regex="^(asc|desc)$"),
    user_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Récupère tous les modules"""
    service = ModuleService(db)
    modules = service.get_all_modules(category=category, search=search, sort_by=sort_by, sort_order=sort_order, user_id=user_id)
    return modules if modules is not None else []


@router.get("/user/modules", response_model=List[str])
async def get_user_modules(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Récupère les modules installés pour l'utilisateur courant"""
    service = ModuleService(db)
    result = service.get_installed_module_keys(current_user.company_id)
    return result if result is not None else []


@router.get("/modules/{module_id}", response_model=ModuleInDB)
async def get_module(module_id: int, db: Session = Depends(get_db)):
    """Récupère un module par son ID"""
    service = ModuleService(db)
    module = service.get_module(module_id)
    if not module:
        raise HTTPException(status_code=404, detail="Module non trouvé")
    return module


@router.post("/modules/", response_model=ModuleInDB)
async def create_module(module: ModuleCreate, db: Session = Depends(get_db)):
    """Crée un nouveau module"""
    service = ModuleService(db)
    return service.create_module(module)


@router.put("/modules/{module_id}", response_model=ModuleInDB)
async def update_module(module_id: int, module_update: ModuleUpdate, db: Session = Depends(get_db)):
    """Met à jour un module"""
    service = ModuleService(db)
    module = service.update_module(module_id, module_update)
    if not module:
        raise HTTPException(status_code=404, detail="Module non trouvé")
    return module


@router.delete("/modules/{module_id}")
async def delete_module(module_id: int, db: Session = Depends(get_db)):
    """Supprime un module (soft delete)"""
    service = ModuleService(db)
    if not service.delete_module(module_id):
        raise HTTPException(status_code=404, detail="Module non trouvé")
    return {"message": "Module supprimé avec succès"}


# ========== PRÉFÉRENCES UTILISATEUR ==========
@router.post("/modules/{module_id}/favorite")
async def toggle_favorite(
    module_id: int,
    user_id: int = Query(..., description="ID de l'utilisateur"),
    db: Session = Depends(get_db)
):
    """Ajoute/retire un module des favoris"""
    service = ModuleService(db)
    user_module = service.toggle_favorite(user_id, module_id)
    return {"is_favorite": user_module.is_favorite if user_module else False}


@router.post("/modules/{module_key_or_id}/install")
async def toggle_installed(
    module_key_or_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Installe/désinstalle un module via son ID ou sa clé"""
    service = ModuleService(db)
    user_module = service.toggle_installed(current_user.id, module_key_or_id, current_user.company_id)
    if not user_module:
        raise HTTPException(status_code=404, detail="Module non trouvé")
    return {"is_installed": user_module.is_installed}


@router.post("/modules/{module_key_or_id}/buy")
async def buy_module(
    module_key_or_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Achète un module"""
    service = ModuleService(db)
    user_module = service.buy_module(current_user.id, module_key_or_id, current_user.company_id)
    if not user_module:
        raise HTTPException(status_code=404, detail="Module non trouvé")
    return {"message": "Module acheté avec succès", "is_installed": user_module.is_installed}


# ========== CATÉGORIES ==========
@router.get("/modules/categories", response_model=List[ModuleCategoryInDB])
async def get_all_categories(db: Session = Depends(get_db)):
    """Récupère toutes les catégories"""
    service = ModuleService(db)
    categories = service.get_all_categories()
    return categories if categories is not None else []


@router.post("/modules/categories", response_model=ModuleCategoryInDB)
async def create_category(category: ModuleCategoryCreate, db: Session = Depends(get_db)):
    """Crée une nouvelle catégorie"""
    service = ModuleService(db)
    return service.create_category(category)


# ========== TAGS ==========
@router.get("/modules/tags", response_model=List[ModuleTagInDB])
async def get_all_tags(db: Session = Depends(get_db)):
    """Récupère tous les tags"""
    service = ModuleService(db)
    tags = service.get_all_tags()
    return tags if tags is not None else []


@router.post("/modules/tags", response_model=ModuleTagInDB)
async def create_tag(tag: ModuleTagCreate, db: Session = Depends(get_db)):
    """Crée un nouveau tag"""
    service = ModuleService(db)
    return service.create_tag(tag)


# ========== STATISTIQUES ==========
@router.get("/modules/stats")
async def get_module_stats(db: Session = Depends(get_db)):
    """Récupère les statistiques globales"""
    service = ModuleService(db)
    stats = service.get_stats()
    return stats if stats is not None else {"total_modules": 0, "total_installs": 0, "total_categories": 0, "total_tags": 0}


# ========== INITIALISATION ==========
@router.post("/modules/seed")
async def seed_module_data(db: Session = Depends(get_db)):
    """Initialise les données de test"""
    service = ModuleService(db)
    service.seed_initial_data()
    return {"message": "Données des modules initialisées avec succès"}

# app/api/modules.py - Ajoute cet endpoint

@router.delete("/modules/by-key/{module_key}")
async def delete_module_by_key(
    module_key: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Désinstalle un module par sa clé (ex: smart-dashboard)"""
    service = ModuleService(db)
    user_module = service.toggle_installed(current_user.id, module_key, current_user.company_id)
    if not user_module:
        raise HTTPException(status_code=404, detail="Module non trouvé")
    return {"is_installed": user_module.is_installed, "message": f"Module {module_key} désinstallé"}