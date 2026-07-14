from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from datetime import datetime
import random

router = APIRouter(prefix="/fallback", tags=["Fallback"])

@router.get("/fraud-insurance/claims")
async def get_fraud_claims():
    """Endpoint fallback pour fraud-insurance"""
    return {
        "claims": [],
        "total": 0,
        "message": "Module en développement"
    }

@router.get("/risk-scoring/policies")
async def get_risk_policies():
    """Endpoint fallback pour risk-scoring"""
    return {
        "policies": [],
        "total": 0,
        "message": "Module en développement"
    }

@router.get("/blockchain/stats")
async def get_blockchain_stats():
    """Endpoint fallback pour blockchain"""
    return {
        "total_blocks": 0,
        "total_transactions": 0,
        "network_hashrate": 0,
        "message": "Module en développement"
    }
