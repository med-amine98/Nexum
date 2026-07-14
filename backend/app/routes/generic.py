# app/routes/generic.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Type, Any, Optional
from app.database import get_db
from app.models import User
from app.models.base import BaseModel
from app.routes.auth import get_current_user

def create_tenant_router(model: Type[BaseModel], prefix: str, tags: list):
    """
    Crée un routeur CRUD avec filtrage tenant automatique
    """
    router = APIRouter(prefix=prefix, tags=tags)
    
    @router.get("/")
    async def get_all(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
        limit: Optional[int] = Query(None, ge=1, le=1000),
        offset: Optional[int] = Query(None, ge=0),
        order: Optional[str] = None
    ):
        """Récupère toutes les instances avec filtrage tenant"""
        return model.search(
            db_session=db,
            limit=limit,
            offset=offset,
            order=order,
            user=current_user
        )
    
    @router.get("/{item_id}")
    async def get_one(
        item_id: int,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ):
        """Récupère une instance par ID avec filtrage tenant"""
        item = model.get(db_session=db, id=item_id, user=current_user)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"{model.__name__} not found"
            )
        return item
    
    @router.post("/")
    async def create(
        item_data: dict,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ):
        """Crée une nouvelle instance avec tenant automatique"""
        # Ajouter les champs tenant automatiquement
        item_data['create_uid'] = current_user.id
        item_data['company_id'] = current_user.company_id
        
        item = model(**item_data)
        item.save(db_session=db)
        return item
    
    @router.put("/{item_id}")
    async def update(
        item_id: int,
        item_data: dict,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ):
        """Met à jour une instance avec vérification tenant"""
        item = model.get(db_session=db, id=item_id, user=current_user)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"{model.__name__} not found"
            )
        
        # Mettre à jour les champs
        for key, value in item_data.items():
            setattr(item, key, value)
        
        item.write_uid = current_user.id
        item.save(db_session=db)
        return item
    
    @router.delete("/{item_id}")
    async def delete(
        item_id: int,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ):
        """Supprime une instance avec vérification tenant"""
        item = model.get(db_session=db, id=item_id, user=current_user)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"{model.__name__} not found"
            )
        
        item.delete(db_session=db)
        return {"message": f"{model.__name__} deleted successfully"}
    
    return router