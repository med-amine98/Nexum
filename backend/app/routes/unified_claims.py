# app/routes/unified_claims.py
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.unified_pretrained_service import UnifiedPretrainedService

router = APIRouter(prefix="/unified-claims", tags=["unified-claims"])
service = UnifiedPretrainedService()

@router.post("/classify")
async def classify_image(photo: UploadFile = File(...)):
    """Classifie l'image avec ResNet50 pré-entraîné"""
    image_data = await photo.read()
    result = await service.classify_image(image_data)
    return result

@router.post("/detect-anomaly")
async def detect_anomaly(photo: UploadFile = File(...)):
    """Détecte les anomalies dans l'image"""
    image_data = await photo.read()
    result = await service.detect_anomaly(image_data)
    return result

@router.post("/full-analysis")
async def full_analysis(photo: UploadFile = File(...)):
    """Analyse complète avec tous les modèles"""
    image_data = await photo.read()
    result = await service.full_analysis(image_data)
    return result