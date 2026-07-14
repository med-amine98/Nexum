# app/routes/ocr_routes.py
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from typing import List, Dict, Any
import shutil
import os
import uuid
from datetime import datetime
import logging

# Imports relatifs pour éviter les problèmes
from ..services.ocr_ai import OCRService
from ..models.ocr_models import (
    OCRDocument, OCRStats, OCRRule, OCRCorrection,
    OCRDocumentResponse, OCRStatsResponse
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/ocr", tags=["OCR"])

# Initialiser le service OCR
try:
    ocr_service = OCRService()
    logger.info("✅ Service OCR initialisé avec succès")
except Exception as e:
    logger.error(f"❌ Erreur d'initialisation OCR: {str(e)}")
    ocr_service = None

# Stockage en mémoire (à remplacer par une base de données)
documents_db = {}
rules_db = []
corrections_db = []
stats_db = {
    'total': 0,
    'processed': 0,
    'pending': 0,
    'failed': 0,
    'avgConfidence': 0,
    'fraudDetected': 0
}

# ========== STATS ==========
@router.get("/stats", response_model=OCRStatsResponse)
async def get_stats():
    """Récupérer les statistiques OCR"""
    try:
        # Compter les documents par statut
        processed = sum(1 for d in documents_db.values() if d.get('status') in ['completed', 'processed'])
        pending = sum(1 for d in documents_db.values() if d.get('status') == 'pending')
        failed = sum(1 for d in documents_db.values() if d.get('status') == 'failed')
        
        # Calculer la confiance moyenne
        confidences = [d.get('ocr_confidence', 0) for d in documents_db.values() if d.get('ocr_confidence')]
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0
        
        # Compter les fraudes
        fraud_detected = sum(1 for d in documents_db.values() if d.get('fraud_level') in ['critical', 'high'])
        
        stats_db.update({
            'total': len(documents_db),
            'processed': processed,
            'pending': pending,
            'failed': failed,
            'avgConfidence': avg_confidence,
            'fraudDetected': fraud_detected
        })
        
        return stats_db
    except Exception as e:
        logger.error(f"❌ Erreur stats: {str(e)}")
        return stats_db

# ========== DOCUMENTS ==========
@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    document_type: str = "other"
):
    """Uploader un document pour OCR"""
    try:
        if ocr_service is None:
            raise HTTPException(status_code=503, detail="Service OCR non disponible")
        
        # Créer un ID unique
        doc_id = str(uuid.uuid4())
        
        # Sauvegarder le fichier temporairement
        temp_dir = "/tmp/ocr_uploads"
        os.makedirs(temp_dir, exist_ok=True)
        
        file_path = os.path.join(temp_dir, f"{doc_id}_{file.filename}")
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Enregistrer le document
        documents_db[doc_id] = {
            'id': doc_id,
            'original_filename': file.filename,
            'file_path': file_path,
            'file_size': os.path.getsize(file_path),
            'document_type': document_type,
            'status': 'pending',
            'uploaded_at': datetime.now().isoformat(),
            'processed_at': None,
            'ocr_confidence': 0,
            'extracted_text': '',
            'extracted_data': {},
            'fraud_score': 0,
            'fraud_level': 'none',
            'authenticity_score': 0,
            'manipulated_regions': []
        }
        
        logger.info(f"📄 Document uploadé: {file.filename} (ID: {doc_id})")
        
        return {'id': doc_id, 'filename': file.filename}
        
    except Exception as e:
        logger.error(f"❌ Erreur upload: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/process/{doc_id}")
async def process_document(doc_id: str, language: str = "fra+eng"):
    """Traiter un document avec OCR"""
    try:
        if ocr_service is None:
            raise HTTPException(status_code=503, detail="Service OCR non disponible")
        
        if doc_id not in documents_db:
            raise HTTPException(status_code=404, detail="Document non trouvé")
        
        doc = documents_db[doc_id]
        doc['status'] = 'processing'
        
        # Extraire le texte
        result = ocr_service.extract_text(doc['file_path'])
        
        if result:
            doc['extracted_text'] = result['text']
            doc['ocr_confidence'] = result['confidence_avg']
            doc['status'] = 'processed'
            doc['processed_at'] = datetime.now().isoformat()
            
            # Détection de fraude
            fraud_analysis = ocr_service.detect_fraud(doc['file_path'])
            doc['fraud_score'] = fraud_analysis['fraud_score']
            doc['authenticity_score'] = fraud_analysis['authenticity_score']
            
            # Niveau de fraude
            if doc['fraud_score'] > 80:
                doc['fraud_level'] = 'critical'
            elif doc['fraud_score'] > 60:
                doc['fraud_level'] = 'high'
            elif doc['fraud_score'] > 40:
                doc['fraud_level'] = 'medium'
            elif doc['fraud_score'] > 20:
                doc['fraud_level'] = 'low'
            else:
                doc['fraud_level'] = 'none'
            
            logger.info(f"✅ Document traité: {doc_id}, confiance: {result['confidence_avg']:.2f}%")
        else:
            doc['status'] = 'failed'
            logger.error(f"❌ Erreur traitement document: {doc_id}")
        
        return {'status': doc['status'], 'confidence': doc.get('ocr_confidence', 0)}
        
    except Exception as e:
        logger.error(f"❌ Erreur processing: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/extract/{doc_id}")
async def extract_data(doc_id: str):
    """Extraire les données structurées d'un document"""
    try:
        if ocr_service is None:
            raise HTTPException(status_code=503, detail="Service OCR non disponible")
        
        if doc_id not in documents_db:
            raise HTTPException(status_code=404, detail="Document non trouvé")
        
        doc = documents_db[doc_id]
        
        # Extraire les données structurées
        structured_data = ocr_service.extract_structured_data(
            doc['file_path'],
            rules_db
        )
        
        doc['extracted_data'] = structured_data.get('extracted_fields', {})
        
        return doc['extracted_data']
        
    except Exception as e:
        logger.error(f"❌ Erreur extraction: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/documents", response_model=List[OCRDocumentResponse])
async def get_documents():
    """Récupérer tous les documents"""
    try:
        return list(documents_db.values())
    except Exception as e:
        logger.error(f"❌ Erreur get documents: {str(e)}")
        return []

@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    """Supprimer un document"""
    try:
        if doc_id in documents_db:
            # Supprimer le fichier physique
            file_path = documents_db[doc_id].get('file_path')
            if file_path and os.path.exists(file_path):
                os.remove(file_path)
            
            del documents_db[doc_id]
            return {'status': 'deleted', 'id': doc_id}
        else:
            raise HTTPException(status_code=404, detail="Document non trouvé")
            
    except Exception as e:
        logger.error(f"❌ Erreur suppression: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ========== RÈGLES D'EXTRACTION ==========
@router.get("/extraction-rules")
async def get_extraction_rules():
    """Récupérer les règles d'extraction"""
    return rules_db

@router.post("/extraction-rules")
async def add_extraction_rule(rule: OCRRule):
    """Ajouter une règle d'extraction"""
    try:
        rule_dict = rule.dict()
        rule_dict['id'] = str(uuid.uuid4())
        rules_db.append(rule_dict)
        return rule_dict
    except Exception as e:
        logger.error(f"❌ Erreur ajout règle: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/extraction-rules/{rule_id}")
async def delete_extraction_rule(rule_id: str):
    """Supprimer une règle d'extraction"""
    try:
        global rules_db
        rules_db = [r for r in rules_db if r.get('id') != rule_id]
        return {'status': 'deleted', 'id': rule_id}
    except Exception as e:
        logger.error(f"❌ Erreur suppression règle: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ========== CORRECTIONS ==========
@router.get("/corrections")
async def get_corrections():
    """Récupérer les corrections"""
    return corrections_db

@router.post("/corrections")
async def add_correction(correction: OCRCorrection):
    """Ajouter une correction"""
    try:
        correction_dict = correction.dict()
        correction_dict['id'] = str(uuid.uuid4())
        corrections_db.append(correction_dict)
        return correction_dict
    except Exception as e:
        logger.error(f"❌ Erreur ajout correction: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/corrections/{correction_id}")
async def update_correction(correction_id: str, validated: bool):
    """Mettre à jour une correction"""
    try:
        for corr in corrections_db:
            if corr.get('id') == correction_id:
                corr['validated'] = validated
                return corr
        raise HTTPException(status_code=404, detail="Correction non trouvée")
    except Exception as e:
        logger.error(f"❌ Erreur mise à jour correction: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/documents/{doc_id}")
async def get_document(doc_id: str):
    """Récupérer un document spécifique"""
    try:
        if doc_id in documents_db:
            return documents_db[doc_id]
        raise HTTPException(status_code=404, detail="Document non trouvé")
    except Exception as e:
        logger.error(f"❌ Erreur get document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))