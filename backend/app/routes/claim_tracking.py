# app/routes/claim_tracking.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import random
import os
import shutil
import json
import threading
import time
import logging

from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.auth import User
from app.models.claim_tracking import (
    ClaimTracking, ClaimTrackingStep, ClaimTrackingNotification, 
    ClaimTrackingDocument, ClaimTrackingMessage, Expert, ClaimStatus
)

# ✅ Configuration du logger
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/claims", tags=["claims"])

# Dossier pour les uploads
UPLOAD_DIR = "uploads/claims"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Thread d'avancement automatique
advancement_thread_started = False


# ==================== FONCTION D'AVANCEMENT AUTOMATIQUE ====================

def auto_advance_claims(db: Session):
    """Avance automatiquement les statuts des sinistres"""
    try:
        now = datetime.now()
        updated_count = 0
        
        # 1. PENDING → ANALYZING (après 2 jours)
        pending_claims = db.query(ClaimTracking).filter(
            ClaimTracking.status == "pending",
            ClaimTracking.created_at < now - timedelta(days=2)
        ).all()
        
        for claim in pending_claims:
            claim.status = "analyzing"
            claim.status_color = "blue"
            claim.current_step = 1
            claim.updated_at = now
            
            notification = ClaimTrackingNotification(
                claim_id=claim.id,
                title="🔍 Analyse commencée",
                message=f"Votre dossier {claim.claim_number} est maintenant en cours d'analyse.",
                type="info",
                created_at=now
            )
            db.add(notification)
            updated_count += 1
        
        # 2. ANALYZING → EXPERT_ASSIGNED (après 3 jours)
        analyzing_claims = db.query(ClaimTracking).filter(
            ClaimTracking.status == "analyzing",
            ClaimTracking.updated_at < now - timedelta(days=3)
        ).all()
        
        for claim in analyzing_claims:
            claim.status = "expert_assigned"
            claim.status_color = "purple"
            claim.current_step = 2
            claim.updated_at = now
            
            # Récupérer ou créer un expert
            expert = db.query(Expert).first()
            if not expert:
                expert = Expert(
                    name="Expert Automatique",
                    specialty="Expert sinistre",
                    phone="01 23 45 67 89",
                    email="expert@nexum.fr"
                )
                db.add(expert)
                db.flush()
            claim.expert_id = expert.id
            
            notification = ClaimTrackingNotification(
                claim_id=claim.id,
                title="👨‍⚕️ Expert assigné",
                message=f"Un expert a été assigné à votre dossier.",
                type="info",
                created_at=now
            )
            db.add(notification)
            updated_count += 1
        
        # 3. EXPERT_ASSIGNED → APPROVED ou REJECTED (après 5 jours)
        expert_claims = db.query(ClaimTracking).filter(
            ClaimTracking.status == "expert_assigned",
            ClaimTracking.updated_at < now - timedelta(days=5)
        ).all()
        
        for claim in expert_claims:
            # 80% de chance d'approbation
            if random.random() < 0.8:
                claim.status = "approved"
                claim.status_color = "green"
                claim.current_step = 3
                title = "✅ Dossier approuvé"
                message = f"Votre dossier a été approuvé ! Indemnisation de {claim.amount}€."
                notif_type = "success"
            else:
                claim.status = "rejected"
                claim.status_color = "red"
                claim.current_step = 4
                title = "❌ Dossier rejeté"
                message = "Votre dossier a été rejeté suite à l'expertise."
                notif_type = "error"
            
            claim.updated_at = now
            
            notification = ClaimTrackingNotification(
                claim_id=claim.id,
                title=title,
                message=message,
                type=notif_type,
                created_at=now
            )
            db.add(notification)
            updated_count += 1
        
        # 4. APPROVED → PAID (après 7 jours)
        approved_claims = db.query(ClaimTracking).filter(
            ClaimTracking.status == "approved",
            ClaimTracking.updated_at < now - timedelta(days=7)
        ).all()
        
        for claim in approved_claims:
            claim.status = "paid"
            claim.status_color = "green"
            claim.current_step = 4
            claim.updated_at = now
            
            notification = ClaimTrackingNotification(
                claim_id=claim.id,
                title="💰 Indemnisation effectuée",
                message=f"Le montant de {claim.amount}€ a été versé.",
                type="success",
                created_at=now
            )
            db.add(notification)
            updated_count += 1
        
        if updated_count > 0:
            db.commit()
            logger.info(f"✅ {updated_count} sinistres avancés automatiquement")
        
    except Exception as e:
        logger.error(f"❌ Erreur auto_advance: {e}")
        db.rollback()


def auto_advance_loop():
    """Boucle d'avancement automatique (thread background)"""
    logger.info("🔄 Démarrage de la boucle d'avancement automatique")
    while True:
        try:
            from app.database import SessionLocal
            db = SessionLocal()
            auto_advance_claims(db)
            db.close()
        except Exception as e:
            logger.error(f"❌ Erreur boucle avancement: {e}")
        time.sleep(3600)  # Toutes les heures


def start_auto_advance():
    """Démarre le thread d'avancement automatique"""
    global advancement_thread_started
    if not advancement_thread_started:
        try:
            thread = threading.Thread(target=auto_advance_loop, daemon=True)
            thread.start()
            advancement_thread_started = True
            logger.info("🚀 Thread avancement automatique démarré")
        except Exception as e:
            logger.error(f"❌ Erreur démarrage thread: {e}")


# ==================== ROUTES ====================

@router.get("/history")
async def get_claims_history(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """Récupère l'historique des sinistres"""
    try:
        # Démarrer l'avancement automatique
        start_auto_advance()
        
        claims = db.query(ClaimTracking).order_by(ClaimTracking.created_at.desc()).all()
        
        return [
            {
                "id": c.id,
                "claim_number": c.claim_number,
                "claim_type": c.claim_type,
                "status": c.status,
                "status_color": c.status_color,
                "amount": c.amount,
                "created_at": c.created_at,
                "description": c.description[:100] if c.description else ""
            }
            for c in claims
        ]
    except Exception as e:
        logger.error(f"❌ Erreur get_claims_history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_claims_stats(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """Statistiques des sinistres"""
    try:
        total = db.query(ClaimTracking).count()
        
        pending = db.query(ClaimTracking).filter(ClaimTracking.status == "pending").count()
        analyzing = db.query(ClaimTracking).filter(ClaimTracking.status == "analyzing").count()
        expert_assigned = db.query(ClaimTracking).filter(ClaimTracking.status == "expert_assigned").count()
        approved = db.query(ClaimTracking).filter(ClaimTracking.status == "approved").count()
        rejected = db.query(ClaimTracking).filter(ClaimTracking.status == "rejected").count()
        paid = db.query(ClaimTracking).filter(ClaimTracking.status == "paid").count()
        
        total_amount_result = db.query(ClaimTracking.amount).all()
        total_amount_sum = sum(a[0] or 0 for a in total_amount_result)
        
        return {
            "total": total,
            "pending": pending + analyzing + expert_assigned,
            "approved": approved,
            "rejected": rejected,
            "paid": paid,
            "total_amount": total_amount_sum,
            "resolution_rate": round((approved + paid) / total * 100) if total > 0 else 0
        }
    except Exception as e:
        logger.error(f"❌ Erreur get_claims_stats: {e}")
        return {
            "total": 0,
            "pending": 0,
            "approved": 0,
            "rejected": 0,
            "paid": 0,
            "total_amount": 0,
            "resolution_rate": 0
        }


@router.get("/{claim_id}/tracking")
async def get_claim_tracking(
    claim_id: int, 
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """Récupère toutes les données de suivi d'un sinistre"""
    try:
        claim = db.query(ClaimTracking).filter(ClaimTracking.id == claim_id).first()
        if not claim:
            raise HTTPException(status_code=404, detail="Sinistre non trouvé")
        
        steps = db.query(ClaimTrackingStep).filter(
            ClaimTrackingStep.claim_id == claim_id
        ).order_by(ClaimTrackingStep.date).all()
        
        notifications = db.query(ClaimTrackingNotification).filter(
            ClaimTrackingNotification.claim_id == claim_id
        ).order_by(ClaimTrackingNotification.created_at.desc()).all()
        
        expert = None
        if claim.expert_id:
            expert = db.query(Expert).filter(Expert.id == claim.expert_id).first()
        
        status_progress = {
            "pending": 0,
            "analyzing": 25,
            "expert_assigned": 50,
            "approved": 75,
            "paid": 100,
            "rejected": 100
        }
        
        progress = status_progress.get(claim.status, 0)
        
        next_steps = {
            "pending": "Analyse du dossier",
            "analyzing": "Affectation d'un expert",
            "expert_assigned": "Évaluation et décision",
            "approved": "Traitement du paiement",
            "paid": "Finalisé",
            "rejected": "Clôturé"
        }
        
        estimated_completion = {
            "date": (datetime.now() + timedelta(days=random.randint(3, 10))).strftime("%d/%m/%Y"),
            "progress": progress,
            "next_step": next_steps.get(claim.status, "Finalisation")
        }
        
        return {
            "id": claim.id,
            "claim_number": claim.claim_number,
            "claim_type": claim.claim_type,
            "status": claim.status,
            "status_color": claim.status_color,
            "current_step": claim.current_step,
            "steps": [{"title": s.title, "description": s.description, "status": s.status, "date": s.date} for s in steps],
            "estimated_completion": estimated_completion,
            "notifications": [
                {
                    "id": n.id, 
                    "title": n.title, 
                    "message": n.message, 
                    "type": n.type, 
                    "is_read": n.is_read, 
                    "created_at": n.created_at
                } for n in notifications
            ],
            "expert": {
                "id": expert.id, 
                "name": expert.name, 
                "specialty": expert.specialty, 
                "phone": expert.phone, 
                "email": expert.email
            } if expert else None
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur get_claim_tracking: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/submit")
async def submit_claim(
    claim_data: dict,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """Soumet une nouvelle déclaration de sinistre"""
    try:
        claim_type_prefix = {
            "accident": "ACC",
            "habitation": "HOME",
            "sante": "SANTE",
            "agricole": "AGRI"
        }
        prefix = claim_type_prefix.get(claim_data.get('claim_type', 'accident'), 'CLAIM')
        claim_number = f"{prefix}-{datetime.now().strftime('%Y%m%d%H%M%S')}-{random.randint(1000, 9999)}"
        
        new_claim = ClaimTracking(
            claim_number=claim_number,
            claim_type=claim_data.get('claim_type', 'accident'),
            status="pending",
            status_color="orange",
            current_step=0,
            user_name=claim_data.get('user_name', 'Client'),
            user_email=claim_data.get('user_email', 'client@email.com'),
            description=claim_data.get('description'),
            amount=claim_data.get('total_estimation', 0)
        )
        
        db.add(new_claim)
        db.commit()
        db.refresh(new_claim)
        
        # Ajouter les étapes par défaut
        default_steps = [
            {"title": "📋 Déclaration reçue", "description": f"Votre déclaration a bien été enregistrée sous le numéro {claim_number}", "status": "completed"},
            {"title": "🔍 Analyse en cours", "description": "Notre équipe analyse votre dossier", "status": "pending"},
            {"title": "👨‍⚕️ Expertise", "description": "Un expert sera affecté à votre dossier", "status": "pending"},
            {"title": "📝 Décision finale", "description": "Vous serez informé de la décision", "status": "pending"}
        ]
        
        for step in default_steps:
            claim_step = ClaimTrackingStep(
                claim_id=new_claim.id,
                title=step["title"],
                description=step["description"],
                status=step["status"],
                date=datetime.now()
            )
            db.add(claim_step)
        
        # Ajouter une notification
        notification = ClaimTrackingNotification(
            claim_id=new_claim.id,
            title="✅ Déclaration enregistrée",
            message=f"Votre déclaration {claim_number} a bien été enregistrée.",
            type="success",
            created_at=datetime.now()
        )
        db.add(notification)
        
        db.commit()
        
        logger.info(f"✅ Nouvelle déclaration: {claim_number} par {claim_data.get('user_name', 'Client')}")
        
        return {
            "success": True,
            "claim_number": claim_number,
            "id": new_claim.id,
            "message": "Déclaration enregistrée avec succès"
        }
    except Exception as e:
        logger.error(f"❌ Erreur submit_claim: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/force-advance")
async def force_advance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Force l'avancement automatique (admin)"""
    try:
        auto_advance_claims(db)
        return {"success": True, "message": "Avancement effectué"}
    except Exception as e:
        logger.error(f"❌ Erreur force_advance: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{claim_id}/chat")
async def send_chat_message(
    claim_id: int, 
    data: dict, 
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """Envoie un message dans le chat"""
    try:
        user_message = ClaimTrackingMessage(
            claim_id=claim_id,
            role="user",
            content=data.get("message"),
            time=datetime.now()
        )
        db.add(user_message)
        db.commit()
        
        replies = [
            "Merci pour votre message. Un expert va vous répondre dans les plus brefs délais.",
            "Nous avons bien reçu votre message. Notre équipe vous répondra rapidement.",
            "Votre demande a été transmise à notre service expert.",
            "Nous accusons réception de votre message et reviendrons vers vous sous 24h."
        ]
        reply = random.choice(replies)
        
        agent_message = ClaimTrackingMessage(
            claim_id=claim_id,
            role="assistant",
            content=reply,
            time=datetime.now()
        )
        db.add(agent_message)
        db.commit()
        
        return {"reply": reply}
    except Exception as e:
        logger.error(f"❌ Erreur send_chat_message: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{claim_id}/messages")
async def get_messages(
    claim_id: int, 
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """Récupère l'historique des messages"""
    try:
        messages = db.query(ClaimTrackingMessage).filter(
            ClaimTrackingMessage.claim_id == claim_id
        ).order_by(ClaimTrackingMessage.time).all()
        
        return [
            {"role": m.role, "content": m.content, "time": m.time}
            for m in messages
        ]
    except Exception as e:
        logger.error(f"❌ Erreur get_messages: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{claim_id}/documents")
async def get_documents(
    claim_id: int, 
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """Récupère les documents d'un sinistre"""
    try:
        documents = db.query(ClaimTrackingDocument).filter(
            ClaimTrackingDocument.claim_id == claim_id
        ).all()
        
        return [
            {
                "id": d.id,
                "name": d.name,
                "file_name": d.file_name,
                "type": d.type,
                "date": d.uploaded_at
            }
            for d in documents
        ]
    except Exception as e:
        logger.error(f"❌ Erreur get_documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload-document")
async def upload_document(
    claim_id: int = Form(...),
    document: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """Upload un document"""
    try:
        file_path = f"{UPLOAD_DIR}/{claim_id}_{document.filename}"
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(document.file, buffer)
        
        file_type = document.filename.split(".")[-1].upper()
        
        new_doc = ClaimTrackingDocument(
            claim_id=claim_id,
            name=document.filename,
            file_name=document.filename,
            type=file_type,
            file_path=file_path,
            uploaded_at=datetime.now()
        )
        
        db.add(new_doc)
        db.commit()
        db.refresh(new_doc)
        
        logger.info(f"📎 Document uploadé: {document.filename} pour claim {claim_id}")
        
        return {"success": True, "file_name": document.filename, "id": new_doc.id}
    except Exception as e:
        logger.error(f"❌ Erreur upload_document: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{claim_id}/documents/{doc_id}/download")
async def download_document(
    claim_id: int, 
    doc_id: int, 
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """Télécharge un document"""
    try:
        doc = db.query(ClaimTrackingDocument).filter(
            ClaimTrackingDocument.id == doc_id,
            ClaimTrackingDocument.claim_id == claim_id
        ).first()
        
        if not doc or not os.path.exists(doc.file_path):
            raise HTTPException(status_code=404, detail="Document non trouvé")
        
        return FileResponse(doc.file_path, filename=doc.file_name)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur download_document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{claim_id}/feedback")
async def submit_feedback(
    claim_id: int, 
    data: dict, 
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """Soumet un feedback"""
    try:
        logger.info(f"📝 Feedback reçu pour claim {claim_id}: note={data.get('rating')}, commentaire={data.get('comment')[:50]}...")
        return {"success": True, "message": "Merci pour votre retour"}
    except Exception as e:
        logger.error(f"❌ Erreur submit_feedback: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{claim_id}/rate-expert")
async def rate_expert(
    claim_id: int, 
    data: dict, 
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """Évalue l'expert"""
    try:
        logger.info(f"⭐ Expert évalué pour claim {claim_id}: note={data.get('rating')}, expert_id={data.get('expert_id')}")
        return {"success": True, "message": "Merci d'avoir évalué l'expert"}
    except Exception as e:
        logger.error(f"❌ Erreur rate_expert: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== INITIALISATION ====================

# Démarrer automatiquement l'avancement au chargement du module
try:
    start_auto_advance()
except Exception as e:
    logger.error(f"❌ Erreur init auto_advance: {e}")

logger.info("✅ ROUTER CLAIM_TRACKING CHARGÉ AVEC SUCCÈS")