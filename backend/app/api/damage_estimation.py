# app/api/damage_estimation.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from typing import List, Optional, Dict, Any
from datetime import datetime
import os
import uuid
import random
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models.damage_estimation import (
    DamageAnalysis, DamageEstimation, RepairOption, DamageReference
)
from app.models.insurance_claims import ClaimInsurance, ClaimInsuranceStatus  # ← MODIFIÉ ICI
from app.core.dependencies import get_current_active_user
from app.models.auth import User
from app.core.config import settings

router = APIRouter(prefix="/claims", tags=["damage-estimation"])

# Configuration du stockage des images
UPLOAD_DIR = settings.DAMAGE_PHOTOS_PATH
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/estimate-damage")
async def estimate_damage(
    photo: UploadFile = File(...),
    claim_id: Optional[int] = Form(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Analyser une photo et estimer les dommages"""
    
    # Sauvegarder l'image
    file_extension = photo.filename.split(".")[-1]
    file_name = f"{uuid.uuid4()}.{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, file_name)
    
    with open(file_path, "wb") as f:
        f.write(await photo.read())
    
    # Analyser l'image avec IA (simulation)
    analysis_result = analyze_image_with_ai(file_path)
    
    # Sauvegarder l'analyse
    damage_analysis = DamageAnalysis(
        claim_id=claim_id,
        image_url=f"/uploads/damage_photos/{file_name}",
        damage_type=analysis_result["damage_type"],
        damage_severity=analysis_result["damage_severity"],
        damage_location=analysis_result["damage_location"],
        detected_parts=analysis_result["detected_parts"],
        confidence_score=analysis_result["confidence"],
        analyzed_at=datetime.now(),
        created_at=datetime.now()
    )
    db.add(damage_analysis)
    db.commit()
    db.refresh(damage_analysis)
    
    # Générer l'estimation
    estimation = generate_estimation(damage_analysis, db)
    
    # Sauvegarder l'estimation
    damage_estimation = DamageEstimation(
        claim_id=claim_id,
        analysis_id=damage_analysis.id,
        total_amount=estimation["total"],
        confidence=estimation["confidence"],
        details=estimation["details"],
        parts_affected=analysis_result["detected_parts"],
        created_at=datetime.now()
    )
    db.add(damage_estimation)
    db.commit()
    db.refresh(damage_estimation)
    
    # Générer les options de réparation
    repair_options = generate_repair_options(damage_estimation, db)
    
    for opt in repair_options:
        repair_option = RepairOption(
            estimation_id=damage_estimation.id,
            name=opt["name"],
            description=opt["description"],
            cost=opt["cost"],
            delay_days=opt["delay"],
            warranty_months=opt["warranty"],
            recommended=opt["recommended"],
            parts_to_replace=opt.get("parts_to_replace", []),
            labor_hours=opt.get("labor_hours", 0),
            materials_cost=opt.get("materials_cost", 0)
        )
        db.add(repair_option)
    
    db.commit()
    
    # Mettre à jour le sinistre si nécessaire
    if claim_id:
        claim = db.query(ClaimInsurance).filter(ClaimInsurance.id == claim_id).first()
        if claim:
            claim.estimated_amount = estimation["total"]
            claim.status = ClaimInsuranceStatus.ESTIMATION_DONE
            db.commit()
    
    return {
        "analysis": {
            "damage_type": analysis_result["damage_type"],
            "damage_severity": analysis_result["damage_severity"],
            "damage_location": analysis_result["damage_location"],
            "detected_parts": analysis_result["detected_parts"],
            "confidence": analysis_result["confidence"]
        },
        "estimation": {
            "total": estimation["total"],
            "confidence": estimation["confidence"],
            "details": estimation["details"]
        },
        "repair_options": repair_options
    }


@router.get("/estimations/{estimation_id}")
async def get_estimation(
    estimation_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Récupérer une estimation existante"""
    
    estimation = db.query(DamageEstimation).filter(
        DamageEstimation.id == estimation_id
    ).first()
    
    if not estimation:
        raise HTTPException(status_code=404, detail="Estimation non trouvée")
    
    repair_options = db.query(RepairOption).filter(
        RepairOption.estimation_id == estimation_id
    ).all()
    
    analysis = db.query(DamageAnalysis).filter(
        DamageAnalysis.id == estimation.analysis_id
    ).first()
    
    return {
        "id": estimation.id,
        "total_amount": estimation.total_amount,
        "confidence": estimation.confidence,
        "details": estimation.details,
        "parts_affected": estimation.parts_affected,
        "is_validated": estimation.is_validated,
        "created_at": estimation.created_at.isoformat(),
        "analysis": {
            "damage_type": analysis.damage_type if analysis else None,
            "damage_severity": analysis.damage_severity if analysis else None,
            "damage_location": analysis.damage_location if analysis else None,
            "image_url": analysis.image_url if analysis else None
        },
        "repair_options": [
            {
                "id": opt.id,
                "name": opt.name,
                "description": opt.description,
                "cost": opt.cost,
                "delay": opt.delay_days,
                "warranty": opt.warranty_months,
                "recommended": opt.recommended
            }
            for opt in repair_options
        ]
    }


@router.post("/estimations/{estimation_id}/validate")
async def validate_estimation(
    estimation_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Valider une estimation"""
    
    estimation = db.query(DamageEstimation).filter(
        DamageEstimation.id == estimation_id
    ).first()
    
    if not estimation:
        raise HTTPException(status_code=404, detail="Estimation non trouvée")
    
    estimation.is_validated = True
    estimation.validated_by = current_user.id
    estimation.validated_at = datetime.now()
    estimation.updated_at = datetime.now()
    
    db.commit()
    
    return {
        "success": True,
        "message": "Estimation validée avec succès"
    }


@router.get("/damage-references")
async def get_damage_references(
    category: str = Query("auto"),
    db: Session = Depends(get_db)
):
    """Récupérer les références de prix pour les réparations"""
    
    references = db.query(DamageReference).filter(
        DamageReference.category == category
    ).all()
    
    return [
        {
            "id": r.id,
            "part_name": r.part_name,
            "damage_type": r.damage_type,
            "repair_cost_min": r.repair_cost_min,
            "repair_cost_max": r.repair_cost_max,
            "replacement_cost": r.replacement_cost,
            "labor_hours": r.labor_hours
        }
        for r in references
    ]


def analyze_image_with_ai(image_path: str) -> Dict[str, Any]:
    """Simuler l'analyse d'image par IA"""
    
    damage_types = ["rayure", "bosse", "fissure", "cassure", "éclat", "déformation"]
    parts = ["pare-chocs avant", "pare-chocs arrière", "porte avant gauche", "porte avant droite",
             "porte arrière gauche", "porte arrière droite", "capot", "coffre", "aile avant gauche",
             "aile avant droite", "aile arrière gauche", "aile arrière droite", "rétroviseur gauche",
             "rétroviseur droit", "phare avant gauche", "phare avant droit", "feu arrière gauche",
             "feu arrière droit", "jante avant gauche", "jante avant droite", "jante arrière gauche",
             "jante arrière droite"]
    
    detected_parts = random.sample(parts, random.randint(1, 3))
    
    return {
        "damage_type": random.choice(damage_types),
        "damage_severity": random.randint(3, 9),
        "damage_location": random.choice(["avant", "arrière", "côté gauche", "côté droit", "multiples"]),
        "detected_parts": detected_parts,
        "confidence": random.randint(75, 95)
    }


def generate_estimation(analysis: DamageAnalysis, db: Session) -> Dict[str, Any]:
    """Générer une estimation basée sur l'analyse"""
    
    details = []
    total = 0
    
    price_references = {
        "rayure": {"min": 80, "max": 250},
        "bosse": {"min": 150, "max": 500},
        "fissure": {"min": 200, "max": 800},
        "cassure": {"min": 300, "max": 1500},
        "éclat": {"min": 100, "max": 400},
        "déformation": {"min": 250, "max": 1200}
    }
    
    price_ref = price_references.get(analysis.damage_type, {"min": 100, "max": 500})
    
    for part in analysis.detected_parts:
        severity_factor = analysis.damage_severity / 10
        base_cost = random.uniform(price_ref["min"], price_ref["max"])
        cost = base_cost * (0.5 + severity_factor)
        
        detail = {
            "part": part,
            "damage": analysis.damage_type,
            "repair": f"Réparation de {analysis.damage_type}",
            "cost": round(cost, 2),
            "urgency": "haute" if analysis.damage_severity > 7 else "moyenne" if analysis.damage_severity > 4 else "faible"
        }
        details.append(detail)
        total += cost
    
    confidence_factor = analysis.confidence_score / 100
    total = total * (0.8 + confidence_factor * 0.4)
    
    return {
        "total": round(total, 2),
        "confidence": analysis.confidence_score,
        "details": details
    }


def generate_repair_options(estimation: DamageEstimation, db: Session) -> List[Dict[str, Any]]:
    """Générer des options de réparation"""
    
    base_cost = estimation.total_amount
    options = []
    
    # Option 1: Réparation standard
    options.append({
        "name": "Réparation standard",
        "description": "Réparation des dommages par un garage partenaire",
        "cost": round(base_cost * 0.9, 2),
        "delay": random.randint(3, 7),
        "warranty": 12,
        "recommended": True,
        "parts_to_replace": estimation.parts_affected,
        "labor_hours": len(estimation.parts_affected) * random.uniform(1, 3),
        "materials_cost": round(base_cost * 0.3, 2)
    })
    
    # Option 2: Réparation express
    options.append({
        "name": "Réparation express",
        "description": "Réparation accélérée avec un délai réduit",
        "cost": round(base_cost * 1.2, 2),
        "delay": random.randint(1, 3),
        "warranty": 6,
        "recommended": False,
        "parts_to_replace": estimation.parts_affected,
        "labor_hours": len(estimation.parts_affected) * random.uniform(1.5, 4),
        "materials_cost": round(base_cost * 0.35, 2)
    })
    
    # Option 3: Remplacement
    if any(p in ["pare-chocs", "capot", "coffre"] for p in estimation.parts_affected):
        options.append({
            "name": "Remplacement des pièces",
            "description": "Remplacement des pièces endommagées par des neuves",
            "cost": round(base_cost * 1.8, 2),
            "delay": random.randint(5, 14),
            "warranty": 24,
            "recommended": False,
            "parts_to_replace": estimation.parts_affected,
            "labor_hours": len(estimation.parts_affected) * random.uniform(2, 5),
            "materials_cost": round(base_cost * 0.6, 2)
        })
    
    return options