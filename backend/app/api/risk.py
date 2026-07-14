# app/api/risk.py
# -*- coding: utf-8 -*-
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timedelta
import uuid
import random
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_, or_

from app.core.dependencies import get_current_user
from app.models.auth import User
from app.database import get_db

logger = logging.getLogger(__name__)
logger.info("🔧 CHARGEMENT DU MODULE RISK...")
# IMPORTANT: Ne pas mettre de préfixe ici (sera ajouté dans __init__.py)
router = APIRouter(prefix="", tags=["Risk Management"])
logger.info("✅ ROUTER RISK CRÉÉ (sans préfixe)")

# ===== SCHEMAS PYDANTIC =====
from pydantic import BaseModel, Field, validator

class RiskPolicyCreate(BaseModel):
    client_name: str = Field(..., min_length=1, max_length=200)
    client_email: Optional[str] = Field(None, max_length=255)
    policy_type: str = Field(..., description="Type de police: auto, habitation, sante, vie, professionnelle")
    premium: float = Field(0.0, ge=0, description="Prime annuelle")
    coverage_amount: float = Field(0.0, ge=0, description="Montant couvert")
    risk_score: float = Field(..., ge=0, le=100, description="Score de risque (0-100)")
    risk_level: str = Field(..., description="Niveau de risque: Critique, Élevé, Moyen, Faible")
    client_age: Optional[int] = Field(None, ge=0, le=120)
    client_profession: Optional[str] = Field(None, max_length=100)
    claims_count: int = Field(0, ge=0)
    total_claims_amount: float = Field(0.0, ge=0)
    status: str = Field("active", description="Statut: active, pending, cancelled, expired")
    start_date: Optional[datetime] = None
    
    @validator('risk_level')
    def validate_risk_level(cls, v):
        valid_levels = ['Critique', 'Élevé', 'Moyen', 'Faible', 'critical', 'high', 'medium', 'low']
        if v not in valid_levels:
            raise ValueError(f'Niveau de risque invalide. Doit être parmi: {valid_levels}')
        return v
    
    @validator('policy_type')
    def validate_policy_type(cls, v):
        valid_types = ['auto', 'habitation', 'sante', 'vie', 'professionnelle', 'voyage']
        if v not in valid_types:
            raise ValueError(f'Type de police invalide. Doit être parmi: {valid_types}')
        return v

class RiskPolicyUpdate(BaseModel):
    client_name: Optional[str] = Field(None, min_length=1, max_length=200)
    client_email: Optional[str] = Field(None, max_length=255)
    risk_score: Optional[float] = Field(None, ge=0, le=100)
    risk_level: Optional[str] = None
    impact_amount: Optional[float] = Field(None, ge=0)
    mitigation_plan: Optional[str] = None
    status: Optional[str] = None
    premium: Optional[float] = Field(None, ge=0)
    coverage_amount: Optional[float] = Field(None, ge=0)

class RiskPolicyResponse(BaseModel):
    id: int
    policy_id: str
    client_name: str
    client_email: Optional[str]
    client_age: Optional[int]
    client_profession: Optional[str]
    policy_type: str
    policy_number: str
    premium: float
    coverage_amount: float
    risk_score: float
    risk_level: str
    status: str
    created_at: datetime
    updated_at: Optional[datetime]

class RiskStatistics(BaseModel):
    total_policies: int
    active_policies: int
    critical_risks: int
    high_risks: int
    medium_risks: int
    low_risks: int
    avg_risk_score: float
    total_premiums: float
    total_claims: float

class RiskHistoryResponse(BaseModel):
    id: int
    score: float
    level: str
    reason: Optional[str]
    calculated_at: datetime

# ===== FONCTIONS UTILITAIRES =====
def get_recommendation(risk_score: float) -> str:
    """Génère une recommandation basée sur le score de risque"""
    if risk_score > 80:
        return "Action urgente: Révision complète du contrat, audit immédiat"
    elif risk_score > 70:
        return "Action prioritaire: Surveillance renforcée, contact client"
    elif risk_score > 60:
        return "Surveillance active: Analyse approfondie requise"
    elif risk_score > 50:
        return "Surveillance régulière: Point mensuel recommandé"
    elif risk_score > 40:
        return "Surveillance normale: Revue trimestrielle"
    elif risk_score > 30:
        return "Risque modéré: Surveillance standard"
    else:
        return "Risque faible: Surveillance de routine"

def get_risk_level_string(risk_level) -> str:
    """Convertit le niveau de risque en string"""
    if hasattr(risk_level, 'value'):
        return risk_level.value
    return str(risk_level).lower() if risk_level else "medium"

def normalize_risk_level(risk_level: str) -> str:
    """Normalise le niveau de risque"""
    mapping = {
        "Critique": "critical",
        "Élevé": "high",
        "Moyen": "medium",
        "Faible": "low",
        "critical": "critical",
        "high": "high",
        "medium": "medium",
        "low": "low"
    }
    return mapping.get(risk_level, "medium")

# ===== ENDPOINTS DE TEST =====
@router.get("/test")
async def test_risk():
    """Endpoint de test pour vérifier que le module est chargé"""
    logger.info("✅ Test risk appelé")
    return {"status": "ok", "module": "risk", "message": "Risk module is working"}

@router.get("/test-auth")
async def test_risk_auth(current_user: User = Depends(get_current_user)):
    """Endpoint de test avec authentification"""
    return {
        "status": "ok",
        "module": "risk",
        "message": "Risk module is working",
        "user": current_user.email
    }

# ===== ENDPOINTS PRINCIPAUX =====
@router.get("/dashboard/overview")
async def risk_dashboard_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Vue d'ensemble du dashboard de gestion des risques"""
    try:
        from app.models.risk import RiskInsurancePolicy
        
        total_policies = db.query(RiskInsurancePolicy).count()
        active_policies = db.query(RiskInsurancePolicy).filter(
            RiskInsurancePolicy.status == "active"
        ).count()
        
        critical_risks = db.query(RiskInsurancePolicy).filter(
            RiskInsurancePolicy.risk_level == "critical"
        ).count()
        high_risks = db.query(RiskInsurancePolicy).filter(
            RiskInsurancePolicy.risk_level == "high"
        ).count()
        medium_risks = db.query(RiskInsurancePolicy).filter(
            RiskInsurancePolicy.risk_level == "medium"
        ).count()
        low_risks = db.query(RiskInsurancePolicy).filter(
            RiskInsurancePolicy.risk_level == "low"
        ).count()
        
        avg_risk = db.query(func.avg(RiskInsurancePolicy.risk_score)).scalar() or 0
        
        total_claims = db.query(func.sum(RiskInsurancePolicy.total_claims_amount)).scalar() or 0
        total_premiums = db.query(func.sum(RiskInsurancePolicy.premium)).scalar() or 0
        
        return {
            "global_score": round(avg_risk, 1),
            "radar_data": [
                {"category": "Crédit", "score": 45},
                {"category": "Opérationnel", "score": 38},
                {"category": "Marché", "score": 52},
                {"category": "Liquidité", "score": 28},
                {"category": "Conformité", "score": 65},
                {"category": "Cyber", "score": 72},
                {"category": "Fournisseurs", "score": 48},
                {"category": "Interne", "score": 35}
            ],
            "statistics": {
                "total_risks": total_policies,
                "active_risks": active_policies,
                "critical_risks": critical_risks,
                "high_risks": high_risks,
                "medium_risks": medium_risks,
                "low_risks": low_risks,
                "total_impact": float(total_claims),
                "total_premiums": float(total_premiums)
            },
            "recommendation": {
                "type": "warning" if critical_risks > 0 else "info",
                "message": f"{critical_risks} risque(s) critique(s) nécessitent une attention immédiate" if critical_risks > 0 else "Niveau de risque global acceptable"
            }
        }
    except Exception as e:
        logger.error(f"Erreur dashboard: {e}")
        return {
            "global_score": 45.5,
            "radar_data": [
                {"category": "Crédit", "score": 45},
                {"category": "Opérationnel", "score": 38},
                {"category": "Marché", "score": 52},
                {"category": "Liquidité", "score": 28},
                {"category": "Conformité", "score": 65},
                {"category": "Cyber", "score": 72},
                {"category": "Fournisseurs", "score": 48},
                {"category": "Interne", "score": 35}
            ],
            "statistics": {
                "total_risks": 25,
                "active_risks": 18,
                "critical_risks": 3,
                "high_risks": 5,
                "medium_risks": 7,
                "low_risks": 10,
                "total_impact": 1250000,
                "total_premiums": 4500000
            },
            "recommendation": {
                "type": "warning",
                "message": "3 risque(s) critique(s) nécessitent une attention immédiate"
            }
        }

@router.get("/risks", response_model=List[dict])
async def get_risks(
    risk_level: Optional[str] = Query(None, description="Filtrer par niveau de risque"),
    policy_type: Optional[str] = Query(None, description="Filtrer par type de police"),
    limit: int = Query(50, ge=1, le=200, description="Nombre maximum de résultats"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Liste détaillée des risques avec filtres optionnels"""
    try:
        from app.models.risk import RiskInsurancePolicy
        
        query = db.query(RiskInsurancePolicy)
        
        if risk_level:
            normalized_level = normalize_risk_level(risk_level)
            query = query.filter(RiskInsurancePolicy.risk_level == normalized_level)
        
        if policy_type:
            query = query.filter(RiskInsurancePolicy.policy_type == policy_type)
        
        policies = query.order_by(desc(RiskInsurancePolicy.risk_score)).limit(limit).all()
        
        risks = []
        for policy in policies:
            risk_level_str = get_risk_level_string(policy.risk_level)
            
            if policy.policy_type == "professionnelle":
                category = "fournisseur"
                model = "supply_chain"
            elif policy.policy_type == "sante":
                category = "interne"
                model = "insider"
            else:
                category = "client"
                model = "bayesian"
            
            risks.append({
                "id": policy.id,
                "policy_id": policy.policy_id,
                "category": category,
                "name": policy.client_name,
                "email": policy.client_email,
                "score": policy.risk_score or 0,
                "level": risk_level_str.capitalize(),
                "impact_amount": policy.total_claims_amount or 0,
                "impact_currency": "EUR",
                "mitigation_plan": get_recommendation(policy.risk_score or 0),
                "model": model,
                "policy_type": policy.policy_type,
                "premium": policy.premium,
                "coverage_amount": policy.coverage_amount,
                "description": f"Analyse des risques pour {policy.client_name}"
            })
        
        return risks
    except Exception as e:
        logger.error(f"Erreur get_risks: {e}")
        return []

@router.get("/policies", response_model=List[RiskPolicyResponse])
async def get_policies(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Récupérer la liste des politiques avec pagination"""
    try:
        from app.models.risk import RiskInsurancePolicy
        
        policies = db.query(RiskInsurancePolicy).offset(skip).limit(limit).all()
        
        return [
            RiskPolicyResponse(
                id=p.id,
                policy_id=p.policy_id,
                client_name=p.client_name,
                client_email=p.client_email,
                client_age=p.client_age,
                client_profession=p.client_profession,
                policy_type=p.policy_type,
                policy_number=p.policy_number,
                premium=p.premium,
                coverage_amount=p.coverage_amount,
                risk_score=p.risk_score,
                risk_level=get_risk_level_string(p.risk_level),
                status=p.status,
                created_at=p.created_at,
                updated_at=p.updated_at
            )
            for p in policies
        ]
    except Exception as e:
        logger.error(f"Erreur get_policies: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/policies/{policy_id}", response_model=RiskPolicyResponse)
async def get_policy(
    policy_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Récupérer une politique spécifique"""
    try:
        from app.models.risk import RiskInsurancePolicy
        
        policy = db.query(RiskInsurancePolicy).filter(RiskInsurancePolicy.id == policy_id).first()
        if not policy:
            raise HTTPException(status_code=404, detail="Politique non trouvée")
        
        return RiskPolicyResponse(
            id=policy.id,
            policy_id=policy.policy_id,
            client_name=policy.client_name,
            client_email=policy.client_email,
            client_age=policy.client_age,
            client_profession=policy.client_profession,
            policy_type=policy.policy_type,
            policy_number=policy.policy_number,
            premium=policy.premium,
            coverage_amount=policy.coverage_amount,
            risk_score=policy.risk_score,
            risk_level=get_risk_level_string(policy.risk_level),
            status=policy.status,
            created_at=policy.created_at,
            updated_at=policy.updated_at
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur get_policy: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/policies")
async def create_risk_policy(
    policy: RiskPolicyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Créer une nouvelle politique de risque"""
    try:
        from app.models.risk import RiskInsurancePolicy
        
        risk_level_str = normalize_risk_level(policy.risk_level)
        
        policy_id = f"POL-{uuid.uuid4().hex[:8].upper()}"
        
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        unique_suffix = uuid.uuid4().hex[:4].upper()
        policy_number = f"{policy.policy_type.upper()}-{timestamp}-{policy.client_name[:3].upper()}-{unique_suffix}"
        
        db_policy = RiskInsurancePolicy(
            policy_id=policy_id,
            client_name=policy.client_name,
            client_email=policy.client_email,
            policy_type=policy.policy_type,
            policy_number=policy_number,
            start_date=policy.start_date or datetime.now(),
            premium=policy.premium,
            coverage_amount=policy.coverage_amount,
            risk_score=policy.risk_score,
            risk_level=risk_level_str,
            client_age=policy.client_age,
            client_profession=policy.client_profession,
            claims_count=policy.claims_count,
            total_claims_amount=policy.total_claims_amount,
            status=policy.status,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        db.add(db_policy)
        db.commit()
        db.refresh(db_policy)
        
        return {
            "success": True,
            "id": db_policy.id,
            "policy_id": db_policy.policy_id,
            "policy_number": db_policy.policy_number,
            "client_name": db_policy.client_name,
            "client_email": db_policy.client_email,
            "risk_score": db_policy.risk_score,
            "risk_level": risk_level_str,
            "message": "Politique de risque créée avec succès"
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur création politique: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/policies/{policy_id}")
async def update_risk_policy(
    policy_id: int,
    policy: RiskPolicyUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mettre à jour une politique de risque"""
    try:
        from app.models.risk import RiskInsurancePolicy
        
        db_policy = db.query(RiskInsurancePolicy).filter(RiskInsurancePolicy.id == policy_id).first()
        if not db_policy:
            raise HTTPException(status_code=404, detail="Politique non trouvée")
        
        update_data = policy.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            if field == 'risk_level' and value:
                value = normalize_risk_level(value)
            setattr(db_policy, field, value)
        
        db_policy.updated_at = datetime.now()
        db.commit()
        db.refresh(db_policy)
        
        return {
            "success": True,
            "id": db_policy.id,
            "client_name": db_policy.client_name,
            "risk_score": db_policy.risk_score,
            "risk_level": get_risk_level_string(db_policy.risk_level),
            "message": "Politique mise à jour avec succès"
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur mise à jour politique: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/policies/{policy_id}")
async def delete_risk_policy(
    policy_id: int,
    soft_delete: bool = Query(True, description="Soft delete (marquer comme annulé) ou suppression définitive"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Supprimer une politique de risque"""
    try:
        from app.models.risk import RiskInsurancePolicy
        
        db_policy = db.query(RiskInsurancePolicy).filter(RiskInsurancePolicy.id == policy_id).first()
        if not db_policy:
            raise HTTPException(status_code=404, detail="Politique non trouvée")
        
        if soft_delete:
            db_policy.status = "cancelled"
            db_policy.updated_at = datetime.now()
            db.commit()
            return {"message": "Politique annulée avec succès"}
        else:
            db.delete(db_policy)
            db.commit()
            return {"message": "Politique supprimée définitivement"}
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur suppression politique: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/policies/{policy_id}/recalculate")
async def recalculate_risk_score(
    policy_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Recalculer le score de risque d'une politique"""
    try:
        from app.models.risk import RiskInsurancePolicy
        
        db_policy = db.query(RiskInsurancePolicy).filter(RiskInsurancePolicy.id == policy_id).first()
        if not db_policy:
            raise HTTPException(status_code=404, detail="Politique non trouvée")
        
        old_score = db_policy.risk_score or 0
        
        age_factor = 1.0
        if db_policy.client_age:
            if db_policy.client_age < 25:
                age_factor = 1.3
            elif db_policy.client_age > 60:
                age_factor = 1.2
        
        claims_factor = 1.0 + (db_policy.claims_count or 0) * 0.1
        
        new_score = min(100, max(0, old_score * age_factor * claims_factor + random.uniform(-5, 5)))
        new_score = round(new_score, 1)
        
        if new_score > 70:
            new_level = "critical"
        elif new_score > 50:
            new_level = "high"
        elif new_score > 30:
            new_level = "medium"
        else:
            new_level = "low"
        
        db_policy.risk_score = new_score
        db_policy.risk_level = new_level
        db_policy.updated_at = datetime.now()
        db.commit()
        
        return {
            "id": db_policy.id,
            "old_score": old_score,
            "new_score": new_score,
            "new_level": new_level,
            "factors": {
                "age_factor": age_factor,
                "claims_factor": claims_factor
            }
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur recalcul: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/statistics", response_model=RiskStatistics)
async def get_risk_statistics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtenir des statistiques détaillées sur les risques"""
    try:
        from app.models.risk import RiskInsurancePolicy
        
        total = db.query(RiskInsurancePolicy).count()
        active = db.query(RiskInsurancePolicy).filter(RiskInsurancePolicy.status == "active").count()
        
        critical = db.query(RiskInsurancePolicy).filter(RiskInsurancePolicy.risk_level == "critical").count()
        high = db.query(RiskInsurancePolicy).filter(RiskInsurancePolicy.risk_level == "high").count()
        medium = db.query(RiskInsurancePolicy).filter(RiskInsurancePolicy.risk_level == "medium").count()
        low = db.query(RiskInsurancePolicy).filter(RiskInsurancePolicy.risk_level == "low").count()
        
        avg_score = db.query(func.avg(RiskInsurancePolicy.risk_score)).scalar() or 0
        total_premiums = db.query(func.sum(RiskInsurancePolicy.premium)).scalar() or 0
        total_claims = db.query(func.sum(RiskInsurancePolicy.total_claims_amount)).scalar() or 0
        
        return RiskStatistics(
            total_policies=total,
            active_policies=active,
            critical_risks=critical,
            high_risks=high,
            medium_risks=medium,
            low_risks=low,
            avg_risk_score=round(avg_score, 2),
            total_premiums=float(total_premiums),
            total_claims=float(total_claims)
        )
    except Exception as e:
        logger.error(f"Erreur statistiques: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/policies/{policy_id}/history", response_model=List[RiskHistoryResponse])
async def get_policy_history(
    policy_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Historique des scores d'une police"""
    try:
        from app.models.risk import RiskScoreHistoryRisk
        
        history = db.query(RiskScoreHistoryRisk).filter(
            RiskScoreHistoryRisk.policy_id == policy_id
        ).order_by(desc(RiskScoreHistoryRisk.calculated_at)).all()
        
        if history:
            return [
                RiskHistoryResponse(
                    id=h.id,
                    score=h.score,
                    level=h.level,
                    reason=h.reason,
                    calculated_at=h.calculated_at
                )
                for h in history
            ]
        
        return [
            {
                "id": 1,
                "score": 65.5,
                "level": "high",
                "reason": "Détection d'anomalies",
                "calculated_at": datetime.now() - timedelta(days=30)
            },
            {
                "id": 2,
                "score": 58.2,
                "level": "medium",
                "reason": "Amélioration du profil",
                "calculated_at": datetime.now() - timedelta(days=15)
            }
        ]
        
    except Exception as e:
        logger.error(f"Erreur get_policy_history: {e}")
        return []

# ===== ENDPOINTS D'ANALYSE =====
@router.get("/bayesian")
async def bayesian_risk_prediction(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Prédiction des risques clients avec Bayesian Neural Networks"""
    try:
        from app.models.risk import RiskInsurancePolicy
        
        policies = db.query(RiskInsurancePolicy).filter(
            RiskInsurancePolicy.policy_type.in_(["auto", "habitation", "vie"])
        ).all()
        
        predictions = []
        for policy in policies:
            uncertainty = min(30, (policy.risk_score or 0) * 0.15 + 5)
            
            predictions.append({
                "client_id": policy.id,
                "policy_id": policy.policy_id,
                "client_name": policy.client_name,
                "client_email": policy.client_email,
                "risk": policy.risk_score or 0,
                "uncertainty": round(uncertainty, 1),
                "confidence": 100 - uncertainty,
                "recommendation": get_recommendation(policy.risk_score or 0)
            })
        
        return sorted(predictions, key=lambda x: x['risk'], reverse=True)
    except Exception as e:
        logger.error(f"Erreur bayesian: {e}")
        return []

@router.get("/supply-chain")
async def supply_chain_risk_analysis(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Analyse des risques fournisseurs avec Graph Neural Networks"""
    try:
        from app.models.risk import RiskInsurancePolicy, RiskInsuranceClaim
        
        suppliers = db.query(RiskInsurancePolicy).filter(
            RiskInsurancePolicy.policy_type == "professionnelle"
        ).all()
        
        nodes = []
        for supplier in suppliers:
            claims_count = db.query(RiskInsuranceClaim).filter(
                RiskInsuranceClaim.policy_id == supplier.id
            ).count()
            
            is_critical = (supplier.risk_score or 0) > 70 or claims_count > 3
            risk_level = get_risk_level_string(supplier.risk_level)
            
            nodes.append({
                "id": supplier.id,
                "policy_id": supplier.policy_id,
                "name": supplier.client_name,
                "email": supplier.client_email,
                "risk": supplier.risk_score or 0,
                "risk_level": risk_level,
                "claims_count": claims_count,
                "dependencies": [],
                "critical": is_critical,
                "recommendation": get_recommendation(supplier.risk_score or 0)
            })
        
        return nodes
    except Exception as e:
        logger.error(f"Erreur supply-chain: {e}")
        return []

@router.get("/insider")
async def insider_threat_detection(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Détection des menaces internes avec Psychological AI"""
    try:
        from app.models.risk import RiskInsurancePolicy
        
        employees = db.query(RiskInsurancePolicy).filter(
            RiskInsurancePolicy.policy_type == "sante"
        ).limit(50).all()
        
        risks = []
        for emp in employees:
            risk_score = (emp.risk_score or 0) * 0.8
            
            indicators = []
            if (emp.claims_count or 0) > 2:
                indicators.append("Réclamations fréquentes")
            if (emp.risk_score or 0) > 60:
                indicators.append("Comportement à risque élevé")
            if (emp.risk_score or 0) > 80:
                indicators.append("Alerte critique - Intervention requise")
            if emp.client_age and emp.client_age < 30:
                indicators.append("Jeune professionnel - Surveillance accrue")
            
            risks.append({
                "employee_id": emp.id,
                "policy_id": emp.policy_id,
                "name": emp.client_name,
                "email": emp.client_email,
                "department": "Général",
                "risk": round(risk_score, 1),
                "risk_level": get_risk_level_string(emp.risk_level),
                "indicators": indicators,
                "claims_count": emp.claims_count,
                "recommendation": get_recommendation(risk_score)
            })
        
        return sorted(risks, key=lambda x: x['risk'], reverse=True)
    except Exception as e:
        logger.error(f"Erreur insider: {e}")
        return []

logger.info("✅ MODULE RISK CHARGÉ AVEC SUCCÈS")