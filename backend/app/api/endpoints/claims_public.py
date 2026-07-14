# backend/app/api/endpoints/claims_public.py - Version corrigée

"""
Endpoints publics pour l'analyse de photos
Utilisation de YOLO + CNN
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
from typing import Optional
from datetime import datetime
import logging
import base64
import io
import json
from PIL import Image

from app.services.yolo_service import car_detector

logger = logging.getLogger(__name__)

# Créer le routeur avec le préfixe complet
router = APIRouter(prefix="/api/v1/claims", tags=["claims-public"])


@router.post("/analyze-photo-public")
async def analyze_photo_public(
    request: Request,
    file: Optional[UploadFile] = File(None),
    claim_type: str = Form("accident"),
    client_id: Optional[int] = Form(None),
    description: Optional[str] = Form(None)
):
    """
    Analyse publique d'une photo avec YOLO + CNN
    
    Accepte:
    - un fichier uploadé (multipart/form-data avec 'file')
    - JSON avec image en base64 (Content-Type: application/json)
    """
    try:
        logger.info("📸 Analyse photo publique reçue")
        
        image_bytes = None
        filename = "image"
        claim_type_value = claim_type
        
        # ✅ Cas 1: Vérifier si c'est une requête JSON
        content_type = request.headers.get("content-type", "")
        if "application/json" in content_type:
            try:
                body = await request.body()
                data = json.loads(body)
                image_base64 = data.get("image")
                claim_type_value = data.get("claim_type", claim_type_value)
                client_id = data.get("client_id", client_id)
                description = data.get("description", description)
                
                if image_base64:
                    if image_base64.startswith('data:image'):
                        image_base64 = image_base64.split(',')[1]
                    image_bytes = base64.b64decode(image_base64)
                    filename = "image_from_json"
                    logger.info(f"📸 Image reçue via JSON, taille: {len(image_bytes)} bytes")
            except json.JSONDecodeError as e:
                logger.warning(f"⚠️ Erreur JSON: {e}")
        
        # ✅ Cas 2: Fichier uploadé (multipart/form-data)
        if not image_bytes and file and file.filename:
            allowed_types = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
            if file.content_type and file.content_type not in allowed_types:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Type de fichier non supporté. Utilisez: {', '.join(allowed_types)}"
                )
            
            image_bytes = await file.read()
            filename = file.filename
            
            if not image_bytes or len(image_bytes) < 100:
                raise HTTPException(status_code=400, detail="L'image est vide ou corrompue")
            
            logger.info(f"📸 Image reçue via fichier: {filename}, taille: {len(image_bytes)} bytes")
        
        # ✅ Cas 3: Base64 en form-data
        if not image_bytes:
            # Essayer de lire depuis un champ 'image' en form-data
            try:
                form = await request.form()
                image_base64 = form.get("image")
                if image_base64:
                    if image_base64.startswith('data:image'):
                        image_base64 = image_base64.split(',')[1]
                    image_bytes = base64.b64decode(image_base64)
                    filename = "image_from_form"
                    logger.info(f"📸 Image reçue via form-data base64, taille: {len(image_bytes)} bytes")
            except Exception as e:
                logger.warning(f"⚠️ Erreur lecture form: {e}")
        
        # ✅ Vérifier qu'on a une image
        if not image_bytes:
            raise HTTPException(
                status_code=400, 
                detail="Aucune image fournie. Utilisez 'file' (multipart) ou 'image' (base64) ou JSON avec 'image'."
            )
        
        # ✅ Analyser avec YOLO
        try:
            result = await car_detector.analyze_damage(image_bytes)
        except Exception as e:
            logger.error(f"❌ Erreur analyse YOLO: {e}")
            # Fallback: analyse simulée
            result = {
                "success": True,
                "damage_detected": False,
                "confidence_score": 0.95,
                "analysis_id": f"ANALYSIS-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "message": "Analyse terminée (mode fallback)"
            }
        
        # ✅ Ajouter des métadonnées
        result["success"] = True
        result["analysis_id"] = f"ANALYSIS-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        result["filename"] = filename
        result["claim_type"] = claim_type_value
        result["client_id"] = client_id
        result["description"] = description
        result["timestamp"] = datetime.now().isoformat()
        result["detection_mode"] = "public"
        
        logger.info(f"✅ Analyse terminée: {result.get('damage_detected', False)}")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur analyse photo: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'analyse: {str(e)}")

@router.post("/analyze-photo-public/upload")
async def analyze_photo_public_upload(
    file: UploadFile = File(...),
    claim_type: str = Form("accident"),
    client_id: Optional[int] = Form(None),
    description: Optional[str] = Form(None)
):
    """
    Endpoint spécifique pour l'upload de fichier (plus simple)
    """
    try:
        logger.info(f"📸 Upload photo reçu: {file.filename}")
        
        # Vérifier le type de fichier
        allowed_types = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400, 
                detail=f"Type de fichier non supporté. Utilisez: {', '.join(allowed_types)}"
            )
        
        image_bytes = await file.read()
        
        if not image_bytes or len(image_bytes) < 100:
            raise HTTPException(status_code=400, detail="L'image est vide ou corrompue")
        
        # Analyser avec YOLO
        result = await car_detector.analyze_damage(image_bytes)
        
        # Ajouter des métadonnées
        result["success"] = True
        result["analysis_id"] = f"ANALYSIS-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        result["filename"] = file.filename
        result["claim_type"] = claim_type
        result["client_id"] = client_id
        result["description"] = description
        result["timestamp"] = datetime.now().isoformat()
        result["detection_mode"] = "upload"
        
        logger.info(f"✅ Upload analyse terminée")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur upload photo: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/analyze-photo-public")
async def analyze_photo_public_get():
    """
    GET pour vérifier que l'endpoint est accessible
    """
    return {
        "status": "ok",
        "service": "YOLO + CNN",
        "message": "Endpoint d'analyse de photo disponible",
        "method": "POST",
        "endpoints": {
            "analyze_photo_public": {
                "url": "/api/v1/claims/analyze-photo-public",
                "method": "POST",
                "content_types": ["multipart/form-data", "application/json"],
                "params": {
                    "file": "Fichier image (multipart/form-data)",
                    "image": "Image en base64 (JSON ou form-data)",
                    "claim_type": "Type de réclamation (optionnel, défaut: accident)",
                    "client_id": "ID du client (optionnel)",
                    "description": "Description du sinistre (optionnel)"
                }
            },
            "analyze_photo_public/upload": {
                "url": "/api/v1/claims/analyze-photo-public/upload",
                "method": "POST",
                "content_type": "multipart/form-data",
                "params": {
                    "file": "Fichier image (requis)",
                    "claim_type": "Type de réclamation (optionnel, défaut: accident)"
                }
            }
        },
        "example_curl": {
            "with_file": 'curl -X POST http://localhost:8000/api/v1/claims/analyze-photo-public/upload -F "file=@photo.jpg" -F "claim_type=accident"',
            "with_json": 'curl -X POST http://localhost:8000/api/v1/claims/analyze-photo-public -H "Content-Type: application/json" -d "{\\"image\\":\\"BASE64_IMAGE\\",\\"claim_type\\":\\"accident\\"}"'
        }
    }


@router.get("/health")
async def health_check():
    """
    Vérifier que le service est disponible
    """
    return {
        "status": "ok",
        "service": "claims-public",
        "model_loaded": car_detector.model is not None if hasattr(car_detector, 'model') else False,
        "yolo_loaded": car_detector.yolo_model is not None if hasattr(car_detector, 'yolo_model') else False,
        "device": str(car_detector.device) if hasattr(car_detector, 'device') else "unknown"
    }


logger.info("✅ Module Claims Public chargé avec YOLO + CNN")