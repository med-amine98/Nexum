from fastapi import APIRouter, Depends, Query
from typing import List, Dict, Any
from app.database import get_db

router = APIRouter()

@router.get("/dashboard")
async def get_predictions_dashboard(db = Depends(get_db)):
    return {
        "total_predictions": 0,
        "accuracy": 0.87,
        "last_updated": "2026-03-22",
        "sales_forecast": 125000,
        "risk_level": "low"
    }

@router.get("/sales")
async def get_sales_predictions(
    period: str = Query("month", regex="^(month|quarter|year)$"),
    limit: int = 12,
    db = Depends(get_db)
):
    return {
        "predictions": [
            {"date": "2026-04", "value": 12000},
            {"date": "2026-05", "value": 13500},
            {"date": "2026-06", "value": 14800}
        ],
        "confidence": 0.85,
        "period": period,
        "limit": limit,
        "total": 40300
    }
