# backend/app/api/endpoints/car_damage.py
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional
import base64
import logging
from datetime import datetime  # ✅ AJOUTER CET IMPORT

from app.services.yolo_service import car_detector

logger = logging.getLogger(__name__)

# ✅ Le préfixe est "/damage" car on ajoute "/api/v1" dans main.py
router = APIRouter(prefix="/damage", tags=["car-damage"])


@router.post("/detect-car-damage")
async def detect_car_damage(
    file: UploadFile = File(...),
    claim_type: str = Form("accident")
):
    """
    Détection des dégâts sur une voiture avec YOLO + CNN
    """
    try:
        logger.info(f"📸 Détection de dégâts sur véhicule")
        
        image_bytes = await file.read()
        
        if not image_bytes:
            raise HTTPException(status_code=400, detail="Aucune image fournie")
        
        if len(image_bytes) < 100:
            raise HTTPException(status_code=400, detail="Image trop petite ou invalide")
        
        logger.info(f"📸 Image reçue: {file.filename}, taille: {len(image_bytes)} bytes")
        
        result = await car_detector.analyze_damage(image_bytes)
        
        result["claim_type"] = claim_type
        result["filename"] = file.filename
        result["timestamp"] = datetime.now().isoformat()
        
        logger.info(f"✅ Détection terminée: {result.get('severity', 'unknown')}")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur detect_car_damage: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/detect-realtime")
async def detect_realtime(
    file: UploadFile = File(...),
    claim_type: str = Form("accident")
):
    """
    Détection en temps réel des dégâts sur une voiture
    """
    try:
        logger.info(f"🚗 Détection en temps réel des dégâts")
        
        image_bytes = await file.read()
        
        if not image_bytes:
            raise HTTPException(status_code=400, detail="Aucune image fournie")
        
        if len(image_bytes) < 100:
            raise HTTPException(status_code=400, detail="Image trop petite ou invalide")
        
        logger.info(f"📸 Image reçue: {file.filename}, taille: {len(image_bytes)} bytes")
        
        result = await car_detector.analyze_damage(image_bytes)
        
        result["claim_type"] = claim_type
        result["detection_mode"] = "realtime"
        result["filename"] = file.filename
        result["timestamp"] = datetime.now().isoformat()
        result["analysis_id"] = f"REALTIME-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        logger.info(f"✅ Détection temps réel terminée: {result.get('severity', 'unknown')}")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur detect_realtime: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """
    Vérifier que le service est disponible
    """
    return {
        "status": "ok",
        "service": "car-damage-detection",
        "model_loaded": car_detector.model is not None,
        "device": str(car_detector.device),
        "version": "1.0.0"
    }


@router.get("/test")
async def test_endpoint():
    """
    Endpoint de test
    """
    return {
        "status": "ok",
        "message": "Car damage router is working",
        "endpoints": [
            {"method": "POST", "path": "/api/v1/damage/detect-car-damage", "description": "Détection standard"},
            {"method": "POST", "path": "/api/v1/damage/detect-realtime", "description": "Détection temps réel"},
            {"method": "GET", "path": "/api/v1/damage/health", "description": "Santé du service"},
            {"method": "GET", "path": "/api/v1/damage/test", "description": "Test du routeur"}
        ]
    }


logger.info("✅ Module Car Damage chargé")