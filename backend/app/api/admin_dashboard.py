from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta
from typing import Dict, Any

from app.database import get_db
from app.core.dependencies import get_current_super_admin
from app.models.auth import User
from app.models.company import Company
from app.models.sale import SaleOrder
from app.models.purchase import PurchaseOrder
from app.models.product import Product
from app.models.crm import Lead
from app.models.account import Invoice

router = APIRouter(prefix="/admin/dashboard", tags=["Admin Dashboard"])

@router.get("/stats")
async def get_admin_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_super_admin)
):
    """Statistiques pour le dashboard admin"""
    try:
        today = datetime.now()
        first_day_month = today.replace(day=1)
        
        # Statistiques générales
        total_companies = db.query(func.count(Company.id)).scalar() or 0
        total_users = db.query(func.count(User.id)).scalar() or 0
        total_products = db.query(func.count(Product.id)).scalar() or 0
        
        # Ventes du mois
        monthly_sales = db.query(func.coalesce(func.sum(SaleOrder.amount_total), 0)).filter(
            SaleOrder.created_at >= first_day_month
        ).scalar() or 0
        
        # Achats du mois
        monthly_purchases = db.query(func.coalesce(func.sum(PurchaseOrder.amount_total), 0)).filter(
            PurchaseOrder.created_at >= first_day_month
        ).scalar() or 0
        
        # Leads du mois
        monthly_leads = db.query(func.count(Lead.id)).filter(
            Lead.created_at >= first_day_month
        ).scalar() or 0
        
        # Factures impayées
        unpaid_invoices = db.query(func.count(Invoice.id)).filter(
            Invoice.status == "sent"
        ).scalar() or 0
        
        return {
            "total_companies": total_companies,
            "total_users": total_users,
            "total_products": total_products,
            "monthly_sales": float(monthly_sales),
            "monthly_purchases": float(monthly_purchases),
            "monthly_leads": monthly_leads,
            "unpaid_invoices": unpaid_invoices,
            "profit_margin": round(((monthly_sales - monthly_purchases) / (monthly_sales or 1)) * 100, 1)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/activity")
async def get_activity_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_super_admin)
):
    """Résumé d'activité"""
    try:
        today = datetime.now()
        week_ago = today - timedelta(days=7)
        
        # Activités récentes
        new_users = db.query(func.count(User.id)).filter(User.created_at >= week_ago).scalar() or 0
        new_companies = db.query(func.count(Company.id)).filter(Company.created_at >= week_ago).scalar() or 0
        new_orders = db.query(func.count(SaleOrder.id)).filter(SaleOrder.created_at >= week_ago).scalar() or 0
        new_leads = db.query(func.count(Lead.id)).filter(Lead.created_at >= week_ago).scalar() or 0
        
        return {
            "new_users": new_users,
            "new_companies": new_companies,
            "new_orders": new_orders,
            "new_leads": new_leads,
            "period": "last_7_days"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
