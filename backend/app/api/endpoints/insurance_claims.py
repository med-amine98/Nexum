# app/api/insurance_claims.py
from fastapi import APIRouter, Depends, HTTPException, Query, Path
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func
from app.database import get_db
from app.models.insurance_claims import (
    ClaimInsurance,  # ← CHANGÉ de InsuranceClaim à ClaimInsurance
    ClaimInsuranceTimeline,  # ← CHANGÉ
    ClaimInsuranceRequiredDocument,  # ← CHANGÉ
    ClaimInsuranceEstimation,  # ← CHANGÉ
    ClaimInsuranceNotification,  # ← CHANGÉ
    ClaimInsuranceStatus,  # ← CHANGÉ
    ClaimInsuranceStep  # ← CHANGÉ
)
from app.models.banking import Client
from app.core.dependencies import get_current_active_user
from app.models.auth import User
import random

router = APIRouter(prefix="/claims", tags=["insurance-claims"])


@router.get("/{claim_id}/tracking")
async def get_claim_tracking(
    claim_id: int = Path(..., description="ID du sinistre"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Récupérer le suivi d'un sinistre"""
    
    # Récupérer le sinistre
    claim = db.query(ClaimInsurance).filter(ClaimInsurance.id == claim_id).first()
    
    if not claim:
        raise HTTPException(status_code=404, detail="Sinistre non trouvé")
    
    # Vérifier l'accès (client ou admin)
    if current_user.role != "admin" and claim.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    # Récupérer la timeline
    timeline = db.query(ClaimInsuranceTimeline).filter(
        ClaimInsuranceTimeline.claim_id == claim_id
    ).order_by(ClaimInsuranceTimeline.date).all()
    
    # Récupérer les documents requis
    required_docs = db.query(ClaimInsuranceRequiredDocument).filter(
        ClaimInsuranceRequiredDocument.claim_id == claim_id
    ).all()
    
    # Calculer l'estimation de délai
    estimated_completion = calculate_estimated_completion(claim)
    
    return {
        "claim": {
            "id": claim.id,
            "claim_number": claim.claim_number,
            "status": claim.status.value if hasattr(claim.status, 'value') else str(claim.status),
            "status_color": claim.status_color,
            "current_step": claim.current_step,
            "estimated_amount": claim.estimated_amount,
            "approved_amount": claim.approved_amount,
            "paid_amount": claim.paid_amount,
            "declared_at": claim.declared_at.isoformat() if claim.declared_at else None,
            "expert": {
                "name": claim.expert_name,
                "phone": claim.expert_phone,
                "email": claim.expert_email
            } if claim.expert_name else None,
            "required_documents": [
                {
                    "name": doc.name,
                    "uploaded": doc.uploaded,
                    "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None
                }
                for doc in required_docs
            ]
        },
        "timeline": [
            {
                "title": t.title,
                "description": t.description,
                "date": t.date.strftime("%d/%m/%Y %H:%M") if t.date else None,
                "status": t.status,
                "documents": t.documents
            }
            for t in timeline
        ],
        "estimated_completion": estimated_completion
    }


@router.get("/")
async def get_all_claims(
    client_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Récupérer tous les sinistres"""
    
    query = db.query(ClaimInsurance)
    
    if client_id:
        query = query.filter(ClaimInsurance.client_id == client_id)
    
    if status:
        query = query.filter(ClaimInsurance.status == status)
    
    # Si l'utilisateur n'est pas admin, filtrer par ses propres sinistres
    if current_user.role != "admin":
        query = query.filter(ClaimInsurance.client_id == current_user.id)
    
    claims = query.order_by(desc(ClaimInsurance.created_at)).limit(limit).all()
    
    return [
        {
            "id": c.id,
            "claim_number": c.claim_number,
            "client_name": c.client_name,
            "claim_type": c.claim_type,
            "status": c.status.value if hasattr(c.status, 'value') else str(c.status),
            "estimated_amount": c.estimated_amount,
            "declared_at": c.declared_at.isoformat() if c.declared_at else None
        }
        for c in claims
    ]


@router.post("/")
async def create_claim(
    claim_data: Dict[str, Any],
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Créer un nouveau sinistre"""
    
    # Générer un numéro de sinistre unique
    last_claim = db.query(ClaimInsurance).order_by(desc(ClaimInsurance.id)).first()
    new_id = (last_claim.id + 1) if last_claim else 1
    claim_number = f"CLM-{datetime.now().strftime('%Y%m%d')}-{str(new_id).zfill(4)}"
    
    # Créer le sinistre
    new_claim = ClaimInsurance(
        claim_number=claim_number,
        client_id=current_user.id,
        client_name=claim_data.get("client_name", getattr(current_user, 'full_name', 'Client')),
        client_email=getattr(current_user, 'email', None),
        client_phone=claim_data.get("client_phone"),
        claim_type=claim_data.get("claim_type"),
        incident_date=datetime.fromisoformat(claim_data.get("incident_date")) if claim_data.get("incident_date") else datetime.now(),
        incident_location=claim_data.get("incident_location"),
        description=claim_data.get("description"),
        status=ClaimInsuranceStatus.DECLARED,
        current_step=0,
        status_color="processing",
        estimated_amount=claim_data.get("estimated_amount", 0),
        photos=claim_data.get("photos", []),
        declared_at=datetime.now(),
        created_at=datetime.now()
    )
    
    db.add(new_claim)
    db.commit()
    db.refresh(new_claim)
    
    # Créer la timeline initiale
    initial_timeline = ClaimInsuranceTimeline(
        claim_id=new_claim.id,
        title="Déclaration du sinistre",
        description="Votre sinistre a été déclaré avec succès",
        date=datetime.now(),
        status="completed"
    )
    db.add(initial_timeline)
    
    # Créer les documents requis par défaut
    default_docs = [
        {"name": "Pièce d'identité", "description": "Carte d'identité ou passeport"},
        {"name": "Justificatif de domicile", "description": "Facture récente"},
        {"name": "Rapport de police", "description": "Si applicable"},
        {"name": "Photos des dégâts", "description": "Photos avant/après"}
    ]
    
    for doc in default_docs:
        required_doc = ClaimInsuranceRequiredDocument(
            claim_id=new_claim.id,
            name=doc["name"],
            description=doc["description"],
            uploaded=False
        )
        db.add(required_doc)
    
    db.commit()
    
    return {
        "success": True,
        "claim_id": new_claim.id,
        "claim_number": new_claim.claim_number,
        "message": "Sinistre déclaré avec succès"
    }


@router.put("/{claim_id}/status")
async def update_claim_status(
    claim_id: int,
    status_data: Dict[str, Any],
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Mettre à jour le statut d'un sinistre"""
    
    claim = db.query(ClaimInsurance).filter(ClaimInsurance.id == claim_id).first()
    
    if not claim:
        raise HTTPException(status_code=404, detail="Sinistre non trouvé")
    
    new_status = status_data.get("status")
    step = status_data.get("step")
    comment = status_data.get("comment", "")
    
    if new_status:
        claim.status = new_status
        claim.status_color = status_data.get("color", "processing")
        
        # Ajouter à la timeline
        timeline_entry = ClaimInsuranceTimeline(
            claim_id=claim_id,
            title=f"Statut mis à jour: {new_status}",
            description=comment,
            date=datetime.now(),
            status="completed"
        )
        db.add(timeline_entry)
    
    if step is not None:
        claim.current_step = step
    
    claim.updated_at = datetime.now()
    db.commit()
    
    return {
        "success": True,
        "message": "Statut mis à jour avec succès"
    }


@router.post("/{claim_id}/documents/{document_id}/upload")
async def upload_document(
    claim_id: int,
    document_id: int,
    file_url: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Marquer un document comme uploadé"""
    
    document = db.query(ClaimInsuranceRequiredDocument).filter(
        ClaimInsuranceRequiredDocument.id == document_id,
        ClaimInsuranceRequiredDocument.claim_id == claim_id
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    
    document.uploaded = True
    document.uploaded_at = datetime.now()
    document.file_url = file_url
    
    db.commit()
    
    return {
        "success": True,
        "message": "Document uploadé avec succès"
    }


@router.post("/{claim_id}/estimate")
async def add_estimate(
    claim_id: int,
    estimate_data: Dict[str, Any],
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Ajouter une estimation pour un sinistre"""
    
    claim = db.query(ClaimInsurance).filter(ClaimInsurance.id == claim_id).first()
    
    if not claim:
        raise HTTPException(status_code=404, detail="Sinistre non trouvé")
    
    # Sauvegarder l'estimation
    estimation = ClaimInsuranceEstimation(
        claim_id=claim_id,
        estimated_amount=estimate_data.get("estimated_amount"),
        confidence=estimate_data.get("confidence", 85),
        details=estimate_data.get("details", []),
        created_at=datetime.now()
    )
    db.add(estimation)
    
    # Mettre à jour le sinistre
    claim.estimated_amount = estimate_data.get("estimated_amount")
    claim.status = ClaimInsuranceStatus.ESTIMATION_DONE
    claim.updated_at = datetime.now()
    
    # Ajouter à la timeline
    timeline_entry = ClaimInsuranceTimeline(
        claim_id=claim_id,
        title="Estimation terminée",
        description=f"Montant estimé: {estimate_data.get('estimated_amount')} €",
        date=datetime.now(),
        status="completed"
    )
    db.add(timeline_entry)
    
    db.commit()
    
    return {
        "success": True,
        "message": "Estimation ajoutée avec succès"
    }


@router.post("/{claim_id}/assign-expert")
async def assign_expert(
    claim_id: int,
    expert_data: Dict[str, Any],
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Assigner un expert à un sinistre"""
    
    claim = db.query(ClaimInsurance).filter(ClaimInsurance.id == claim_id).first()
    
    if not claim:
        raise HTTPException(status_code=404, detail="Sinistre non trouvé")
    
    claim.expert_id = expert_data.get("expert_id")
    claim.expert_name = expert_data.get("expert_name")
    claim.expert_phone = expert_data.get("expert_phone")
    claim.expert_email = expert_data.get("expert_email")
    claim.expert_assigned_at = datetime.now()
    claim.status = ClaimInsuranceStatus.EXPERT_ASSIGNED
    claim.status_color = "warning"
    claim.current_step = 2
    
    # Ajouter à la timeline
    timeline_entry = ClaimInsuranceTimeline(
        claim_id=claim_id,
        title="Expert assigné",
        description=f"L'expert {expert_data.get('expert_name')} a été assigné à votre dossier",
        date=datetime.now(),
        status="completed"
    )
    db.add(timeline_entry)
    
    db.commit()
    
    return {
        "success": True,
        "message": "Expert assigné avec succès"
    }


def calculate_estimated_completion(claim: ClaimInsurance) -> Dict[str, Any]:
    """Calculer la date estimée de finalisation"""
    
    # Durée moyenne par étape en jours
    step_durations = {
        0: 1,   # Déclaration
        1: 5,   # Analyse
        2: 10,  # Expertise
        3: 7    # Indemnisation
    }
    
    current_step = claim.current_step
    remaining_days = 0
    
    for step in range(current_step, 4):
        remaining_days += step_durations.get(step, 5)
    
    estimated_date = datetime.now() + timedelta(days=remaining_days)
    
    # Calculer le pourcentage de progression
    total_days = sum(step_durations.values())
    days_passed = sum(step_durations.get(s, 0) for s in range(current_step))
    progress = (days_passed / total_days) * 100
    
    # Déterminer la prochaine étape
    next_steps = {
        0: "Analyse du dossier",
        1: "Envoi à un expert",
        2: "Rédaction du rapport d'expertise",
        3: "Validation et paiement"
    }
    
    return {
        "date": estimated_date.strftime("%d/%m/%Y"),
        "progress": round(progress, 1),
        "next_step": next_steps.get(current_step, "Finalisation")
    }


@router.get("/stats")
async def get_claims_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Récupérer les statistiques des sinistres"""
    
    total_claims = db.query(ClaimInsurance).count()
    
    if current_user.role != "admin":
        total_claims = db.query(ClaimInsurance).filter(
            ClaimInsurance.client_id == current_user.id
        ).count()
    
    # Statistiques par statut
    status_stats = {}
    for status in ClaimInsuranceStatus:
        count = db.query(ClaimInsurance).filter(ClaimInsurance.status == status).count()
        if current_user.role != "admin":
            count = db.query(ClaimInsurance).filter(
                ClaimInsurance.status == status,
                ClaimInsurance.client_id == current_user.id
            ).count()
        status_stats[status.value] = count
    
    return {
        "total": total_claims,
        "by_status": status_stats
    }