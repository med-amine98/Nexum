# backend/app/routes/claim_analysis.py
from fastapi import APIRouter, UploadFile, File, HTTPException
import logging
from app.services.yolo_service import YOLODamageDetector
from app.services.building_damage_service import BuildingDamageDetector
from app.services.health_claim_service import HealthClaimDetector
from app.services.agricole_service import AgricoleDamageDetector


router = APIRouter(prefix="/claims", tags=["claim-analysis"])
yolo_detector = YOLODamageDetector()
building_detector = BuildingDamageDetector()
health_detector = HealthClaimDetector()
logger = logging.getLogger(__name__)
agricole_detector = AgricoleDamageDetector()

@router.post("/analyze-photo")
async def analyze_damage_photo(photo: UploadFile = File(...)):
    """Analyser une photo avec YOLO (Accident automobile)"""
    try:
        logger.info(f"📸 Réception de l'image: {photo.filename}")
        image_data = await photo.read()
        logger.info(f"📏 Taille de l'image: {len(image_data)} bytes")
        
        analysis = await yolo_detector.analyze_damage(image_data)
        
        logger.info(f"✅ Analyse terminée: {len(analysis.get('detected_parts', []))} pièces détectées")
        
        return analysis
    except Exception as e:
        logger.error(f"❌ Erreur: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-photo-public")
async def analyze_damage_photo_public(photo: UploadFile = File(...)):
    """Analyser une photo avec YOLO (endpoint public) - Accident automobile"""
    try:
        logger.info(f"📸 Réception de l'image (public): {photo.filename}")
        image_data = await photo.read()
        
        analysis = await yolo_detector.analyze_damage(image_data)
        
        return analysis
    except Exception as e:
        logger.error(f"❌ Erreur: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ NOUVEAUX ENDPOINTS HABITATION ============

@router.post("/analyze-building-damage")
async def analyze_building_damage(photo: UploadFile = File(...)):
    """Analyser une photo de dégâts d'habitation (incendie, eau, effraction)"""
    try:
        logger.info(f"🏠 Réception de l'image habitation: {photo.filename}")
        image_data = await photo.read()
        logger.info(f"📏 Taille de l'image: {len(image_data)} bytes")
        
        analysis = await building_detector.analyze_damage(image_data)
        
        logger.info(f"✅ Analyse habitation terminée: {analysis.get('damage_type', 'inconnu')}")
        
        return analysis
    except Exception as e:
        logger.error(f"❌ Erreur habitation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-building-damage-public")
async def analyze_building_damage_public(photo: UploadFile = File(...)):
    """Analyser une photo de dégâts d'habitation (endpoint public)"""
    try:
        logger.info(f"🏠 Réception de l'image habitation (public): {photo.filename}")
        image_data = await photo.read()
        
        analysis = await building_detector.analyze_damage(image_data)
        
        return analysis
    except Exception as e:
        logger.error(f"❌ Erreur: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ NOUVEAUX ENDPOINTS SANTE ============

@router.post("/analyze-medical-document")
async def analyze_medical_document(document: UploadFile = File(...)):
    """Analyser un document médical (ordonnance, feuille de soins)"""
    try:
        logger.info(f"💊 Réception du document médical: {document.filename}")
        image_data = await document.read()
        logger.info(f"📏 Taille du document: {len(image_data)} bytes")
        
        analysis = await health_detector.analyze_document(image_data)
        
        logger.info(f"✅ Analyse santé terminée: {analysis.get('care_type', 'inconnu')}")
        
        return analysis
    except Exception as e:
        logger.error(f"❌ Erreur santé: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-medical-document-public")
async def analyze_medical_document_public(document: UploadFile = File(...)):
    """Analyser un document médical (endpoint public)"""
    try:
        logger.info(f"💊 Réception du document médical (public): {document.filename}")
        image_data = await document.read()
        
        analysis = await health_detector.analyze_document(image_data)
        
        return analysis
    except Exception as e:
        logger.error(f"❌ Erreur: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    

@router.post("/analyze-agricole-damage")
async def analyze_agricole_damage(photo: UploadFile = File(...)):
    """Analyser une photo de sinistre agricole (maladie, dégâts climatiques)"""
    try:
        logger.info(f"🌾 Réception de l'image agricole: {photo.filename}")
        image_data = await photo.read()
        
        analysis = await agricole_detector.analyze_damage(image_data)
        
        return analysis
    except Exception as e:
        logger.error(f"❌ Erreur agricole: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze-agricole-damage-public")
async def analyze_agricole_damage_public(photo: UploadFile = File(...)):
    """Analyser une photo de sinistre agricole (endpoint public)"""
    try:
        logger.info(f"🌾 Réception de l'image agricole (public): {photo.filename}")
        image_data = await photo.read()
        
        analysis = await agricole_detector.analyze_damage(image_data)
        
        return analysis
    except Exception as e:
        logger.error(f"❌ Erreur: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
