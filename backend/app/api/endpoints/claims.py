# backend/app/api/endpoints/claims.py - Version corrigée avec l'endpoint public
"""
Déclaration de Sinistre Automatisée - API Endpoints
Utilisation de YOLO + CNN pour l'analyse des images
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime, date as date_type
import uuid
import logging
import os
from pathlib import Path
import random
import base64
import io
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.yolo_service import car_detector

logger = logging.getLogger(__name__)

router = APIRouter()
security = HTTPBearer()

# ==================== AUTHENTIFICATION ====================

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Récupère l'utilisateur courant
    """
    token = credentials.credentials
    
    # Simuler un utilisateur - à remplacer par votre logique
    class CurrentUser:
        id = 2
        email = "aminehechmi4@gmail.com"
        full_name = "Amine Hechmi"
        is_superuser = False
    
    return CurrentUser()


async def get_current_user_optional(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    """
    Récupère l'utilisateur courant (optionnel pour les endpoints publics)
    """
    try:
        return await get_current_user(credentials)
    except:
        class AnonymousUser:
            id = None
            email = "anonymous"
            full_name = "Anonyme"
            is_superuser = False
        return AnonymousUser()


# ==================== MODÈLES PYDANTIC ====================

class PhotoAnalysisRequest(BaseModel):
    photo_id: Optional[str] = None

class PhotoAnalysisResponse(BaseModel):
    photo_id: str
    damage_severity: int = Field(..., ge=1, le=10)
    damage_type: str
    description: str
    detected_objects: List[str] = Field(default_factory=list)
    estimated_repair_cost: float = Field(default=0.0)
    confidence: float
    annotated_image: Optional[str] = None

class ClaimSubmissionRequest(BaseModel):
    type: str
    claim_date: date_type
    description: str
    location: Optional[str] = None
    photos: List[Dict[str, Any]] = Field(default_factory=list)
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None

class ClaimSubmissionResponse(BaseModel):
    claim_number: str
    claim_id: str
    status: str
    estimated_amount: float
    analysis_confidence: float
    created_at: datetime
    next_steps: List[str] = Field(default_factory=list)


# ==================== SERVICES AVEC YOLO + CNN ====================

class RealImageAnalysisService:
    """
    Service d'analyse d'images utilisant YOLO + CNN
    """
    
    def __init__(self):
        self.detector = car_detector
        logger.info("✅ Service d'analyse d'images initialisé avec YOLO + CNN")
    
    async def analyze_photo(self, file: UploadFile) -> PhotoAnalysisResponse:
        """
        Analyse une photo avec YOLO + CNN
        """
        try:
            # Lire l'image
            image_bytes = await file.read()
            
            if not image_bytes:
                raise HTTPException(status_code=400, detail="Image vide")
            
            # Analyser avec YOLO
            result = await self.detector.analyze_damage(image_bytes)
            
            photo_id = str(uuid.uuid4())
            
            # Extraire les informations
            severity = result.get('severity', 'normal')
            severity_score = result.get('severity_score', 0)
            confidence = result.get('confidence', 0)
            damaged_parts = result.get('damaged_parts', [])
            estimated_cost = result.get('total_estimated_cost', 0)
            annotated_image = result.get('annotated_image', '')
            
            # Déterminer le type de dommage
            damage_type = "impact"
            if damaged_parts:
                damage_type = damaged_parts[0].get('part', 'impact').lower()
            
            # Niveau de sévérité (1-10)
            severity_level = int(severity_score / 10) if severity_score > 0 else 5
            severity_level = max(1, min(10, severity_level))
            
            # Description
            if severity == 'severe':
                description = f"Dégâts sévères détectés sur {len(damaged_parts)} pièce(s)"
            elif damaged_parts:
                description = f"Dégâts détectés sur {len(damaged_parts)} pièce(s)"
            else:
                description = "Aucun dégât majeur détecté"
            
            # Objets détectés
            detected_objects = [p.get('part', '') for p in damaged_parts if p.get('part')]
            
            return PhotoAnalysisResponse(
                photo_id=photo_id,
                damage_severity=severity_level,
                damage_type=damage_type,
                description=description,
                detected_objects=detected_objects,
                estimated_repair_cost=estimated_cost,
                confidence=confidence / 100 if confidence > 0 else 0.85,
                annotated_image=annotated_image
            )
            
        except Exception as e:
            logger.error(f"Erreur analyse photo: {e}")
            raise HTTPException(status_code=500, detail=f"Erreur lors de l'analyse: {str(e)}")


image_analysis_service = RealImageAnalysisService()

# Stockage temporaire
claims_db = {}
claim_counter = 0

# ==================== ROUTE PUBLIQUE EN PREMIER (CRUCIAL) ====================

@router.post("/analyze-photo-public")
async def analyze_photo_public(
    file: UploadFile = File(..., description="Image du véhicule à analyser"),
    claim_type: Optional[str] = Form("accident", description="Type de réclamation"),
    client_id: Optional[int] = Form(None, description="ID du client"),
    current_user = Depends(get_current_user_optional)
):
    """
    Analyse publique d'une photo avec YOLO + CNN
    """
    try:
        logger.info(f"📸 Analyse photo publique reçue")
        
        # Vérifier le fichier
        if not file:
            raise HTTPException(status_code=400, detail="Aucun fichier fourni")
        
        # Vérifier le type de fichier
        allowed_types = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400, 
                detail=f"Type de fichier non supporté. Utilisez: {', '.join(allowed_types)}"
            )
        
        # Lire l'image
        image_bytes = await file.read()
        
        if not image_bytes:
            raise HTTPException(status_code=400, detail="L'image est vide")
        
        if len(image_bytes) < 100:
            raise HTTPException(status_code=400, detail="L'image est trop petite ou corrompue")
        
        logger.info(f"📸 Analyse d'image: {file.filename}, taille: {len(image_bytes)} bytes")
        
        # Analyser avec YOLO
        result = await car_detector.analyze_damage(image_bytes)
        
        # Ajouter des métadonnées
        result["analysis_id"] = f"ANALYSIS-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        result["filename"] = file.filename
        result["claim_type"] = claim_type
        result["client_id"] = client_id
        result["timestamp"] = datetime.now().isoformat()
        
        logger.info(f"✅ Analyse terminée: {result.get('severity', 'unknown')}")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur analyse photo: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'analyse: {str(e)}")


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
        "params": {
            "file": "Fichier image (multipart/form-data)",
            "claim_type": "Type de réclamation (optionnel)",
            "client_id": "ID du client (optionnel)"
        }
    }


# ==================== ENDPOINTS AUTHENTIFIÉS ====================

@router.post("/claims/analyze-photo")
async def analyze_claim_photo(
    photo: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    """
    Analyse d'une photo avec YOLO + CNN (authentifié)
    """
    try:
        if not photo.content_type or not photo.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Le fichier doit être une image")
        
        analysis = await image_analysis_service.analyze_photo(photo)
        return analysis
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur analyse photo: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/claims/analyze-photos")
async def analyze_claim_photos(
    photos: List[UploadFile] = File(...),
    current_user = Depends(get_current_user)
):
    """
    Analyse de plusieurs photos avec YOLO + CNN
    """
    try:
        results = []
        for photo in photos:
            if photo.content_type and photo.content_type.startswith('image/'):
                analysis = await image_analysis_service.analyze_photo(photo)
                results.append(analysis.dict())
        
        if results:
            total_cost = sum(r.get('estimated_repair_cost', 0) for r in results)
            avg_confidence = sum(r.get('confidence', 0) for r in results) / len(results)
            max_severity = max(r.get('damage_severity', 0) for r in results)
            
            return {
                "photos_analyzed": len(results),
                "total_estimated_cost": round(total_cost, 2),
                "average_confidence": round(avg_confidence, 2),
                "max_severity": max_severity,
                "results": results,
                "recommendation": "Expertise recommandée" if max_severity > 7 else "Réparation standard"
            }
        
        return {
            "photos_analyzed": 0,
            "results": [],
            "message": "Aucune photo analysable"
        }
        
    except Exception as e:
        logger.error(f"Erreur analyse multiple: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/claims/submit")
async def submit_claim(
    request: ClaimSubmissionRequest,
    current_user = Depends(get_current_user)
):
    """
    Soumission d'un sinistre
    """
    try:
        global claim_counter
        claim_counter += 1
        claim_id = claim_counter
        
        claim_number = f"CLM-{datetime.now().strftime('%Y%m%d')}-{str(claim_id).zfill(4)}"
        
        # Créer le sinistre
        claim_data = {
            "id": claim_id,
            "claim_number": claim_number,
            "client_name": current_user.full_name,
            "client_email": current_user.email,
            "client_phone": request.contact_phone,
            "type": request.type,
            "amount": 0,
            "status": "pending",
            "description": request.description,
            "incident_date": request.claim_date.isoformat(),
            "created_at": datetime.now().isoformat()
        }
        claims_db[claim_id] = claim_data
        
        next_steps = [
            "Un expert examinera votre dossier sous 24h",
            "Vous serez contacté pour planifier une expertise",
            "Une estimation définitive vous sera communiquée"
        ]
        
        return {
            "claim_number": claim_number,
            "claim_id": str(claim_id),
            "status": "pending",
            "estimated_amount": 0,
            "analysis_confidence": 0,
            "created_at": datetime.now(),
            "next_steps": next_steps
        }
        
    except Exception as e:
        logger.error(f"Erreur soumission: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/claims/{claim_id}/tracking")
async def track_claim_by_id(
    claim_id: int,
    current_user = Depends(get_current_user)
):
    """Suivi d'un sinistre par ID"""
    claim = claims_db.get(claim_id)
    
    if not claim:
        raise HTTPException(status_code=404, detail="Sinistre non trouvé")
    
    return {
        "claim_number": claim.get("claim_number"),
        "claim_id": claim_id,
        "status": claim.get("status", "pending"),
        "status_color": "warning",
        "current_step": 1,
        "claim_type": claim.get("type", "autre"),
        "description": claim.get("description", ""),
        "steps": [],
        "estimated_completion": None,
        "expert": None,
        "required_documents": [],
        "notifications": [],
        "last_update": datetime.now()
    }


@router.get("/claims/stats")
async def get_claims_stats(
    current_user = Depends(get_current_user)
):
    """Récupère les statistiques des sinistres"""
    try:
        return {
            "total": len(claims_db),
            "processed": 0,
            "pending": len(claims_db),
            "total_amount": 0,
            "compensated_amount": 0,
            "avg_processing_time": 0,
            "on_time_rate": 0,
            "loss_ratio": 0
        }
    except Exception as e:
        logger.error(f"Erreur stats: {e}")
        return {
            "total": 0,
            "processed": 0,
            "pending": 0,
            "total_amount": 0,
            "compensated_amount": 0,
            "avg_processing_time": 0,
            "on_time_rate": 0,
            "loss_ratio": 0
        }


logger.info("✅ Module Claims chargé avec YOLO + CNN")