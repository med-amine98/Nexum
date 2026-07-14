# backend/app/routes/unified_yolo.py
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.unified_yolo_service import yolo_service
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/detect")
async def detect_objects(file: UploadFile = File(...), task_type: str = "general"):
    """
    Détection d'objets dans une image (sans YOLO)
    """
    try:
        contents = await file.read()
        result = await yolo_service.detect(contents, task_type)
        
        if result["success"]:
            return result
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "Erreur détection"))
    
    except Exception as e:
        logger.error(f"Erreur: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def get_status():
    """Vérifier le statut du service"""
    return {
        "status": "active",
        "method": "mediapipe" if yolo_service.use_mediapipe else "opencv",
        "yolo_available": False
    }  