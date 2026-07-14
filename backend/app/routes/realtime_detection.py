# app/routes/realtime_detection.py
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import logging
from app.services.realtime_damage_service import realtime_service

router = APIRouter(prefix="/realtime", tags=["realtime-detection"])
logger = logging.getLogger(__name__)


@router.post("/detect")
async def detect_damage_realtime(
    photo: UploadFile = File(...),
    claim_type: str = Form("accident")
):
    """
    Détection de dégâts en temps réel avec YOLO
    Retourne l'image annotée avec les cadres colorés
    """
    try:
        image_data = await photo.read()
        result = await realtime_service.detect_damage_realtime(image_data, claim_type)
        
        if result.get("success"):
            return result
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "Erreur de détection"))
            
    except Exception as e:
        logger.error(f"Erreur: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Vérifie que le service est opérationnel"""
    return {"status": "ok", "service": "realtime-detection"}