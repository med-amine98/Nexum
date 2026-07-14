from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta
from typing import List, Dict, Any
from app.models.sale import SaleOrder
from app.models.purchase import PurchaseOrder
from app.models.product import Product
from app.models.crm import Lead
from app.models.account import Invoice

class InsightService:
    @staticmethod
    def get_insights(db: Session, user_id: int = None) -> List[Dict[str, Any]]:
        """Génère des insights pour l'utilisateur"""
        insights = []
        
        # Voir les leads récents
        recent_leads = db.query(Lead).filter(
            Lead.created_at >= datetime.now() - timedelta(days=7)
        ).count()
        if recent_leads > 0:
            insights.append({
                "type": "info",
                "title": "Nouveaux leads",
                "message": f"{recent_leads} nouveaux leads cette semaine"
            })
        
        # Voir les commandes récentes
        recent_orders = db.query(SaleOrder).filter(
            SaleOrder.created_at >= datetime.now() - timedelta(days=7)
        ).count()
        if recent_orders > 0:
            insights.append({
                "type": "success",
                "title": "Ventes récentes",
                "message": f"{recent_orders} commandes cette semaine"
            })
        
        # Stock faible
        low_stock = db.query(Product).filter(Product.quantity_on_hand < 10).count()
        if low_stock > 0:
            insights.append({
                "type": "warning",
                "title": "Stock faible",
                "message": f"{low_stock} produits en stock faible"
            })
        
        return insights
