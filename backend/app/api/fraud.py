from fastapi import APIRouter, Depends
from typing import List, Dict, Any
from app.database import get_db

router = APIRouter()

@router.get("/dashboard")
async def get_fraud_dashboard(db = Depends(get_db)):
    return {
        "total_detected": 0,
        "blocked": 0,
        "under_review": 0,
        "saved_amount": 0,
        "by_type": {"banking": 0, "insurance": 0}
    }

@router.get("/stats")
async def get_fraud_stats(db = Depends(get_db)):
    return {
        "total_detected": 0,
        "blocked": 0,
        "under_review": 0,
        "saved_amount": 0
    }
