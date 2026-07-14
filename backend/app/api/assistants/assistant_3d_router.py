# app/api/assistants/assistant_3d_router.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime

# Correction des imports
from app.core.database import get_db
from app.models.assistant_3d import Assistant3D

router = APIRouter(prefix="/assistant-3d", tags=["assistant-3d"])

# ========== PYDANTIC MODELS ==========
class Assistant3DCreate(BaseModel):
    name: str
    description: Optional[str] = None
    model_type: Optional[str] = "basic"
    configuration: Optional[Dict[str, Any]] = {}
    is_active: Optional[bool] = True

class Assistant3DUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    model_type: Optional[str] = None
    configuration: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

class Assistant3DResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    model_type: str
    configuration: Dict[str, Any]
    is_active: bool
    created_at: datetime
    updated_at: datetime

# ========== ENDPOINTS ==========
@router.post("/", response_model=dict)
def create_assistant(payload: dict, db: Session = Depends(get_db)):
    """Créer un nouvel assistant 3D"""
    try:
        obj = Assistant3D(**payload)
        db.add(obj)
        db.commit()
        db.refresh(obj)
        
        # Retourner l'objet avec to_dict si disponible, sinon construire manuellement
        if hasattr(obj, 'to_dict'):
            return obj.to_dict()
        else:
            return {
                "id": obj.id,
                "name": obj.name,
                "description": getattr(obj, 'description', None),
                "model_type": getattr(obj, 'model_type', 'basic'),
                "configuration": getattr(obj, 'configuration', {}),
                "is_active": getattr(obj, 'is_active', True),
                "created_at": getattr(obj, 'created_at', datetime.now()).isoformat() if hasattr(obj, 'created_at') else None,
                "updated_at": getattr(obj, 'updated_at', datetime.now()).isoformat() if hasattr(obj, 'updated_at') else None
            }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{assistant_id}", response_model=dict)
def get_assistant(assistant_id: int, db: Session = Depends(get_db)):
    """Récupérer un assistant 3D par son ID"""
    obj = db.query(Assistant3D).filter(Assistant3D.id == assistant_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Assistant not found")
    
    if hasattr(obj, 'to_dict'):
        return obj.to_dict()
    else:
        return {
            "id": obj.id,
            "name": obj.name,
            "description": getattr(obj, 'description', None),
            "model_type": getattr(obj, 'model_type', 'basic'),
            "configuration": getattr(obj, 'configuration', {}),
            "is_active": getattr(obj, 'is_active', True),
            "created_at": getattr(obj, 'created_at', datetime.now()).isoformat() if hasattr(obj, 'created_at') else None,
            "updated_at": getattr(obj, 'updated_at', datetime.now()).isoformat() if hasattr(obj, 'updated_at') else None
        }

@router.put("/{assistant_id}", response_model=dict)
def update_assistant(assistant_id: int, payload: dict, db: Session = Depends(get_db)):
    """Mettre à jour un assistant 3D"""
    obj = db.query(Assistant3D).filter(Assistant3D.id == assistant_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Assistant not found")
    
    try:
        for key, value in payload.items():
            if hasattr(obj, key):
                setattr(obj, key, value)
        
        db.commit()
        db.refresh(obj)
        
        if hasattr(obj, 'to_dict'):
            return obj.to_dict()
        else:
            return {
                "id": obj.id,
                "name": obj.name,
                "description": getattr(obj, 'description', None),
                "model_type": getattr(obj, 'model_type', 'basic'),
                "configuration": getattr(obj, 'configuration', {}),
                "is_active": getattr(obj, 'is_active', True),
                "created_at": getattr(obj, 'created_at', datetime.now()).isoformat() if hasattr(obj, 'created_at') else None,
                "updated_at": getattr(obj, 'updated_at', datetime.now()).isoformat() if hasattr(obj, 'updated_at') else None
            }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{assistant_id}", response_model=dict)
def delete_assistant(assistant_id: int, db: Session = Depends(get_db)):
    """Supprimer un assistant 3D"""
    obj = db.query(Assistant3D).filter(Assistant3D.id == assistant_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Assistant not found")
    
    try:
        db.delete(obj)
        db.commit()
        return {"deleted": assistant_id, "success": True}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=list)
def list_assistants(
    skip: int = 0, 
    limit: int = 100, 
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Lister tous les assistants 3D"""
    query = db.query(Assistant3D)
    
    if is_active is not None:
        query = query.filter(Assistant3D.is_active == is_active)
    
    assistants = query.offset(skip).limit(limit).all()
    
    result = []
    for obj in assistants:
        if hasattr(obj, 'to_dict'):
            result.append(obj.to_dict())
        else:
            result.append({
                "id": obj.id,
                "name": obj.name,
                "description": getattr(obj, 'description', None),
                "model_type": getattr(obj, 'model_type', 'basic'),
                "configuration": getattr(obj, 'configuration', {}),
                "is_active": getattr(obj, 'is_active', True),
                "created_at": getattr(obj, 'created_at', datetime.now()).isoformat() if hasattr(obj, 'created_at') else None,
                "updated_at": getattr(obj, 'updated_at', datetime.now()).isoformat() if hasattr(obj, 'updated_at') else None
            })
    
    return result

@router.patch("/{assistant_id}/toggle")
def toggle_assistant(assistant_id: int, db: Session = Depends(get_db)):
    """Activer/Désactiver un assistant 3D"""
    obj = db.query(Assistant3D).filter(Assistant3D.id == assistant_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Assistant not found")
    
    obj.is_active = not obj.is_active
    db.commit()
    
    return {
        "id": assistant_id,
        "is_active": obj.is_active,
        "message": f"Assistant {'activé' if obj.is_active else 'désactivé'}"
    }