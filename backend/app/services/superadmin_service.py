from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from typing import Dict, Any
from app.models.auth import User
from app.models.company import Company
from app.models.sale import SaleOrder
from app.models.purchase import PurchaseOrder

class SuperAdminService:
    @staticmethod
    def get_system_stats(db: Session) -> Dict[str, Any]:
        """Statistiques système pour le super admin"""
        total_users = db.query(func.count(User.id)).scalar() or 0
        total_companies = db.query(func.count(Company.id)).scalar() or 0
        total_orders = db.query(func.count(SaleOrder.id)).scalar() or 0
        total_purchases = db.query(func.count(PurchaseOrder.id)).scalar() or 0
        
        return {
            "total_users": total_users,
            "total_companies": total_companies,
            "total_orders": total_orders,
            "total_purchases": total_purchases,
            "system_health": "healthy",
            "last_check": datetime.now().isoformat()
        }
