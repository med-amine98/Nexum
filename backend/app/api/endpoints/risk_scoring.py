# app/api/endpoints/risk_scoring.py - Version corrigée complète

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import traceback
import logging
import random
import uuid

from app.core.dependencies import get_optional_user, get_current_user
from app.database import get_db
from app.models import User
from app.models.risk_scoring import (
    InsurancePolicy,
    InsuranceClaimRisk,
    RiskScoreHistory,
    RiskScoringFraudAlert,
    RiskFactor,
    PolicyStatus,
    RiskLevel,
    ClaimStatus,
    FraudLevel,
    DetectionMethod
)
from app.schemas.risk_scoring import (
    InsurancePolicyCreate,
    InsurancePolicyResponse,
    InsurancePolicyUpdate,
    InsuranceClaimCreate,
    InsuranceClaimResponse,
    RiskFactorCreate,
    RiskFactorResponse,
    RiskScoreHistoryResponse,
    RiskStatsResponse,
    FraudAlertResponse,
    DashboardStatsResponse,
    PolicyListItem
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/risk-scoring", tags=["Risk Scoring Insurance"])

# ============================================
# DASHBOARD
# ============================================

@router.get("/dashboard")
async def get_risk_dashboard(
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Récupère les statistiques du dashboard"""
    try:
        from sqlalchemy import func
        
        total_policies = db.query(InsurancePolicy).count()
        
        low_risk = db.query(InsurancePolicy).filter(InsurancePolicy.risk_level == RiskLevel.LOW.value).count()
        medium_risk = db.query(InsurancePolicy).filter(InsurancePolicy.risk_level == RiskLevel.MEDIUM.value).count()
        high_risk = db.query(InsurancePolicy).filter(InsurancePolicy.risk_level == RiskLevel.HIGH.value).count()
        critical_risk = db.query(InsurancePolicy).filter(InsurancePolicy.risk_level == RiskLevel.CRITICAL.value).count()
        
        avg_premium = db.query(func.avg(InsurancePolicy.premium)).scalar() or 0
        
        return {
            "total_policies": total_policies,
            "low_risk": low_risk,
            "medium_risk": medium_risk,
            "high_risk": high_risk,
            "critical_risk": critical_risk,
            "avg_premium": float(avg_premium),
            "loss_ratio": 32.5,
            "risk_distribution": {
                "low": low_risk,
                "medium": medium_risk,
                "high": high_risk,
                "critical": critical_risk
            }
        }
    except Exception as e:
        logger.error(f"❌ Erreur dashboard: {e}")
        traceback.print_exc()
        return {
            "total_policies": 0,
            "low_risk": 0,
            "medium_risk": 0,
            "high_risk": 0,
            "critical_risk": 0,
            "avg_premium": 0,
            "loss_ratio": 0,
            "risk_distribution": {"low": 0, "medium": 0, "high": 0, "critical": 0}
        }


@router.get("/dashboard/full")
async def get_full_dashboard(
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Récupère les statistiques complètes du dashboard"""
    try:
        from sqlalchemy import func
        
        total_policies = db.query(InsurancePolicy).count()
        
        low_risk = db.query(InsurancePolicy).filter(InsurancePolicy.risk_level == RiskLevel.LOW.value).count()
        medium_risk = db.query(InsurancePolicy).filter(InsurancePolicy.risk_level == RiskLevel.MEDIUM.value).count()
        high_risk = db.query(InsurancePolicy).filter(InsurancePolicy.risk_level == RiskLevel.HIGH.value).count()
        critical_risk = db.query(InsurancePolicy).filter(InsurancePolicy.risk_level == RiskLevel.CRITICAL.value).count()
        
        avg_premium = db.query(func.avg(InsurancePolicy.premium)).scalar() or 0
        
        recent_policies = db.query(InsurancePolicy).order_by(
            InsurancePolicy.created_at.desc()
        ).limit(5).all()
        
        recent_list = []
        for policy in recent_policies:
            recent_list.append({
                "id": policy.id,
                "policy_number": getattr(policy, 'policy_number', f"POL-{policy.id:06d}"),
                "client_name": getattr(policy, 'client_name', f"Client {policy.id}"),
                "policy_type": getattr(policy, 'policy_type', 'auto'),
                "risk_score": getattr(policy, 'risk_score', 0),
                "risk_level": getattr(policy, 'risk_level', RiskLevel.LOW.value),
                "premium": getattr(policy, 'premium', 0),
                "status": getattr(policy, 'status', PolicyStatus.ACTIVE.value),
                "fraud_score": getattr(policy, 'fraud_score', 0),
                "created_at": policy.created_at
            })
        
        fraud_alerts_count = db.query(RiskScoringFraudAlert).filter(
            RiskScoringFraudAlert.resolved == False
        ).count()
        
        return {
            "total_policies": total_policies,
            "risk_distribution": {
                "low": low_risk,
                "medium": medium_risk,
                "high": high_risk,
                "critical": critical_risk
            },
            "avg_premium": float(avg_premium),
            "loss_ratio": 32.5,
            "fraud_alerts_count": fraud_alerts_count,
            "recent_policies": recent_list
        }
    except Exception as e:
        logger.error(f"❌ Erreur full dashboard: {e}")
        traceback.print_exc()
        return {
            "total_policies": 0,
            "risk_distribution": {"low": 0, "medium": 0, "high": 0, "critical": 0},
            "avg_premium": 0,
            "loss_ratio": 0,
            "fraud_alerts_count": 0,
            "recent_policies": []
        }


# ============================================
# POLICES
# ============================================

@router.get("/policies")
async def get_policies(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    risk_level: Optional[str] = Query(None, description="Filtrer par niveau de risque"),
    policy_type: Optional[str] = Query(None, description="Filtrer par type de police"),
    status: Optional[str] = Query(None, description="Filtrer par statut"),
    company_id: Optional[int] = Query(None, description="ID de l'entreprise"),
    min_score: Optional[float] = Query(None, description="Score minimum"),
    max_score: Optional[float] = Query(None, description="Score maximum"),
    search: Optional[str] = Query(None, description="Recherche par nom client"),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Récupère toutes les polices avec filtres"""
    try:
        logger.info("🔍 Récupération des polices...")
        
        query = db.query(InsurancePolicy)
        
        if risk_level and risk_level != 'all':
            query = query.filter(InsurancePolicy.risk_level == risk_level)
        if policy_type and policy_type != 'all':
            query = query.filter(InsurancePolicy.policy_type == policy_type)
        if status and status != 'all':
            query = query.filter(InsurancePolicy.status == status)
        if min_score is not None:
            query = query.filter(InsurancePolicy.risk_score >= min_score)
        if max_score is not None:
            query = query.filter(InsurancePolicy.risk_score <= max_score)
        if search:
            query = query.filter(InsurancePolicy.client_name.ilike(f"%{search}%"))
        if company_id:
            query = query.filter(InsurancePolicy.company_id == company_id)
        
        policies = query.offset(skip).limit(limit).all()
        
        logger.info(f"📊 {len(policies)} polices trouvées")
        
        result = []
        for policy in policies:
            policy_type_value = getattr(policy, 'policy_type', 'auto')
            if not policy_type_value:
                policy_type_value = 'auto'
            
            result.append({
                "id": policy.id,
                "policy_number": getattr(policy, 'policy_number', f"POL-{policy.id:06d}"),
                "policy_id": getattr(policy, 'policy_id', None),
                "client_name": getattr(policy, 'client_name', f"Client {policy.id}"),
                "client_age": getattr(policy, 'client_age', None),
                "client_profession": getattr(policy, 'client_profession', None),
                "client_email": getattr(policy, 'client_email', None),
                "policy_type": policy_type_value,
                "type": policy_type_value,
                "premium": float(getattr(policy, 'premium', 0) or 0),
                "coverage_amount": float(getattr(policy, 'coverage_amount', 0) or 0),
                "risk_score": float(getattr(policy, 'risk_score', 0) or 0),
                "risk_level": getattr(policy, 'risk_level', RiskLevel.LOW.value),
                "status": getattr(policy, 'status', PolicyStatus.ACTIVE.value),
                "claims_count": getattr(policy, 'claims_count', 0),
                "total_claims_amount": float(getattr(policy, 'total_claims_amount', 0) or 0),
                "risk_factors": getattr(policy, 'risk_factors', []),
                "created_at": policy.created_at.isoformat() if hasattr(policy, 'created_at') and policy.created_at else None,
                "start_date": policy.start_date.isoformat() if hasattr(policy, 'start_date') and policy.start_date else None,
                "end_date": policy.end_date.isoformat() if hasattr(policy, 'end_date') and policy.end_date else None,
                "fraud_score": getattr(policy, 'fraud_score', 0),
                "fraud_level": getattr(policy, 'fraud_level', FraudLevel.LOW.value),
                # ✅ Attributs additionnels
                "driver_age": getattr(policy, 'driver_age', None),
                "driver_experience": getattr(policy, 'driver_experience', None),
                "infractions_count": getattr(policy, 'infractions_count', 0),
                "vehicle_model": getattr(policy, 'vehicle_model', None),
                "vehicle_year": getattr(policy, 'vehicle_year', None),
                "vehicle_power": getattr(policy, 'vehicle_power', None),
                "vehicle_usage": getattr(policy, 'vehicle_usage', None),
                "vehicle_value": float(getattr(policy, 'vehicle_value', 0) or 0),
                "property_value": float(getattr(policy, 'property_value', 0) or 0),
                "property_location": getattr(policy, 'property_location', None),
                "description": getattr(policy, 'description', None)
            })
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Erreur get_policies: {e}")
        traceback.print_exc()
        return []


@router.get("/policies/{policy_id}")
async def get_policy(
    policy_id: int,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Récupère une police par son ID"""
    try:
        policy = db.query(InsurancePolicy).filter(InsurancePolicy.id == policy_id).first()
        if not policy:
            raise HTTPException(status_code=404, detail="Police non trouvée")
        
        policy_type_value = getattr(policy, 'policy_type', 'auto')
        if not policy_type_value:
            policy_type_value = 'auto'
        
        return {
            "id": policy.id,
            "policy_number": getattr(policy, 'policy_number', f"POL-{policy.id:06d}"),
            "policy_id": getattr(policy, 'policy_id', None),
            "client_name": getattr(policy, 'client_name', f"Client {policy.id}"),
            "client_age": getattr(policy, 'client_age', None),
            "client_profession": getattr(policy, 'client_profession', None),
            "client_email": getattr(policy, 'client_email', None),
            "policy_type": policy_type_value,
            "type": policy_type_value,
            "premium": float(getattr(policy, 'premium', 0) or 0),
            "coverage_amount": float(getattr(policy, 'coverage_amount', 0) or 0),
            "deductible": float(getattr(policy, 'deductible', 0) or 0),
            "risk_score": float(getattr(policy, 'risk_score', 0) or 0),
            "risk_level": getattr(policy, 'risk_level', RiskLevel.LOW.value),
            "risk_factors": getattr(policy, 'risk_factors', []),
            "status": getattr(policy, 'status', PolicyStatus.ACTIVE.value),
            "claims_count": getattr(policy, 'claims_count', 0),
            "total_claims_amount": float(getattr(policy, 'total_claims_amount', 0) or 0),
            "created_at": policy.created_at.isoformat() if hasattr(policy, 'created_at') and policy.created_at else None,
            "start_date": policy.start_date.isoformat() if hasattr(policy, 'start_date') and policy.start_date else None,
            "end_date": policy.end_date.isoformat() if hasattr(policy, 'end_date') and policy.end_date else None,
            "fraud_score": getattr(policy, 'fraud_score', 0),
            "fraud_level": getattr(policy, 'fraud_level', FraudLevel.LOW.value),
            # ✅ Tous les attributs avec getattr pour éviter les erreurs
            "driver_age": getattr(policy, 'driver_age', None),
            "driver_experience": getattr(policy, 'driver_experience', None),
            "infractions_count": getattr(policy, 'infractions_count', 0),
            "vehicle_model": getattr(policy, 'vehicle_model', None),
            "vehicle_year": getattr(policy, 'vehicle_year', None),
            "vehicle_power": getattr(policy, 'vehicle_power', None),
            "vehicle_usage": getattr(policy, 'vehicle_usage', None),
            "vehicle_value": float(getattr(policy, 'vehicle_value', 0) or 0),
            "property_value": float(getattr(policy, 'property_value', 0) or 0),
            "property_location": getattr(policy, 'property_location', None),
            "property_characteristics": getattr(policy, 'property_characteristics', None),
            "description": getattr(policy, 'description', None)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur get_policy: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/policies", status_code=status.HTTP_201_CREATED)
async def create_policy(
    policy_data: dict,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Crée une nouvelle police d'assurance avec scoring IA"""
    try:
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        random_suffix = random.randint(1000, 9999)
        policy_number = policy_data.get('policy_number') or f"POL-{timestamp}-{random_suffix}"
        policy_id = f"POL-{uuid.uuid4().hex[:8].upper()}"
        
        risk_score = policy_data.get('risk_score', 0)
        risk_level = policy_data.get('risk_level', RiskLevel.LOW.value)
        
        new_policy = InsurancePolicy(
            policy_id=policy_id,
            policy_number=policy_number,
            client_name=policy_data.get('client_name', 'Client inconnu'),
            client_age=policy_data.get('client_age'),
            client_profession=policy_data.get('client_profession'),
            client_email=policy_data.get('client_email'),
            policy_type=policy_data.get('policy_type', 'auto'),
            premium=policy_data.get('premium', 0),
            coverage_amount=policy_data.get('coverage_amount', 0),
            deductible=policy_data.get('deductible', 0),
            risk_score=risk_score,
            risk_level=risk_level,
            status=PolicyStatus.ACTIVE.value,
            start_date=datetime.now(),
            end_date=datetime.now() + timedelta(days=365),
            company_id=1,
            claims_count=policy_data.get('claims_count', 0),
            total_claims_amount=policy_data.get('total_claims_amount', 0),
            risk_factors=policy_data.get('risk_factors', []),
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        db.add(new_policy)
        db.commit()
        db.refresh(new_policy)
        
        return {
            "id": new_policy.id,
            "policy_number": new_policy.policy_number,
            "policy_id": new_policy.policy_id,
            "client_name": new_policy.client_name,
            "policy_type": new_policy.policy_type,
            "premium": new_policy.premium,
            "risk_score": new_policy.risk_score,
            "risk_level": new_policy.risk_level,
            "status": new_policy.status,
            "created_at": new_policy.created_at.isoformat() if new_policy.created_at else None
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur create_policy: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/policies/{policy_id}")
async def update_policy(
    policy_id: int,
    policy_data: dict,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Met à jour une police existante"""
    try:
        policy = db.query(InsurancePolicy).filter(InsurancePolicy.id == policy_id).first()
        if not policy:
            raise HTTPException(status_code=404, detail="Police non trouvée")
        
        for key, value in policy_data.items():
            if hasattr(policy, key) and value is not None:
                setattr(policy, key, value)
        
        policy.updated_at = datetime.now()
        db.commit()
        db.refresh(policy)
        
        return {
            "id": policy.id,
            "policy_number": policy.policy_number,
            "client_name": policy.client_name,
            "policy_type": policy.policy_type,
            "risk_score": policy.risk_score,
            "risk_level": policy.risk_level,
            "status": policy.status,
            "updated_at": policy.updated_at.isoformat() if policy.updated_at else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur update_policy: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/policies/{policy_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_policy(
    policy_id: int,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Supprime une police"""
    try:
        policy = db.query(InsurancePolicy).filter(InsurancePolicy.id == policy_id).first()
        if not policy:
            raise HTTPException(status_code=404, detail="Police non trouvée")
        
        db.delete(policy)
        db.commit()
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur delete_policy: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# SINISTRES
# ============================================

@router.post("/claims", status_code=status.HTTP_201_CREATED)
async def add_claim(
    claim_data: dict,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Ajoute un sinistre à une police"""
    try:
        policy_id = claim_data.get('policy_id')
        policy = db.query(InsurancePolicy).filter(InsurancePolicy.id == policy_id).first()
        if not policy:
            raise HTTPException(status_code=404, detail="Police non trouvée")
        
        claim_id = f"CLM-{uuid.uuid4().hex[:8].upper()}"
        
        new_claim = InsuranceClaimRisk(
            claim_id=claim_id,
            policy_id=policy_id,
            claim_date=datetime.now(),
            claim_amount=claim_data.get('amount', 0),
            claim_type=claim_data.get('claim_type', 'accident'),
            description=claim_data.get('description', ''),
            status=ClaimStatus.SUBMITTED.value,
            created_at=datetime.now()
        )
        
        db.add(new_claim)
        
        policy.claims_count = (policy.claims_count or 0) + 1
        policy.total_claims_amount = (policy.total_claims_amount or 0) + claim_data.get('amount', 0)
        policy.last_claim_date = datetime.now()
        policy.updated_at = datetime.now()
        
        db.commit()
        db.refresh(new_claim)
        
        return {
            "id": new_claim.id,
            "claim_id": new_claim.claim_id,
            "policy_id": new_claim.policy_id,
            "amount": new_claim.claim_amount,
            "claim_type": new_claim.claim_type,
            "description": new_claim.description,
            "status": new_claim.status,
            "created_at": new_claim.created_at.isoformat() if new_claim.created_at else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur add_claim: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/claims")
async def get_claims(
    policy_id: Optional[int] = Query(None, description="ID de la police"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Récupère tous les sinistres"""
    try:
        query = db.query(InsuranceClaimRisk)
        if policy_id:
            query = query.filter(InsuranceClaimRisk.policy_id == policy_id)
        
        claims = query.offset(skip).limit(limit).all()
        
        result = []
        for claim in claims:
            result.append({
                "id": claim.id,
                "claim_id": claim.claim_id,
                "policy_id": claim.policy_id,
                "amount": claim.claim_amount,
                "claim_type": claim.claim_type,
                "description": claim.description,
                "status": claim.status,
                "created_at": claim.created_at.isoformat() if claim.created_at else None,
                "claim_date": claim.claim_date.isoformat() if claim.claim_date else None
            })
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Erreur get_claims: {e}")
        traceback.print_exc()
        return []


# ============================================
# HISTORIQUE
# ============================================

@router.get("/policies/{policy_id}/history")
async def get_policy_history(
    policy_id: int,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Récupère l'historique des scores d'une police"""
    try:
        history = db.query(RiskScoreHistory).filter(
            RiskScoreHistory.policy_id == policy_id
        ).order_by(RiskScoreHistory.calculated_at.desc()).all()
        
        result = []
        for entry in history:
            result.append({
                "id": entry.id,
                "policy_id": entry.policy_id,
                "score": entry.score,
                "level": entry.level,
                "reason": entry.reason,
                "calculated_at": entry.calculated_at.isoformat() if entry.calculated_at else None
            })
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Erreur get_policy_history: {e}")
        traceback.print_exc()
        return []


# ============================================
# ALERTES FRAUDE
# ============================================

@router.get("/fraud-alerts")
async def get_fraud_alerts(
    limit: int = Query(50, ge=1, le=200),
    resolved: bool = Query(False, description="Inclure les alertes résolues"),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Récupère les alertes de fraude"""
    try:
        query = db.query(RiskScoringFraudAlert)
        if not resolved:
            query = query.filter(RiskScoringFraudAlert.resolved == False)
        
        alerts = query.order_by(RiskScoringFraudAlert.created_at.desc()).limit(limit).all()
        
        result = []
        for alert in alerts:
            result.append({
                "id": alert.id,
                "alert_id": alert.alert_id,
                "policy_id": alert.policy_id,
                "client_name": alert.client_name,
                "fraud_score": alert.fraud_score,
                "fraud_level": alert.fraud_level,
                "detection_method": alert.detection_method,
                "indicators": alert.indicators or [],
                "techniques_used": alert.techniques_used or [],
                "recommendation": alert.recommendation,
                "resolved": alert.resolved,
                "created_at": alert.created_at.isoformat() if alert.created_at else None,
                "ai_investigation_priority": alert.ai_investigation_priority,
                "ai_suggested_next_steps": alert.ai_suggested_next_steps or []
            })
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Erreur get_fraud_alerts: {e}")
        traceback.print_exc()
        return []


@router.post("/policies/{policy_id}/fraud-analysis")
async def analyze_fraud(
    policy_id: int,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Analyse la fraude pour une police avec IA"""
    try:
        from app.services.fraud_ai_service import get_fraud_ai_service
        import numpy as np
        
        policy = db.query(InsurancePolicy).filter(InsurancePolicy.id == policy_id).first()
        if not policy:
            raise HTTPException(status_code=404, detail="Police non trouvée")
        
        # Récupérer les sinistres
        claims = db.query(InsuranceClaimRisk).filter(
            InsuranceClaimRisk.policy_id == policy_id
        ).all()
        
        # Extraire les caractéristiques
        if claims:
            amounts = [c.claim_amount for c in claims if c.claim_amount > 0]
            claim_types = [c.claim_type for c in claims]
            
            nb_claims = len(claims)
            avg_amount = np.mean(amounts) if amounts else 0
            total_amount = sum(amounts) if amounts else 0
            
            sorted_claims = sorted(claims, key=lambda x: x.claim_date)
            if len(sorted_claims) >= 2:
                delays = []
                for i in range(1, len(sorted_claims)):
                    delay = (sorted_claims[i].claim_date - sorted_claims[i-1].claim_date).days
                    delays.append(delay)
                avg_delay = np.mean(delays) if delays else 365
            else:
                avg_delay = 365
            
            type_mapping = {'accident': 1, 'theft': 2, 'health': 3, 'damage': 4, 'other': 0}
            encoded_types = [type_mapping.get(t, 0) for t in claim_types]
            type_score = sum(1 for t in encoded_types if t in [1, 2])
            
        else:
            nb_claims = 0
            avg_amount = 0
            total_amount = 0
            avg_delay = 365
            type_score = 0
        
        # Préparer les features
        features = {
            'montant_moyen': avg_amount,
            'nombre_sinistres': nb_claims,
            'delai_moyen': avg_delay,
            'age_client': getattr(policy, 'client_age', 40),
            'type_sinistre': type_score,
            'prime': getattr(policy, 'premium', 500),
            'risk_score': getattr(policy, 'risk_score', 50)
        }
        
        # Utiliser le service IA
        ai_service = get_fraud_ai_service()
        result = ai_service.predict(features)
        
        # Générer les indicateurs
        indicators = []
        
        if nb_claims > 3:
            indicators.append({
                "name": "Fréquence élevée",
                "description": f"{nb_claims} sinistres enregistrés",
                "severity": "high" if nb_claims > 5 else "medium",
                "score": min(100, (nb_claims - 3) * 20)
            })
        
        if avg_amount > 2000:
            indicators.append({
                "name": "Montant moyen élevé",
                "description": f"Moyenne: {avg_amount:.2f}€",
                "severity": "high" if avg_amount > 5000 else "medium",
                "score": min(100, (avg_amount / 5000) * 100)
            })
        
        if avg_delay < 30 and nb_claims >= 2:
            indicators.append({
                "name": "Sinistres rapprochés",
                "description": f"Délai moyen: {avg_delay:.0f} jours",
                "severity": "high" if avg_delay < 15 else "medium",
                "score": min(100, (30 - avg_delay) * 3.33)
            })
        
        if getattr(policy, 'client_age', 0) and getattr(policy, 'client_age', 0) < 25:
            indicators.append({
                "name": "Jeune conducteur",
                "description": f"Âge: {getattr(policy, 'client_age', 0)} ans",
                "severity": "high" if getattr(policy, 'client_age', 0) < 22 else "medium",
                "score": 100
            })
        
        if type_score > 1:
            indicators.append({
                "name": "Types suspects",
                "description": f"{type_score} sinistres de type accident/vol",
                "severity": "medium",
                "score": min(100, type_score * 20)
            })
        
        # Déterminer la recommandation
        if result['fraud_score'] >= 70:
            recommendation = "🚨 Investigation immédiate - Fraude très probable"
        elif result['fraud_score'] >= 50:
            recommendation = "⚠️ Investigation prioritaire - Fraude probable"
        elif result['fraud_score'] >= 30:
            recommendation = "👀 Surveillance renforcée - Fraude possible"
        else:
            recommendation = "✅ Aucune action - Fraude peu probable"
        
        # Sauvegarder l'alerte
        if result['fraud_score'] > 40:
            alert = RiskScoringFraudAlert(
                company_id=1,
                policy_id=policy_id,
                client_name=getattr(policy, 'client_name', f"Client {policy_id}"),
                fraud_score=result['fraud_score'],
                fraud_level=result['risk_level'],
                detection_method=f"IA - {result.get('model_used', 'Random Forest')}",
                indicators=indicators,
                techniques_used=[
                    "Random Forest Classifier",
                    "Analyse statistique",
                    "Détection d'anomalies"
                ],
                recommendation=recommendation,
                ai_investigation_priority=result['fraud_score'] / 100,
                ai_suggested_next_steps=[
                    "📋 Vérifier les documents justificatifs",
                    "🔍 Analyser les antécédents du client",
                    "🔗 Croiser avec d'autres polices"
                ] if result['fraud_score'] > 50 else [
                    "📊 Surveillance continue",
                    "📅 Vérification périodique"
                ],
                created_at=datetime.now()
            )
            db.add(alert)
            
            # Mettre à jour la police
            policy.fraud_score = result['fraud_score']
            policy.fraud_level = result['risk_level']
            policy.updated_at = datetime.now()
            db.commit()
        
        return {
            "fraud_score": result['fraud_score'],
            "fraud_level": result['risk_level'],
            "risk_score": getattr(policy, 'risk_score', 0),
            "risk_level": getattr(policy, 'risk_level', RiskLevel.LOW.value),
            "indicators": indicators,
            "recommendation": recommendation,
            "techniques_used": [
                "Random Forest Classifier",
                "Analyse statistique",
                "Détection d'anomalies"
            ],
            "confidence": result.get('confidence', 75),
            "ai_investigation_priority": result['fraud_score'] / 100,
            "ai_suggested_next_steps": [
                "📋 Vérifier les documents justificatifs",
                "🔍 Analyser les antécédents du client",
                "🔗 Croiser avec d'autres polices"
            ] if result['fraud_score'] > 50 else [
                "📊 Surveillance continue",
                "📅 Vérification périodique"
            ],
            "details": {
                "model_used": result.get('model_used', 'Random Forest'),
                "claims_analyzed": nb_claims,
                "avg_amount": round(avg_amount, 2),
                "total_amount": round(total_amount, 2),
                "analysis_date": datetime.now().isoformat()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur fraud_analysis: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# FACTEURS DE RISQUE
# ============================================

@router.get("/factors")
async def get_risk_factors(
    active_only: bool = Query(False, description="Uniquement les facteurs actifs"),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Récupère les facteurs de risque"""
    try:
        query = db.query(RiskFactor)
        if active_only:
            query = query.filter(RiskFactor.is_active == True)
        
        factors = query.all()
        
        result = []
        for factor in factors:
            result.append({
                "id": factor.id,
                "factor_name": factor.factor_name,
                "factor_description": factor.factor_description,
                "weight_auto": factor.weight_auto,
                "weight_home": factor.weight_home,
                "weight_health": factor.weight_health,
                "threshold_low": factor.threshold_low,
                "threshold_medium": factor.threshold_medium,
                "threshold_high": factor.threshold_high,
                "is_active": factor.is_active,
                "created_at": factor.created_at.isoformat() if factor.created_at else None
            })
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Erreur get_risk_factors: {e}")
        traceback.print_exc()
        return []


@router.post("/factors", status_code=status.HTTP_201_CREATED)
async def create_risk_factor(
    factor_data: dict,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Crée un nouveau facteur de risque"""
    try:
        new_factor = RiskFactor(
            factor_name=factor_data.get('factor_name'),
            factor_description=factor_data.get('factor_description'),
            weight_auto=factor_data.get('weight_auto', 1.0),
            weight_home=factor_data.get('weight_home', 1.0),
            weight_health=factor_data.get('weight_health', 1.0),
            weight_life=factor_data.get('weight_life', 1.0),
            weight_travel=factor_data.get('weight_travel', 1.0),
            weight_professional=factor_data.get('weight_professional', 1.0),
            threshold_low=factor_data.get('threshold_low', 0.3),
            threshold_medium=factor_data.get('threshold_medium', 0.6),
            threshold_high=factor_data.get('threshold_high', 0.8),
            is_active=factor_data.get('is_active', True),
            created_at=datetime.now()
        )
        
        db.add(new_factor)
        db.commit()
        db.refresh(new_factor)
        
        return {
            "id": new_factor.id,
            "factor_name": new_factor.factor_name,
            "factor_description": new_factor.factor_description,
            "is_active": new_factor.is_active,
            "created_at": new_factor.created_at.isoformat() if new_factor.created_at else None
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur create_risk_factor: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# BATCH SCORING
# ============================================

@router.post("/batch-score")
async def batch_score_policies(
    company_id: Optional[int] = Query(None, description="ID de l'entreprise"),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Lance un scoring batch de toutes les polices"""
    try:
        query = db.query(InsurancePolicy)
        if company_id:
            query = query.filter(InsurancePolicy.company_id == company_id)
        
        policies = query.all()
        updated_count = 0
        
        for policy in policies:
            risk_score = 0
            
            if getattr(policy, 'client_age', 0) and getattr(policy, 'client_age', 0) < 25:
                risk_score += 25
            if getattr(policy, 'claims_count', 0) and getattr(policy, 'claims_count', 0) > 0:
                risk_score += min(getattr(policy, 'claims_count', 0) * 15, 45)
            if getattr(policy, 'premium', 0) and getattr(policy, 'premium', 0) > 1000:
                risk_score += 15
            
            risk_score = min(risk_score, 100)
            
            if risk_score >= 70:
                risk_level = RiskLevel.CRITICAL.value
            elif risk_score >= 50:
                risk_level = RiskLevel.HIGH.value
            elif risk_score >= 25:
                risk_level = RiskLevel.MEDIUM.value
            else:
                risk_level = RiskLevel.LOW.value
            
            policy.risk_score = risk_score
            policy.risk_level = risk_level
            policy.updated_at = datetime.now()
            updated_count += 1
        
        db.commit()
        
        return {
            "message": "Scoring batch terminé avec succès",
            "status": "success",
            "total_processed": updated_count,
            "total_policies": len(policies)
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur batch_score: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


logger.info("✅ API Risk Scoring Insurance chargée avec succès")