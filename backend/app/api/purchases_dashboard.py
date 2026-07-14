from fastapi import APIRouter, Depends, Query
from typing import List, Dict, Any
from datetime import datetime, timedelta
from app.database import get_db

router = APIRouter()

@router.get("/orders")
async def get_purchase_orders(
    date_from: str = None,
    date_to: str = None,
    db = Depends(get_db)
):
    # Retourner un tableau pour que .map fonctionne
    return []  # Retourne un tableau vide au lieu d'un objet

@router.get("/suppliers")
async def get_suppliers(db = Depends(get_db)):
    return []  # Retourne un tableau vide

@router.get("/dashboard/kpi")
async def get_purchases_kpi(db = Depends(get_db)):
    return {
        "total_orders": 0,
        "pending_orders": 0,
        "delivered_orders": 0,
        "monthly_spending": 0
    }

@router.get("/dashboard/supplier-stats")
async def get_supplier_stats(db = Depends(get_db)):
    return []  # Retourne un tableau vide
