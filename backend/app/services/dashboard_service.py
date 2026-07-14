from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta
from typing import List, Dict, Any
from app.models.sale import SaleOrder
from app.models.purchase import PurchaseOrder
from app.models.product import Product
from app.models.partner import Partner
from app.models.auth import User
import logging
logger = logging.getLogger(__name__)
class DashboardService:
    @staticmethod
    def get_kpis(db: Session, company_id: int) -> Dict[str, Any]:
        """Récupère les KPIs au format attendu par le frontend"""
        try:
            today = datetime.now()
            last_month = today - timedelta(days=30)
            two_months_ago = today - timedelta(days=60)
            
            # Chiffre d'affaires
            revenue_current = db.query(func.coalesce(func.sum(SaleOrder.amount_total), 0)).filter(
                SaleOrder.company_id == company_id,
                SaleOrder.created_at >= last_month
            ).scalar() or 0
            
            revenue_previous = db.query(func.coalesce(func.sum(SaleOrder.amount_total), 0)).filter(
                SaleOrder.company_id == company_id,
                SaleOrder.created_at < last_month,
                SaleOrder.created_at >= two_months_ago
            ).scalar() or 0
            
            revenue_trend = ((revenue_current - revenue_previous) / (revenue_previous or 1)) * 100
            
            # Nombre de commandes
            orders_current = db.query(func.count(SaleOrder.id)).filter(
                SaleOrder.company_id == company_id,
                SaleOrder.created_at >= last_month
            ).scalar() or 0
            
            orders_previous = db.query(func.count(SaleOrder.id)).filter(
                SaleOrder.company_id == company_id,
                SaleOrder.created_at < last_month,
                SaleOrder.created_at >= two_months_ago
            ).scalar() or 0
            
            orders_trend = ((orders_current - orders_previous) / (orders_previous or 1)) * 100
            
            # Nouveaux clients
            clients_current = db.query(func.count(Partner.id)).filter(
                Partner.company_id == company_id,
                Partner.created_at >= last_month
            ).scalar() or 0
            
            clients_previous = db.query(func.count(Partner.id)).filter(
                Partner.company_id == company_id,
                Partner.created_at < last_month,
                Partner.created_at >= two_months_ago
            ).scalar() or 0
            
            clients_trend = ((clients_current - clients_previous) / (clients_previous or 1)) * 100
            
            # Alertes
            low_stock = db.query(func.count(Product.id)).filter(
                Product.company_id == company_id,
                Product.quantity_on_hand < 10
            ).scalar() or 0
            
            expired_orders = db.query(func.count(PurchaseOrder.id)).filter(
                PurchaseOrder.company_id == company_id,
                PurchaseOrder.expected_date < today,
                PurchaseOrder.status != 'received'
            ).scalar() or 0
            
            alerts_trend = 5  # Valeur simulée
            
            return {
                "revenue": {
                    "total": float(revenue_current),
                    "trend": round(revenue_trend, 1),
                    "trend_up": revenue_trend >= 0
                },
                "orders": {
                    "total": orders_current,
                    "trend": round(orders_trend, 1),
                    "trend_up": orders_trend >= 0
                },
                "clients": {
                    "new": clients_current,
                    "trend": clients_current - clients_previous,
                    "trend_up": clients_trend >= 0
                },
                "alerts": {
                    "total": low_stock + expired_orders,
                    "critical": low_stock,
                    "warning": expired_orders,
                    "trend": alerts_trend,
                    "trend_up": alerts_trend < 0
                }
            }
        except Exception as e:
            logger.error(f"Erreur get_kpis: {e}")
            return {
                "revenue": {"total": 0, "trend": 0, "trend_up": True},
                "orders": {"total": 0, "trend": 0, "trend_up": True},
                "clients": {"new": 0, "trend": 0, "trend_up": True},
                "alerts": {"total": 0, "critical": 0, "warning": 0, "trend": 0, "trend_up": False}
            }
    
    @staticmethod
    def get_modules_status(db: Session, company_id: int) -> List[Dict[str, Any]]:
        """Récupère le statut des modules"""
        try:
            colors = {
                "Ventes": "#1890ff",
                "Achats": "#52c41a",
                "CRM": "#faad14",
                "Comptabilité": "#722ed1",
                "Stock": "#13c2c2",
                "RH": "#eb2f96"
            }
            
            total_sales = db.query(func.count(SaleOrder.id)).filter(SaleOrder.company_id == company_id).scalar() or 0
            total_products = db.query(func.count(Product.id)).filter(Product.company_id == company_id).scalar() or 0
            total_purchases = db.query(func.count(PurchaseOrder.id)).filter(PurchaseOrder.company_id == company_id).scalar() or 0
            total_users = db.query(func.count(User.id)).filter(User.company_id == company_id).scalar() or 0
            
            max_val = max(total_sales, total_products, total_purchases, total_users, 1)
            
            modules = [
                {
                    "name": "Ventes",
                    "progress": int((total_sales / max_val) * 100),
                    "color": colors["Ventes"],
                    "trend": "up",
                    "change": f"+{min(25, total_sales)}%"
                },
                {
                    "name": "Produits",
                    "progress": int((total_products / max_val) * 100),
                    "color": colors["Stock"],
                    "trend": "up" if total_products > 0 else "down",
                    "change": f"+{min(15, total_products)}%"
                },
                {
                    "name": "Achats",
                    "progress": int((total_purchases / max_val) * 100),
                    "color": colors["Achats"],
                    "trend": "up" if total_purchases > 0 else "down",
                    "change": f"+{min(20, total_purchases)}%"
                },
                {
                    "name": "Utilisateurs",
                    "progress": int((total_users / max_val) * 100),
                    "color": colors["RH"],
                    "trend": "up" if total_users > 0 else "down",
                    "change": f"+{min(10, total_users)}%"
                }
            ]
            
            return modules
        except Exception as e:
            logger.error(f"Erreur get_modules_status: {e}")
            return []
    
    @staticmethod
    def get_recent_activities(db: Session, company_id: int, limit: int = 10) -> List[Dict[str, Any]]:
        """Récupère les activités récentes"""
        try:
            activities = []
            
            recent_orders = db.query(SaleOrder).filter(
                SaleOrder.company_id == company_id
            ).order_by(desc(SaleOrder.created_at)).limit(limit).all()
            for order in recent_orders:
                activities.append({
                    "id": order.id,
                    "action": f"Commande {order.name}",
                    "user": order.user.username if order.user else "Système",
                    "amount": f"{order.amount_total:,.0f} €" if order.amount_total else "N/A",
                    "time": order.created_at.strftime("%H:%M") if order.created_at else "",
                    "status": "success",
                    "module": "ventes"
                })
            
            return activities
        except Exception as e:
            logger.error(f"Erreur get_recent_activities: {e}")
            return []
    
    @staticmethod
    def get_sales_chart_data(db: Session, company_id: int) -> List[Dict[str, Any]]:
        """Récupère les données du graphique"""
        try:
            today = datetime.now()
            data = []
            
            for i in range(5, -1, -1):
                month_date = today - timedelta(days=30 * i)
                month_start = datetime(month_date.year, month_date.month, 1)
                
                if month_date.month == 12:
                    month_end = datetime(month_date.year + 1, 1, 1)
                else:
                    month_end = datetime(month_date.year, month_date.month + 1, 1)
                
                total = db.query(func.coalesce(func.sum(SaleOrder.amount_total), 0)).filter(
                    SaleOrder.company_id == company_id,
                    SaleOrder.created_at >= month_start,
                    SaleOrder.created_at < month_end
                ).scalar() or 0
                
                data.append({
                    "month": month_start.strftime("%b"),
                    "ventes": float(total) / 1000  # En milliers
                })
            
            return data
        except Exception as e:
            logger.error(f"Erreur get_sales_chart_data: {e}")
            return []
    
    @staticmethod
    def get_alerts_count(db: Session, company_id: int) -> Dict[str, Any]:
        """Récupère le nombre d'alertes"""
        try:
            low_stock = db.query(func.count(Product.id)).filter(
                Product.company_id == company_id,
                Product.quantity_on_hand < 10
            ).scalar() or 0
            
            return {
                "total": low_stock,
                "critical": low_stock,
                "warning": 0,
                "info": 0
            }
        except Exception as e:
            logger.error(f"Erreur get_alerts_count: {e}")
            return {"total": 0, "critical": 0, "warning": 0, "info": 0}
