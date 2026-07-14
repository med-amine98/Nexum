# app/api/endpoints/fraud_detection.py
"""
API de détection de fraude
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List, Dict, Any
from datetime import datetime
import logging
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.auth import User
from app.services.fraud_classifier import fraud_classifier
from app.services.fraud_types import FraudType, FRAUD_CONFIG
from app.services.neo4j_service import neo4j_service
from app.services.blockchain_service import blockchain_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/fraud-detection", tags=["Fraud Detection"])

@router.post("/analyze")
async def analyze_transaction(
    transaction: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Analyse une transaction et détecte la fraude"""
    try:
        result = await fraud_classifier.classify_transaction(transaction)
        return {
            "success": True,
            "data": result,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Erreur analyse: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/types")
async def get_fraud_types(
    current_user: User = Depends(get_current_user)
):
    """Récupère la liste des types de fraude"""
    types = []
    for fraud_type in FraudType:
        config = FRAUD_CONFIG.get(fraud_type, {})
        types.append({
            "type": fraud_type.value,
            "name": config.get("name", fraud_type.value),
            "icon": config.get("icon", "🔍"),
            "severity": config.get("severity", "MEDIUM"),
            "indicators": config.get("indicators", []),
            "threshold": config.get("threshold", 0.6)
        })
    
    return {
        "success": True,
        "data": types,
        "count": len(types)
    }

@router.get("/stats")
async def get_fraud_stats(
    days: int = Query(7, ge=1, le=30),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Statistiques des fraudes"""
    try:
        # Récupérer les stats de la blockchain
        blockchain_stats = blockchain_service.get_stats()
        
        # Récupérer la distribution des risques
        risk_distribution = neo4j_service.get_risk_distribution()
        
        return {
            "success": True,
            "data": {
                "total_transactions": blockchain_stats.get("total_transactions", 0),
                "blockchain_stats": blockchain_stats,
                "risk_distribution": risk_distribution,
                "period": f"{days} jours",
                "timestamp": datetime.now().isoformat()
            }
        }
    except Exception as e:
        logger.error(f"Erreur stats: {e}")
        return {
            "success": True,
            "data": {
                "total_transactions": 0,
                "risk_distribution": {},
                "period": f"{days} jours"
            }
        }

@router.get("/transactions")
async def get_fraud_transactions(
    limit: int = Query(50, ge=1, le=200),
    fraud_type: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Récupère les transactions avec détection de fraude"""
    try:
        # Récupérer les transactions depuis Neo4j
        query = """
        MATCH (t:Transaction)
        WHERE t.fraud_score > 0
        RETURN 
            t.id as transaction_id,
            t.amount as amount,
            t.timestamp as timestamp,
            t.fraud_score as fraud_score,
            t.risk_level as risk_level
        ORDER BY t.timestamp DESC
        LIMIT $limit
        """
        
        result = neo4j_service.query(query, {"limit": limit})
        
        # Enrichir avec les types de fraude
        transactions = []
        for row in result:
            transactions.append({
                "id": row.get("transaction_id"),
                "amount": row.get("amount", 0),
                "fraud_type": "UNKNOWN",
                "confidence": row.get("fraud_score", 0),
                "timestamp": row.get("timestamp"),
                "status": "investigating"
            })
        
        return {
            "success": True,
            "data": transactions,
            "total": len(transactions),
            "limit": limit
        }
    except Exception as e:
        logger.error(f"Erreur transactions: {e}")
        return {
            "success": True,
            "data": [],
            "total": 0,
            "limit": limit
        }