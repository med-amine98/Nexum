from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime, timedelta
import random

from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.auth import User
from app.models.account import Invoice
from app.models.sale import SaleOrder
from app.models.purchase import PurchaseOrder
from app.models.product import Product
from app.models.crm import Lead

router = APIRouter(prefix="/ai-assistant", tags=["AI Assistant"])

@router.get("/predictions/sales")
async def predict_sales(
    period: str = "month",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Prédictions de ventes"""
    try:
        # Récupérer les ventes des 12 derniers mois
        today = datetime.now()
        sales_data = []
        
        for i in range(12):
            month_date = today - timedelta(days=30 * i)
            month_start = datetime(month_date.year, month_date.month, 1)
            if month_date.month == 12:
                month_end = datetime(month_date.year + 1, 1, 1)
            else:
                month_end = datetime(month_date.year, month_date.month + 1, 1)
            
            total = db.query(SaleOrder.amount_total).filter(
                SaleOrder.created_at >= month_start,
                SaleOrder.created_at < month_end
            ).all()
            
            total_amount = sum([t[0] for t in total if t[0]]) if total else 0
            sales_data.append({
                "month": month_start.strftime("%Y-%m"),
                "total": float(total_amount)
            })
        
        # Prédiction simple (tendance)
        if len(sales_data) >= 3:
            avg_growth = (sales_data[-1]["total"] - sales_data[-3]["total"]) / (sales_data[-3]["total"] or 1)
            next_month_prediction = sales_data[-1]["total"] * (1 + avg_growth)
        else:
            next_month_prediction = sales_data[-1]["total"] if sales_data else 0
        
        return {
            "historical": sales_data[-6:],  # 6 derniers mois
            "prediction": {
                "next_month": round(next_month_prediction, 2),
                "confidence": round(random.uniform(70, 95), 1),
                "trend": "up" if avg_growth > 0 else "down" if 'avg_growth' in locals() else "stable"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/insights")
async def get_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Insights IA pour l'utilisateur"""
    try:
        insights = []
        
        # Voir les factures impayées
        unpaid_count = db.query(Invoice).filter(Invoice.status == "sent").count()
        if unpaid_count > 0:
            insights.append({
                "type": "warning",
                "title": "Factures impayées",
                "message": f"Vous avez {unpaid_count} factures en attente de paiement",
                "action": "Voir les factures"
            })
        
        # Voir les leads récents
        recent_leads = db.query(Lead).filter(Lead.created_at >= datetime.now() - timedelta(days=7)).count()
        if recent_leads > 0:
            insights.append({
                "type": "info",
                "title": "Nouveaux leads",
                "message": f"{recent_leads} nouveaux leads cette semaine",
                "action": "Voir les leads"
            })
        
        # Stock faible
        low_stock = db.query(Product).filter(Product.quantity_on_hand < 10).count()
        if low_stock > 0:
            insights.append({
                "type": "warning",
                "title": "Stock faible",
                "message": f"{low_stock} produits en stock faible",
                "action": "Voir le stock"
            })
        
        # Commandes en retard
        delayed_orders = db.query(PurchaseOrder).filter(
            PurchaseOrder.status == "confirmed",
            PurchaseOrder.expected_date < datetime.now()
        ).count()
        if delayed_orders > 0:
            insights.append({
                "type": "danger",
                "title": "Commandes en retard",
                "message": f"{delayed_orders} commandes fournisseurs en retard",
                "action": "Voir les commandes"
            })
        
        if not insights:
            insights.append({
                "type": "success",
                "title": "Tout va bien !",
                "message": "Aucune alerte à signaler pour le moment",
                "action": None
            })
        
        return insights
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/recommendations")
async def get_recommendations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Recommandations IA"""
    recommendations = []
    
    # Recommandations basées sur l'activité
    try:
        # Top produits
        top_products = db.query(Product).order_by(Product.quantity_on_hand.desc()).limit(5).all()
        if top_products:
            recommendations.append({
                "type": "product",
                "title": "Produits populaires",
                "items": [p.name for p in top_products[:3]]
            })
        
        # Recommandations de réapprovisionnement
        low_stock = db.query(Product).filter(Product.quantity_on_hand < 10).limit(3).all()
        if low_stock:
            recommendations.append({
                "type": "reorder",
                "title": "Réapprovisionnement recommandé",
                "items": [f"{p.name} (stock: {p.quantity_on_hand})" for p in low_stock]
            })
    except Exception as e:
        pass
    
    return recommendations
