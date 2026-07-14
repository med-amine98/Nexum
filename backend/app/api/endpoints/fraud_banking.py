# app/api/endpoints/fraud_banking.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List, Optional
from datetime import datetime
import logging
import traceback

from app.database import get_db
from app.core.dependencies import get_current_user, get_optional_user
from app.models.auth import User
from app.models.fraud_banking import FraudTransaction
from app.schemas.fraud_banking import (
    FraudTransactionCreate, FraudTransactionResponse, FraudTransactionUpdate,
    FraudBankingAlertResponse, FraudBankingRuleCreate, FraudBankingRuleResponse,
    FraudBankingRuleUpdate, FraudStatsResponse
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/fraud-banking", tags=["Fraud Detection Banking"])

# ============================================
# DASHBOARD STATS
# ============================================

@router.get("/dashboard/stats")
async def get_fraud_dashboard_stats(
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Récupère les statistiques du dashboard"""
    try:
        # Compter les transactions par statut
        total = db.query(FraudTransaction).count()
        
        # Compter par statut
        blocked = db.query(FraudTransaction).filter(FraudTransaction.status == "blocked").count()
        investigating = db.query(FraudTransaction).filter(FraudTransaction.status == "investigating").count()
        cleared = db.query(FraudTransaction).filter(FraudTransaction.status == "cleared").count()
        false_positive = db.query(FraudTransaction).filter(FraudTransaction.status == "false_positive").count()
        
        # Montant total bloqué
        total_amount_blocked = db.query(func.sum(FraudTransaction.amount)).filter(
            FraudTransaction.status == "blocked"
        ).scalar() or 0
        
        # Transactions suspectes = investigating + blocked
        suspicious = investigating + blocked
        
        # Distribution des risques
        risk_dist = db.query(
            FraudTransaction.risk_level,
            func.count(FraudTransaction.id).label('count')
        ).group_by(FraudTransaction.risk_level).all()
        
        risk_distribution = {
            "critical": 0,
            "high": 0,
            "medium": 0,
            "low": 0
        }
        for r in risk_dist:
            if r.risk_level in risk_distribution:
                risk_distribution[r.risk_level] = r.count
        
        # Alertes par niveau
        alerts_by_level = {
            "critical": db.query(FraudTransaction).filter(FraudTransaction.risk_level == "critical").count(),
            "high": db.query(FraudTransaction).filter(FraudTransaction.risk_level == "high").count(),
            "medium": db.query(FraudTransaction).filter(FraudTransaction.risk_level == "medium").count(),
            "low": db.query(FraudTransaction).filter(FraudTransaction.risk_level == "low").count()
        }
        
        return {
            "success": True,
            "data": {
                "total_transactions": total,
                "suspicious_transactions": suspicious,
                "blocked_transactions": blocked,
                "investigating": investigating,
                "cleared": cleared,
                "false_positive": false_positive,
                "total_amount_blocked": float(total_amount_blocked),
                "fraud_percentage": round((suspicious / total * 100) if total > 0 else 0, 2),
                "avg_fraud_score": 0,
                "critical_alerts": alerts_by_level["critical"],
                "high_alerts": alerts_by_level["high"],
                "medium_alerts": alerts_by_level["medium"],
                "low_alerts": alerts_by_level["low"],
                "risk_distribution": risk_distribution
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Erreur dashboard stats: {e}")
        traceback.print_exc()
        # Retourner des stats vides en cas d'erreur
        return {
            "success": True,
            "data": {
                "total_transactions": 0,
                "suspicious_transactions": 0,
                "blocked_transactions": 0,
                "investigating": 0,
                "cleared": 0,
                "false_positive": 0,
                "total_amount_blocked": 0,
                "fraud_percentage": 0,
                "avg_fraud_score": 0,
                "critical_alerts": 0,
                "high_alerts": 0,
                "medium_alerts": 0,
                "low_alerts": 0,
                "risk_distribution": {"critical": 0, "high": 0, "medium": 0, "low": 0}
            }
        }

# ============================================
# TRANSACTIONS
# ============================================

@router.get("/transactions")
async def get_fraud_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    risk_level: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Récupérer les transactions frauduleuses"""
    try:
        query = db.query(FraudTransaction)
        
        # Appliquer les filtres
        if risk_level and risk_level != 'all':
            query = query.filter(FraudTransaction.risk_level == risk_level)
        if status and status != 'all':
            query = query.filter(FraudTransaction.status == status)
        if date_from:
            query = query.filter(FraudTransaction.created_at >= date_from)
        if date_to:
            query = query.filter(FraudTransaction.created_at <= date_to)
        
        total = query.count()
        transactions = query.order_by(desc(FraudTransaction.created_at)).offset(skip).limit(limit).all()
        
        # Formater les données
        result = []
        for tx in transactions:
            result.append({
                "id": tx.id,
                "transaction_id": tx.transaction_id,
                "amount": float(tx.amount) if tx.amount else 0,
                "beneficiary": tx.beneficiary,
                "channel": tx.channel,
                "location": tx.location,
                "risk_level": tx.risk_level,
                "risk_score": float(tx.risk_score) if tx.risk_score else 0,
                "status": tx.status,
                "fraud_indicators": tx.fraud_indicators or [],
                "fraud_type": tx.fraud_type,
                "fraud_score": float(tx.fraud_score) if tx.fraud_score else 0,
                "description": tx.description,
                "created_at": tx.created_at.isoformat() if tx.created_at else None
            })
        
        # Distribution des risques
        risk_dist = db.query(
            FraudTransaction.risk_level,
            func.count(FraudTransaction.id).label('count')
        ).group_by(FraudTransaction.risk_level).all()
        
        risk_distribution = [
            {"name": r.risk_level or "unknown", "value": r.count}
            for r in risk_dist
        ]
        
        return {
            "success": True,
            "data": result,
            "total": total,
            "limit": limit,
            "offset": skip,
            "risk_distribution": risk_distribution
        }
        
    except Exception as e:
        logger.error(f"❌ Erreur get_fraud_transactions: {e}")
        traceback.print_exc()
        return {
            "success": True,
            "data": [],
            "total": 0,
            "limit": limit,
            "offset": skip,
            "risk_distribution": []
        }

@router.post("/transactions")
async def create_fraud_transaction(
    transaction_data: dict,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Créer une nouvelle transaction frauduleuse"""
    try:
        from datetime import datetime
        import uuid
        
        new_tx = FraudTransaction(
            transaction_id=f"TX-{uuid.uuid4().hex[:8].upper()}",
            amount=transaction_data.get('amount', 0),
            beneficiary=transaction_data.get('beneficiary', 'Inconnu'),
            channel=transaction_data.get('channel', 'web'),
            location=transaction_data.get('location', 'Paris'),
            risk_level=transaction_data.get('risk_level', 'medium'),
            risk_score=transaction_data.get('risk_score', 50),
            status=transaction_data.get('status', 'investigating'),
            fraud_indicators=transaction_data.get('fraud_indicators', []),
            fraud_type=transaction_data.get('fraud_type'),
            fraud_score=transaction_data.get('fraud_score', 0),
            description=transaction_data.get('description'),
            created_at=datetime.now()
        )
        
        db.add(new_tx)
        db.commit()
        db.refresh(new_tx)
        
        return {
            "success": True,
            "data": {
                "id": new_tx.id,
                "transaction_id": new_tx.transaction_id,
                "amount": float(new_tx.amount),
                "beneficiary": new_tx.beneficiary,
                "risk_level": new_tx.risk_level,
                "status": new_tx.status,
                "created_at": new_tx.created_at.isoformat()
            }
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur create_fraud_transaction: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/transactions/{transaction_id}")
async def get_transaction_detail(
    transaction_id: int,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Récupérer les détails d'une transaction"""
    try:
        tx = db.query(FraudTransaction).filter(FraudTransaction.id == transaction_id).first()
        if not tx:
            raise HTTPException(status_code=404, detail="Transaction non trouvée")
        
        return {
            "id": tx.id,
            "transaction_id": tx.transaction_id,
            "amount": float(tx.amount) if tx.amount else 0,
            "beneficiary": tx.beneficiary,
            "channel": tx.channel,
            "location": tx.location,
            "risk_level": tx.risk_level,
            "risk_score": float(tx.risk_score) if tx.risk_score else 0,
            "status": tx.status,
            "fraud_indicators": tx.fraud_indicators or [],
            "fraud_type": tx.fraud_type,
            "fraud_score": float(tx.fraud_score) if tx.fraud_score else 0,
            "description": tx.description,
            "created_at": tx.created_at.isoformat() if tx.created_at else None
        }
        
    except Exception as e:
        logger.error(f"❌ Erreur get_transaction_detail: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/transactions/{transaction_id}/block")
async def block_transaction(
    transaction_id: int,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Bloquer une transaction"""
    try:
        tx = db.query(FraudTransaction).filter(FraudTransaction.id == transaction_id).first()
        if not tx:
            raise HTTPException(status_code=404, detail="Transaction non trouvée")
        
        tx.status = "blocked"
        db.commit()
        
        return {"success": True, "message": "Transaction bloquée avec succès"}
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur block_transaction: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/transactions/{transaction_id}/clear")
async def clear_transaction(
    transaction_id: int,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Marquer une transaction comme légitime"""
    try:
        tx = db.query(FraudTransaction).filter(FraudTransaction.id == transaction_id).first()
        if not tx:
            raise HTTPException(status_code=404, detail="Transaction non trouvée")
        
        tx.status = "cleared"
        db.commit()
        
        return {"success": True, "message": "Transaction marquée comme légitime"}
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur clear_transaction: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# ALERTES RÉCENTES
# ============================================

@router.get("/alerts/recent")
async def get_recent_alerts(
    limit: int = Query(10, ge=1, le=50),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Récupérer les alertes récentes"""
    try:
        # Récupérer les transactions avec un risque élevé
        alerts = db.query(FraudTransaction).filter(
            FraudTransaction.risk_level.in_(["critical", "high"])
        ).order_by(desc(FraudTransaction.created_at)).limit(limit).all()
        
        # Si pas d'alertes, utiliser des transactions récentes
        if not alerts:
            alerts = db.query(FraudTransaction).order_by(desc(FraudTransaction.created_at)).limit(limit).all()
        
        result = []
        for tx in alerts:
            result.append({
                "id": tx.id,
                "transaction_id": tx.transaction_id,
                "amount": float(tx.amount) if tx.amount else 0,
                "beneficiary": tx.beneficiary,
                "risk_level": tx.risk_level,
                "risk_score": float(tx.risk_score) if tx.risk_score else 0,
                "status": tx.status,
                "location": tx.location,
                "created_at": tx.created_at.isoformat() if tx.created_at else None,
                "is_read": False
            })
        
        # Générer des données d'activité horaire
        hourly_activity = []
        for hour in range(24):
            count = db.query(FraudTransaction).filter(
                func.extract('hour', FraudTransaction.created_at) == hour
            ).count()
            hourly_activity.append({
                "hour": f"{hour:02d}h",
                "count": count
            })
        
        return {
            "success": True,
            "data": {
                "alerts": result,
                "hourly_activity": hourly_activity
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Erreur get_recent_alerts: {e}")
        traceback.print_exc()
        return {
            "success": True,
            "data": {
                "alerts": [],
                "hourly_activity": [{"hour": f"{h:02d}h", "count": 0} for h in range(24)]
            }
        }

# ============================================
# ANALYTICS
# ============================================

@router.get("/analytics")
async def get_fraud_analytics(
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Récupérer les analytics de fraude"""
    try:
        # Tendance des fraudes (par mois)
        from sqlalchemy import extract
        
        monthly_trend = db.query(
            extract('month', FraudTransaction.created_at).label('month'),
            func.count(FraudTransaction.id).label('count')
        ).group_by(extract('month', FraudTransaction.created_at)).all()
        
        trend_data = [
            {"month": ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin"][int(m.month) - 1], "value": m.count}
            for m in monthly_trend
        ]
        
        return {
            "success": True,
            "data": {
                "trend": trend_data,
                "risk_distribution": {
                    "critical": db.query(FraudTransaction).filter(FraudTransaction.risk_level == "critical").count(),
                    "high": db.query(FraudTransaction).filter(FraudTransaction.risk_level == "high").count(),
                    "medium": db.query(FraudTransaction).filter(FraudTransaction.risk_level == "medium").count(),
                    "low": db.query(FraudTransaction).filter(FraudTransaction.risk_level == "low").count()
                }
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Erreur get_fraud_analytics: {e}")
        traceback.print_exc()
        return {
            "success": True,
            "data": {
                "trend": [],
                "risk_distribution": {"critical": 0, "high": 0, "medium": 0, "low": 0}
            }
        }

# ============================================
# GENERATE TEST DATA
# ============================================

@router.post("/generate-test-data")
async def generate_test_data(
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Générer des données de test"""
    try:
        import random
        from datetime import datetime, timedelta
        
        # Vérifier si des données existent déjà
        existing = db.query(FraudTransaction).count()
        if existing > 10:
            return {"success": True, "message": f"Des données existent déjà ({existing} transactions)", "count": existing}
        
        # Générer 30 transactions
        beneficiaries = ['Jean Dupont', 'Marie Martin', 'Pierre Durand', 'Sophie Bernard', 
                        'Thomas Petit', 'Claire Robert', 'Nicolas Moreau', 'Isabelle Lambert']
        channels = ['mobile', 'web', 'agence']
        locations = ['Paris', 'Lyon', 'Marseille', 'Lille', 'Bordeaux', 'Toulouse', 'Nice', 'Nantes']
        risk_levels = ['critical', 'high', 'medium', 'low']
        statuses = ['investigating', 'blocked', 'cleared', 'false_positive']
        
        for i in range(30):
            tx = FraudTransaction(
                transaction_id=f"TX-TEST-{i+1:04d}",
                amount=random.randint(500, 10000),
                beneficiary=random.choice(beneficiaries),
                channel=random.choice(channels),
                location=random.choice(locations),
                risk_level=random.choice(risk_levels),
                risk_score=random.randint(20, 95),
                status=random.choice(statuses),
                fraud_indicators=['Montant anormal', 'Localisation suspecte'],
                fraud_type=random.choice(['credit_fraud', 'identity_theft', 'income_inconsistency']),
                description="Transaction de test",
                created_at=datetime.now() - timedelta(hours=random.randint(1, 72))
            )
            db.add(tx)
        
        db.commit()
        
        return {"success": True, "message": "30 transactions générées", "count": 30}
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur generate_test_data: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

logger.info("✅ ROUTER FRAUD BANKING CHARGÉ AVEC SUCCÈS")



@router.get("/ping")
async def ping():
    """Endpoint de test simple"""
    return {"status": "ok", "message": "Fraud banking router is working"}

@router.get("/test-count")
async def test_count(db: Session = Depends(get_db)):
    """Compter les transactions"""
    try:
        from sqlalchemy import text
        count = db.execute(text("SELECT COUNT(*) FROM fraud_transactions")).scalar()
        return {"count": count, "has_data": count > 0}
    except Exception as e:
        return {"error": str(e)}