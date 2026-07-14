# app/api/ocr.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from typing import List, Optional, Dict, Any
from datetime import datetime
import os
import uuid
import logging
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.ocr import (
    OCRDocument, ExtractionRule, OCRCorrection,
    DocumentStatus, DocumentType, FraudLevel
)

# IMPORT CORRIGÉ - Utilisation de l'instance ou de la classe
try:
    from app.services.ocr_ai import ocr_ai_service
    logger = logging.getLogger(__name__)
    logger.info("✅ OCR Service importé avec succès")
except ImportError as e:
    logger = logging.getLogger(__name__)
    logger.warning(f"⚠️ Erreur import OCR Service: {e}")
    # Créer un service fallback
    try:
        from app.services.ocr_ai import OCRService
        ocr_ai_service = OCRService()
        logger.info("✅ OCR Service créé depuis la classe")
    except Exception as e2:
        logger.error(f"❌ Erreur création OCR Service: {e2}")
        ocr_ai_service = None

from app.core.dependencies import get_current_user, get_optional_user
from app.models.auth import User

# ============================================
# ROUTEUR SANS PREFIX (ajouté dans main.py)
# ============================================

router = APIRouter()

# Liste des valeurs valides pour document_type
VALID_DOCUMENT_TYPES = ["invoice", "id_card", "contract", "receipt", "passport", "bank_statement", "other"]

# ============================================
# 1. STATISTIQUES
# ============================================

@router.get("/ocr/stats")
async def get_ocr_stats(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Statistiques OCR"""
    try:
        total = db.query(OCRDocument).count()
        completed = db.query(OCRDocument).filter(OCRDocument.status == DocumentStatus.COMPLETED).count()
        pending = db.query(OCRDocument).filter(OCRDocument.status == DocumentStatus.PENDING).count()
        failed = db.query(OCRDocument).filter(OCRDocument.status == DocumentStatus.FAILED).count()
        
        fraud_detected = db.query(OCRDocument).filter(OCRDocument.fraud_level.in_([FraudLevel.HIGH, FraudLevel.CRITICAL])).count()
        
        avg_confidence = db.query(OCRDocument.ocr_confidence).filter(OCRDocument.ocr_confidence > 0).all()
        avg_conf = sum([c[0] for c in avg_confidence]) / len(avg_confidence) if avg_confidence else 0
        
        return {
            "total": total,
            "processed": completed,
            "pending": pending,
            "failed": failed,
            "avgConfidence": round(avg_conf, 1),
            "fraudDetected": fraud_detected
        }
    except Exception as e:
        logger.error(f"Erreur stats: {e}")
        return {
            "total": 0,
            "processed": 0,
            "pending": 0,
            "failed": 0,
            "avgConfidence": 0,
            "fraudDetected": 0
        }

# ============================================
# 2. LISTE DES DOCUMENTS
# ============================================

@router.get("/ocr/documents")
async def get_documents(
    status: Optional[str] = Query(None),
    document_type: Optional[str] = Query(None),
    fraud_level: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Récupérer la liste des documents"""
    try:
        query = db.query(OCRDocument)
        
        if status and status != 'all':
            query = query.filter(OCRDocument.status == status)
        if document_type and document_type != 'all':
            query = query.filter(OCRDocument.document_type == document_type)
        if fraud_level and fraud_level != 'all':
            query = query.filter(OCRDocument.fraud_level == fraud_level)
        
        documents = query.order_by(OCRDocument.uploaded_at.desc()).offset(skip).limit(limit).all()
        
        return [doc.to_dict() for doc in documents]
    except Exception as e:
        logger.error(f"Erreur get_documents: {e}")
        return []

# ============================================
# 3. RÈGLES D'EXTRACTION
# ============================================

@router.get("/ocr/extraction-rules")
async def get_extraction_rules(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Récupérer les règles d'extraction"""
    try:
        rules = db.query(ExtractionRule).filter(ExtractionRule.is_active == True).all()
        return [rule.to_dict() for rule in rules]
    except Exception as e:
        logger.error(f"Erreur extraction_rules: {e}")
        return []

@router.post("/ocr/extraction-rules")
async def create_extraction_rule(
    rule_data: dict,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Créer une règle d'extraction"""
    try:
        doc_type = rule_data.get('document_type', 'other')
        if doc_type not in VALID_DOCUMENT_TYPES:
            doc_type = "other"
        
        rule = ExtractionRule(
            field_name=rule_data.get('field_name'),
            pattern=rule_data.get('pattern'),
            position=rule_data.get('position'),
            document_type=doc_type,
            is_regex=rule_data.get('is_regex', False),
            is_active=True
        )
        
        db.add(rule)
        db.commit()
        db.refresh(rule)
        
        return rule.to_dict()
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur create_rule: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/ocr/extraction-rules/{rule_id}")
async def delete_extraction_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Supprimer une règle d'extraction"""
    try:
        rule = db.query(ExtractionRule).filter(ExtractionRule.id == rule_id).first()
        if not rule:
            raise HTTPException(status_code=404, detail="Règle non trouvée")
        
        db.delete(rule)
        db.commit()
        
        return {"success": True, "message": "Règle supprimée"}
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur delete_rule: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# 4. CORRECTIONS
# ============================================

@router.get("/ocr/corrections")
async def get_corrections(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Récupérer les corrections"""
    try:
        corrections = db.query(OCRCorrection).order_by(OCRCorrection.created_at.desc()).limit(50).all()
        
        result = []
        for corr in corrections:
            doc = db.query(OCRDocument).filter(OCRDocument.id == corr.document_id).first()
            result.append({
                "id": corr.id,
                "document_id": corr.document_id,
                "document_name": doc.original_filename if doc else None,
                "field_name": corr.field_name,
                "original_text": corr.original_text,
                "corrected_text": corr.corrected_text,
                "validated": corr.validated
            })
        
        return result
    except Exception as e:
        logger.error(f"Erreur corrections: {e}")
        return []

@router.post("/ocr/corrections")
async def create_correction(
    correction_data: dict,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Créer une correction"""
    try:
        correction = OCRCorrection(
            document_id=correction_data.get('document_id'),
            field_name=correction_data.get('field_name'),
            original_text=correction_data.get('original_text'),
            corrected_text=correction_data.get('corrected_text'),
            validated=correction_data.get('validated', False)
        )
        
        db.add(correction)
        db.commit()
        db.refresh(correction)
        
        return {"success": True, "id": correction.id}
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur create_correction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/ocr/corrections/{correction_id}")
async def update_correction(
    correction_id: int,
    correction_data: dict,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Mettre à jour une correction"""
    try:
        correction = db.query(OCRCorrection).filter(OCRCorrection.id == correction_id).first()
        if not correction:
            raise HTTPException(status_code=404, detail="Correction non trouvée")
        
        if 'validated' in correction_data:
            correction.validated = correction_data['validated']
            if correction.validated:
                correction.validated_at = datetime.utcnow()
        
        db.commit()
        
        return {"success": True}
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur update_correction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# 5. UPLOAD - ENDPOINT PRINCIPAL
# ============================================

@router.post("/ocr/upload")
async def upload_document(
    file: UploadFile = File(...),
    document_type: str = Form("other"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Upload un document pour analyse OCR"""
    try:
        # Vérifier que le service OCR est disponible
        if ocr_ai_service is None:
            logger.error("❌ Service OCR non disponible")
            raise HTTPException(status_code=503, detail="Service OCR non disponible")
        
        # Validation du document_type
        if document_type not in VALID_DOCUMENT_TYPES:
            document_type = "other"
        
        # Validation du fichier
        allowed_types = ["image/jpeg", "image/png", "image/tiff", "application/pdf"]
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Type de fichier non supporté")
        
        # Sauvegarder le fichier
        upload_dir = "uploads/ocr"
        os.makedirs(upload_dir, exist_ok=True)
        
        file_id = str(uuid.uuid4())[:8]
        filename = f"{file_id}_{file.filename}"
        file_path = f"{upload_dir}/{filename}"
        
        file_content = await file.read()
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        # Extraire le texte avec OCR
        logger.info(f"📄 Extraction OCR pour: {file.filename}")
        ocr_result = ocr_ai_service.extract_text(file_content)
        
        # Analyser le layout
        logger.info(f"📐 Analyse layout pour: {file.filename}")
        layout_result = ocr_ai_service.analyze_layout(file_content)
        
        # Détecter les falsifications
        logger.info(f"🔍 Détection falsifications pour: {file.filename}")
        forgery_result = ocr_ai_service.detect_forgery(file_content)
        
        # Calculer le score de fraude
        fraud_result = ocr_ai_service.calculate_fraud_score(
            forgery_result, 
            layout_result, 
            {"score": 80, "inconsistencies": []}
        )
        
        # Créer le document
        document = OCRDocument(
            filename=filename,
            original_filename=file.filename,
            file_path=file_path,
            file_size=len(file_content),
            mime_type=file.content_type,
            document_type=document_type,
            status=DocumentStatus.PENDING,
            extracted_text=ocr_result.get('text', ''),
            ocr_confidence=ocr_result.get('confidence', 0),
            extracted_data=layout_result.get('extracted_fields', {}),
            fraud_score=fraud_result.get('fraud_score', 0),
            fraud_level=fraud_result.get('fraud_level', FraudLevel.NONE),
            authenticity_score=fraud_result.get('authenticity_score', 0),
            forgery_score=forgery_result.get('forgery_score', 0),
            manipulated_regions=forgery_result.get('manipulated_regions', []),
            layout_anomalies=layout_result.get('anomalies', []),
            uploaded_at=datetime.utcnow(),
            user_id=current_user.id if current_user else None
        )
        
        db.add(document)
        db.commit()
        db.refresh(document)
        
        # Mettre à jour le statut après traitement
        document.status = DocumentStatus.COMPLETED
        document.processed_at = datetime.utcnow()
        db.commit()
        
        logger.info(f"✅ Document traité: {file.filename} (ID: {document.id})")
        
        return {
            "success": True,
            "id": document.id,
            "filename": file.filename,
            "document_type": document_type,
            "ocr_confidence": document.ocr_confidence,
            "fraud_score": document.fraud_score,
            "fraud_level": document.fraud_level.value if document.fraud_level else "none",
            "message": "Document traité avec succès"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur upload: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'upload: {str(e)}")

# ============================================
# 6. PROCESS - TRAITEMENT COMPLET
# ============================================

@router.post("/ocr/process/{document_id}")
async def process_document(
    document_id: int,
    language: str = "fra+eng",
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Traite un document avec analyse complète"""
    try:
        # Vérifier que le service OCR est disponible
        if ocr_ai_service is None:
            logger.error("❌ Service OCR non disponible")
            raise HTTPException(status_code=503, detail="Service OCR non disponible")
        
        document = db.query(OCRDocument).filter(OCRDocument.id == document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document non trouvé")
        
        # Lire le fichier
        with open(document.file_path, "rb") as f:
            file_content = f.read()
        
        # Extraire le texte avec OCR
        ocr_result = ocr_ai_service.extract_text(file_content)
        
        # Analyser le layout
        layout_result = ocr_ai_service.analyze_layout(file_content)
        
        # Détecter les falsifications
        forgery_result = ocr_ai_service.detect_forgery(file_content)
        
        # Mettre à jour le document
        document.extracted_text = ocr_result.get('text', '')
        document.ocr_confidence = ocr_result.get('confidence', 0)
        document.extracted_data = layout_result.get('extracted_fields', {})
        document.fraud_score = forgery_result.get('forgery_score', 0)
        document.authenticity_score = 100 - forgery_result.get('forgery_score', 0)
        document.forgery_score = forgery_result.get('forgery_score', 0)
        document.manipulated_regions = forgery_result.get('manipulated_regions', [])
        document.layout_anomalies = layout_result.get('anomalies', [])
        document.status = DocumentStatus.COMPLETED
        document.processed_at = datetime.utcnow()
        
        # Déterminer le niveau de fraude
        fraud_score = forgery_result.get('forgery_score', 0)
        if fraud_score > 80:
            document.fraud_level = FraudLevel.CRITICAL
        elif fraud_score > 60:
            document.fraud_level = FraudLevel.HIGH
        elif fraud_score > 40:
            document.fraud_level = FraudLevel.MEDIUM
        elif fraud_score > 20:
            document.fraud_level = FraudLevel.LOW
        else:
            document.fraud_level = FraudLevel.NONE
        
        db.commit()
        
        return {
            "id": document.id,
            "status": "completed",
            "confidence": document.ocr_confidence,
            "fraud_score": document.fraud_score,
            "fraud_level": document.fraud_level.value if document.fraud_level else "none",
            "authenticity_score": document.authenticity_score,
            "extracted_data": document.extracted_data,
            "text": document.extracted_text[:1000] if document.extracted_text else "",
            "manipulated_regions": document.manipulated_regions,
            "layout_anomalies": document.layout_anomalies
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur process: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors du traitement: {str(e)}")

# ============================================
# 7. EXTRACT - EXTRACTION AVEC RÈGLES
# ============================================

@router.post("/ocr/extract/{document_id}")
async def extract_document_data(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Extraire les données d'un document avec les règles"""
    try:
        # Vérifier que le service OCR est disponible
        if ocr_ai_service is None:
            logger.error("❌ Service OCR non disponible")
            raise HTTPException(status_code=503, detail="Service OCR non disponible")
        
        document = db.query(OCRDocument).filter(OCRDocument.id == document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document non trouvé")
        
        # Récupérer les règles d'extraction
        rules = db.query(ExtractionRule).filter(ExtractionRule.is_active == True).all()
        rules_data = [{"field_name": r.field_name, "pattern": r.pattern, "is_regex": r.is_regex} for r in rules]
        
        # Extraire les données selon les règles
        extracted_by_rules = ocr_ai_service.extract_data_by_rules(
            document.extracted_text or '', 
            rules_data
        )
        
        # Mettre à jour le document
        document.extracted_data = extracted_by_rules
        db.commit()
        
        return {
            "success": True,
            "document_id": document.id,
            "extracted_data": extracted_by_rules,
            "fraud_score": document.fraud_score,
            "fraud_level": document.fraud_level.value if document.fraud_level else "none",
            "authenticity_score": document.authenticity_score
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur extract: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'extraction: {str(e)}")

# ============================================
# 8. GET DOCUMENT - RÉCUPÉRER UN DOCUMENT
# ============================================

@router.get("/ocr/documents/{document_id}")
async def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Récupérer un document spécifique"""
    try:
        document = db.query(OCRDocument).filter(OCRDocument.id == document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document non trouvé")
        
        return document.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur get_document: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# 9. DELETE - SUPPRESSION
# ============================================

@router.delete("/ocr/documents/{document_id}")
async def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Supprimer un document"""
    try:
        document = db.query(OCRDocument).filter(OCRDocument.id == document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document non trouvé")
        
        # Supprimer le fichier physique
        if os.path.exists(document.file_path):
            os.remove(document.file_path)
        
        db.delete(document)
        db.commit()
        
        return {"success": True, "message": "Document supprimé"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur delete: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression: {str(e)}")

# ============================================
# 10. ANALYSE DOCUMENT - ANALYSE RAPIDE
# ============================================

@router.post("/ocr/analyze")
async def analyze_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Analyser rapidement un document sans le sauvegarder"""
    try:
        # Vérifier que le service OCR est disponible
        if ocr_ai_service is None:
            logger.error("❌ Service OCR non disponible")
            raise HTTPException(status_code=503, detail="Service OCR non disponible")
        
        # Validation du fichier
        allowed_types = ["image/jpeg", "image/png", "image/tiff", "application/pdf"]
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Type de fichier non supporté")
        
        file_content = await file.read()
        
        # Extraire le texte avec OCR
        ocr_result = ocr_ai_service.extract_text(file_content)
        
        # Détecter les falsifications
        forgery_result = ocr_ai_service.detect_forgery(file_content)
        
        return {
            "filename": file.filename,
            "text": ocr_result.get('text', '')[:500],
            "confidence": ocr_result.get('confidence', 0),
            "fraud_score": forgery_result.get('forgery_score', 0),
            "fraud_level": "critical" if forgery_result.get('forgery_score', 0) > 80 else 
                          "high" if forgery_result.get('forgery_score', 0) > 60 else 
                          "medium" if forgery_result.get('forgery_score', 0) > 40 else 
                          "low" if forgery_result.get('forgery_score', 0) > 20 else "none",
            "manipulated_regions": forgery_result.get('manipulated_regions', []),
            "word_count": len(ocr_result.get('text', '').split())
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur analyze: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'analyse: {str(e)}")

logger.info("✅ MODULE OCR CHARGÉ AVEC SUCCÈS")