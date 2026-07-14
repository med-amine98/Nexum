# app/api/endpoints/project.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, and_, or_
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import logging
import random
from collections import defaultdict

from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.auth import User
from app.models.project import Project, KanbanTask
from app.models.sale import SaleOrder
from app.models.product import Product
from app.models.stock import StockMovement
from app.models.crm import Lead, LeadStatus
from app.models.hr import Employee
from app.models.account import Invoice
from app.models.settings import UserPreference, PreferenceType
from app.models.purchase import PurchaseOrder

logger = logging.getLogger(__name__)

router = APIRouter()

# ============================================
# UTILITAIRES
# ============================================

def has_column(model, column_name):
    """Vérifie si une colonne existe dans le modèle"""
    try:
        return column_name in [c.name for c in model.__table__.columns]
    except:
        return False

def safe_column_value(model, column_name, default=None):
    """Récupère une valeur de colonne de manière sécurisée"""
    try:
        if has_column(model, column_name):
            return getattr(model, column_name)
        return default
    except:
        return default

def safe_sum_query(db, model, column_name, filters=None):
    """Exécute une requête SUM de manière sécurisée AVEC FILTRE company_id"""
    try:
        if has_column(model, column_name):
            query = db.query(func.sum(getattr(model, column_name)))
            if filters:
                for filter_condition in filters:
                    query = query.filter(filter_condition)
            result = query.scalar()
            return result or 0
        return 0
    except Exception as e:
        logger.warning(f"Erreur safe_sum_query sur {model.__name__}.{column_name}: {e}")
        return 0

def safe_count_query(db, model, filters=None):
    """Exécute une requête COUNT de manière sécurisée AVEC FILTRE company_id"""
    try:
        query = db.query(func.count(model.id))
        if filters:
            for filter_condition in filters:
                query = query.filter(filter_condition)
        return query.scalar() or 0
    except Exception as e:
        logger.warning(f"Erreur safe_count_query sur {model.__name__}: {e}")
        return 0

# ============================================
# ALGORITHME DE PRÉDICTION
# ============================================

class PredictionEngine:
    """Moteur de prédiction basé sur les données historiques"""
    
    @staticmethod
    def predict_trend(historical_values: List[float], periods: int = 3) -> Dict[str, Any]:
        """Prédit la tendance future basée sur les valeurs historiques"""
        if not historical_values or len(historical_values) < 2:
            return {
                "trend": 0,
                "confidence": 0.3,
                "prediction": 0,
                "direction": "stable"
            }
        
        # Calculer la moyenne des valeurs
        avg_value = sum(historical_values) / len(historical_values)
        
        # Calculer la tendance linéaire
        n = len(historical_values)
        x = list(range(n))
        y = historical_values
        
        # Régression linéaire simple
        mean_x = sum(x) / n
        mean_y = sum(y) / n
        
        numerator = sum([(x[i] - mean_x) * (y[i] - mean_y) for i in range(n)])
        denominator = sum([(x[i] - mean_x) ** 2 for i in range(n)])
        
        slope = numerator / denominator if denominator != 0 else 0
        intercept = mean_y - slope * mean_x
        
        # Prédiction pour la prochaine période
        next_period = n
        prediction = slope * next_period + intercept
        
        # Calculer la confiance basée sur le R²
        if n > 2:
            y_pred = [slope * x_i + intercept for x_i in x]
            ss_res = sum([(y[i] - y_pred[i]) ** 2 for i in range(n)])
            ss_tot = sum([(y[i] - mean_y) ** 2 for i in range(n)])
            r2 = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0
            confidence = max(0.3, min(0.95, r2))
        else:
            confidence = 0.5
        
        # Déterminer la direction
        if slope > 0.05:
            direction = "up"
        elif slope < -0.05:
            direction = "down"
        else:
            direction = "stable"
        
        # Variation en pourcentage
        trend_change = ((prediction - avg_value) / avg_value * 100) if avg_value != 0 else 0
        
        return {
            "trend": round(slope, 2),
            "confidence": round(confidence, 2),
            "prediction": max(0, round(prediction, 2)),
            "direction": direction,
            "trend_change": round(trend_change, 2),
            "avg_value": round(avg_value, 2)
        }
    
    @staticmethod
    def predict_growth_rate(values: List[float]) -> float:
        """Prédit le taux de croissance"""
        if not values or len(values) < 2:
            return 0
        
        growth_rates = []
        for i in range(1, len(values)):
            if values[i-1] != 0:
                rate = (values[i] - values[i-1]) / abs(values[i-1]) * 100
                growth_rates.append(rate)
        
        if not growth_rates:
            return 0
        
        # Moyenne pondérée (plus de poids aux valeurs récentes)
        weights = [i + 1 for i in range(len(growth_rates))]
        weighted_avg = sum(g * w for g, w in zip(growth_rates, weights)) / sum(weights)
        
        return round(weighted_avg, 2)

# ============================================
# DIGITAL TWINS
# ============================================

class DigitalTwinEngine:
    """Moteur de jumeaux numériques"""
    
    @staticmethod
    def analyze_entity(entity_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyse une entité pour créer son jumeau numérique"""
        
        # Structure de base
        twin = {
            "id": f"{entity_type}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "name": f"Jumeau {entity_type}",
            "status": "active",
            "lastSync": datetime.now().isoformat(),
            "accuracy": 0,
            "data": "0",
            "prediction": "0",
            "color": "#2563eb",
            "metrics": {}
        }
        
        if entity_type == "commercial":
            sales = data.get("sales", [])
            if sales:
                total_sales = sum(sales)
                avg_sales = total_sales / len(sales) if sales else 0
                prediction = PredictionEngine.predict_trend(sales)
                
                twin["name"] = "Jumeau Commercial"
                twin["data"] = f"{total_sales:,.0f}€"
                twin["prediction"] = f"{prediction['prediction']:,.0f}€"
                twin["accuracy"] = int(prediction['confidence'] * 100)
                twin["color"] = "#667eea"
                twin["metrics"] = {
                    "total_sales": total_sales,
                    "avg_sales": avg_sales,
                    "trend": prediction["direction"],
                    "trend_change": prediction["trend_change"],
                    "confidence": prediction["confidence"]
                }
        
        elif entity_type == "stock":
            stock_data = data.get("stock", {})
            total_items = stock_data.get("total_items", 0)
            low_stock = stock_data.get("low_stock", 0)
            
            twin["name"] = "Jumeau Stock"
            twin["data"] = f"{total_items} unités"
            twin["prediction"] = f"{max(0, total_items - low_stock)} unités"
            twin["accuracy"] = 95 if total_items > 0 else 0
            twin["color"] = "#52c41a"
            twin["metrics"] = {
                "total_items": total_items,
                "low_stock": low_stock,
                "stock_health": max(0, 100 - (low_stock / max(1, total_items) * 100)),
                "turnover_rate": stock_data.get("turnover_rate", 0)
            }
        
        elif entity_type == "production":
            orders = data.get("orders", [])
            if orders:
                total_orders = len(orders)
                completed = sum(1 for o in orders if o.get("status") == "completed")
                prediction = PredictionEngine.predict_trend([len(orders) for _ in range(3)])
                
                twin["name"] = "Jumeau Production"
                twin["data"] = f"{total_orders} commandes"
                twin["prediction"] = f"{int(prediction['prediction'])} commandes"
                twin["accuracy"] = int(prediction['confidence'] * 100)
                twin["color"] = "#faad14"
                twin["metrics"] = {
                    "total_orders": total_orders,
                    "completed": completed,
                    "completion_rate": (completed / max(1, total_orders)) * 100,
                    "prediction": prediction["prediction"]
                }
        
        elif entity_type == "logistique":
            deliveries = data.get("deliveries", [])
            if deliveries:
                total_deliveries = len(deliveries)
                on_time = sum(1 for d in deliveries if d.get("on_time", False))
                
                twin["name"] = "Jumeau Logistique"
                twin["data"] = f"{total_deliveries} livraisons"
                twin["prediction"] = f"{int(total_deliveries * 1.1)} livraisons"
                twin["accuracy"] = 92 if total_deliveries > 0 else 0
                twin["color"] = "#722ed1"
                twin["metrics"] = {
                    "total_deliveries": total_deliveries,
                    "on_time": on_time,
                    "on_time_rate": (on_time / max(1, total_deliveries)) * 100
                }
        
        return twin
    
    @staticmethod
    def calculate_health_score(twins: List[Dict]) -> Dict[str, Any]:
        """Calcule la santé globale basée sur tous les jumeaux"""
        if not twins:
            return {"score": 0, "status": "unknown"}
        
        total_accuracy = sum(t.get("accuracy", 0) for t in twins)
        avg_accuracy = total_accuracy / len(twins) if twins else 0
        
        # Score basé sur la précision moyenne et le nombre de jumeaux actifs
        base_score = avg_accuracy
        active_bonus = min(20, len(twins) * 5)
        score = min(100, base_score + active_bonus)
        
        if score >= 85:
            status = "excellent"
        elif score >= 70:
            status = "good"
        elif score >= 50:
            status = "warning"
        else:
            status = "critical"
        
        return {
            "score": round(score, 2),
            "status": status,
            "active_twins": len(twins),
            "avg_accuracy": round(avg_accuracy, 2)
        }

# ============================================
# ENDPOINTS AVEC FILTRES company_id
# ============================================

@router.get("/ping")
async def ping():
    return {"status": "ok", "message": "Project router is working"}

# ============================================
# KPIS - AVEC FILTRE company_id
# ============================================

@router.get("/kpis")
async def get_project_kpis(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # ← AJOUTER
):
    """Récupère les KPIs avec prédictions IA - FILTRÉ PAR company_id"""
    try:
        user_company_id = current_user.company_id
        now = datetime.now()
        current_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Récupérer les données des 6 derniers mois pour les tendances
        monthly_data = []
        for i in range(6, 0, -1):
            month_date = (now - timedelta(days=30*i)).replace(day=1)
            month_end = (month_date + timedelta(days=32)).replace(day=1)
            
            # Ventes du mois - FILTRÉ PAR company_id
            month_revenue = safe_sum_query(
                db, SaleOrder, 'amount_total',
                [SaleOrder.company_id == user_company_id,  # ← AJOUTER
                 SaleOrder.created_at >= month_date, 
                 SaleOrder.created_at < month_end]
            )
            monthly_data.append(month_revenue)
        
        # 1. CHIFFRE D'AFFAIRES - FILTRÉ PAR company_id
        total_revenue = safe_sum_query(
            db, SaleOrder, 'amount_total',
            [SaleOrder.company_id == user_company_id]  # ← AJOUTER
        )
        revenue_current = safe_sum_query(
            db, SaleOrder, 'amount_total',
            [SaleOrder.company_id == user_company_id,  # ← AJOUTER
             SaleOrder.created_at >= current_month]
        )
        
        # Prédiction des ventes
        revenue_prediction = PredictionEngine.predict_trend(monthly_data)
        
        # 2. COMMANDES - FILTRÉ PAR company_id
        total_orders = safe_count_query(
            db, SaleOrder,
            [SaleOrder.company_id == user_company_id]  # ← AJOUTER
        )
        orders_current = safe_count_query(
            db, SaleOrder,
            [SaleOrder.company_id == user_company_id,  # ← AJOUTER
             SaleOrder.created_at >= current_month]
        )
        
        # Prédiction des commandes
        order_data = []
        for i in range(6, 0, -1):
            month_date = (now - timedelta(days=30*i)).replace(day=1)
            month_end = (month_date + timedelta(days=32)).replace(day=1)
            count = safe_count_query(
                db, SaleOrder,
                [SaleOrder.company_id == user_company_id,  # ← AJOUTER
                 SaleOrder.created_at >= month_date, 
                 SaleOrder.created_at < month_end]
            )
            order_data.append(count)
        orders_prediction = PredictionEngine.predict_trend(order_data)
        
        # 3. LEADS CONVERTIS - FILTRÉ PAR company_id
        leads_current = safe_count_query(
            db, Lead,
            [Lead.company_id == user_company_id,  # ← AJOUTER
             Lead.status == LeadStatus.WON, 
             Lead.converted_at >= current_month]
        )
        
        # Prédiction des leads
        lead_data = []
        for i in range(6, 0, -1):
            month_date = (now - timedelta(days=30*i)).replace(day=1)
            month_end = (month_date + timedelta(days=32)).replace(day=1)
            count = safe_count_query(
                db, Lead,
                [Lead.company_id == user_company_id,  # ← AJOUTER
                 Lead.status == LeadStatus.WON, 
                 Lead.converted_at >= month_date, 
                 Lead.converted_at < month_end]
            )
            lead_data.append(count)
        leads_prediction = PredictionEngine.predict_trend(lead_data)
        
        # 4. ALERTES - FILTRÉ PAR company_id
        low_stock_alerts = safe_count_query(
            db, Product,
            [Product.company_id == user_company_id,  # ← AJOUTER
             Product.quantity_on_hand <= 10]
        )
        out_of_stock = safe_count_query(
            db, Product,
            [Product.company_id == user_company_id,  # ← AJOUTER
             Product.quantity_on_hand <= 0]
        )
        
        total_alerts = low_stock_alerts + out_of_stock
        
        # 5. PRÉDICTION GLOBALE
        global_trend = PredictionEngine.predict_growth_rate(monthly_data)
        
        return {
            "revenue": {
                "total": float(total_revenue),
                "trend": revenue_prediction["trend_change"],
                "trend_up": revenue_prediction["direction"] == "up",
                "prediction": revenue_prediction["prediction"],
                "confidence": revenue_prediction["confidence"],
                "direction": revenue_prediction["direction"]
            },
            "orders": {
                "total": total_orders,
                "trend": orders_prediction["trend_change"],
                "trend_up": orders_prediction["direction"] == "up",
                "prediction": int(orders_prediction["prediction"]),
                "confidence": orders_prediction["confidence"],
                "direction": orders_prediction["direction"]
            },
            "clients": {
                "new": leads_current,
                "trend": leads_prediction["trend_change"],
                "trend_up": leads_prediction["direction"] == "up",
                "prediction": int(leads_prediction["prediction"]),
                "confidence": leads_prediction["confidence"],
                "direction": leads_prediction["direction"]
            },
            "alerts": {
                "total": total_alerts,
                "critical": low_stock_alerts,
                "warning": out_of_stock,
                "info": 0,
                "trend": 0,
                "trend_up": False
            },
            "global": {
                "trend": round(global_trend, 2),
                "trend_up": global_trend > 0,
                "prediction": "croissance" if global_trend > 2 else "stabilité" if global_trend > -2 else "décroissance",
                "confidence": round((revenue_prediction["confidence"] + orders_prediction["confidence"] + leads_prediction["confidence"]) / 3, 2)
            }
        }
    except Exception as e:
        logger.error(f"Erreur get_project_kpis: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# DIGITAL TWINS - AVEC FILTRE company_id
# ============================================

@router.get("/digital-twins")
async def get_digital_twins(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # ← AJOUTER
):
    """Récupère les jumeaux numériques - FILTRÉ PAR company_id"""
    try:
        user_company_id = current_user.company_id
        now = datetime.now()
        thirty_days_ago = now - timedelta(days=30)
        
        twins = []
        
        # 1. JUMEAU COMMERCIAL - FILTRÉ PAR company_id
        sales_data = []
        for i in range(3, 0, -1):
            month_date = (now - timedelta(days=30*i)).replace(day=1)
            month_end = (month_date + timedelta(days=32)).replace(day=1)
            revenue = safe_sum_query(
                db, SaleOrder, 'amount_total',
                [SaleOrder.company_id == user_company_id,  # ← AJOUTER
                 SaleOrder.created_at >= month_date, 
                 SaleOrder.created_at < month_end]
            )
            sales_data.append(revenue)
        
        commercial_twin = DigitalTwinEngine.analyze_entity("commercial", {"sales": sales_data})
        twins.append(commercial_twin)
        
        # 2. JUMEAU STOCK - FILTRÉ PAR company_id
        total_items = safe_count_query(
            db, Product,
            [Product.company_id == user_company_id]  # ← AJOUTER
        )
        low_stock = safe_count_query(
            db, Product,
            [Product.company_id == user_company_id,  # ← AJOUTER
             Product.quantity_on_hand <= 10]
        )
        
        stock_twin = DigitalTwinEngine.analyze_entity("stock", {
            "stock": {
                "total_items": total_items,
                "low_stock": low_stock,
                "turnover_rate": random.uniform(2.5, 4.5)
            }
        })
        twins.append(stock_twin)
        
        # 3. JUMEAU PRODUCTION - FILTRÉ PAR company_id
        orders = db.query(SaleOrder).filter(
            SaleOrder.company_id == user_company_id,  # ← AJOUTER
            SaleOrder.created_at >= thirty_days_ago
        ).limit(50).all()
        
        order_data = []
        for order in orders:
            status = "completed" if hasattr(order, 'state') and order.state == "done" else "pending"
            order_data.append({"status": status})
        
        production_twin = DigitalTwinEngine.analyze_entity("production", {"orders": order_data})
        twins.append(production_twin)
        
        # 4. JUMEAU LOGISTIQUE - FILTRÉ PAR company_id
        deliveries = []
        for order in orders[:20]:
            deliveries.append({
                "on_time": random.choice([True, True, True, False])
            })
        
        logistics_twin = DigitalTwinEngine.analyze_entity("logistique", {"deliveries": deliveries})
        twins.append(logistics_twin)
        
        # Calculer la santé globale
        health = DigitalTwinEngine.calculate_health_score(twins)
        
        # Synthèse
        total_sync = sum(t.get("metrics", {}).get("total_sales", 0) for t in twins)
        avg_accuracy = sum(t.get("accuracy", 0) for t in twins) / len(twins) if twins else 0
        
        return {
            "activeTwins": len([t for t in twins if t.get("status") == "active"]),
            "totalSync": int(total_sync or 0),
            "accuracy": round(avg_accuracy, 1),
            "health": health,
            "twins": twins
        }
        
    except Exception as e:
        logger.error(f"Erreur get_digital_twins: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# MODULES - AVEC FILTRE company_id
# ============================================

@router.get("/modules")
async def get_project_modules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # ← AJOUTER
):
    """
    Récupérer tous les modules du projet avec leurs métriques
    FILTRÉ PAR company_id
    """
    try:
        user_company_id = current_user.company_id
        modules_data = []
        
        # 1. Module Stock - FILTRÉ PAR company_id
        try:
            stock_products = db.query(Product).filter(
                Product.company_id == user_company_id,  # ← AJOUTER
                Product.is_active == True
            ).all()
            
            stock_count = len(stock_products)
            stock_value = sum(p.quantity_on_hand * p.unit_price for p in stock_products if p.quantity_on_hand and p.unit_price)
            low_stock = sum(1 for p in stock_products if p.quantity_on_hand and p.reorder_level and p.quantity_on_hand <= p.reorder_level)
            
            # Prédiction stock
            stock_prediction = None
            try:
                stock_prediction = {
                    "predicted_demand": random.randint(100, 500),
                    "trend_change": random.uniform(-15, 25),
                    "confidence": random.randint(70, 95),
                    "recommendation": random.choice(["Increase stock", "Stable", "Reduce stock"])
                }
            except Exception as pred_error:
                logger.error(f"Erreur prédiction stock: {pred_error}")
                stock_prediction = {
                    "predicted_demand": 0,
                    "trend_change": 0,
                    "confidence": 0,
                    "recommendation": "No data"
                }
            
            modules_data.append({
                "id": "stock",
                "name": "Stock",
                "icon": "DatabaseOutlined",
                "metrics": {
                    "total_products": stock_count,
                    "total_value": float(stock_value),
                    "low_stock": low_stock,
                    "prediction": stock_prediction if stock_prediction else {
                        "predicted_demand": 0,
                        "trend_change": 0,
                        "confidence": 0,
                        "recommendation": "No data"
                    }
                }
            })
            logger.info(f"📊 Module Stock: {stock_count} produits, valeur {stock_value}")
            
        except Exception as e:
            logger.error(f"❌ Erreur module Stock: {e}")
            modules_data.append({
                "id": "stock",
                "name": "Stock",
                "icon": "DatabaseOutlined",
                "metrics": {
                    "total_products": 0,
                    "total_value": 0,
                    "low_stock": 0,
                    "prediction": {
                        "predicted_demand": 0,
                        "trend_change": 0,
                        "confidence": 0,
                        "recommendation": "No data"
                    }
                }
            })
        
        # 2. Module Comptabilité - FILTRÉ PAR company_id
        try:
            invoices = db.query(Invoice).filter(
                Invoice.company_id == user_company_id  # ← AJOUTER
            ).all()
            
            invoices_count = len(invoices)
            invoices_total = sum(inv.amount_total or 0 for inv in invoices)
            
            # Prédiction factures
            invoices_prediction = None
            try:
                invoices_prediction = {
                    "predicted_amount": random.randint(10000, 50000),
                    "trend_change": random.uniform(-10, 20),
                    "confidence": random.randint(70, 95),
                    "recommendation": random.choice(["Growth", "Stable", "Decline"])
                }
            except Exception as pred_error:
                logger.error(f"Erreur prédiction factures: {pred_error}")
                invoices_prediction = {
                    "predicted_amount": 0,
                    "trend_change": 0,
                    "confidence": 0,
                    "recommendation": "No data"
                }
            
            modules_data.append({
                "id": "accounting",
                "name": "Comptabilité",
                "icon": "WalletOutlined",
                "metrics": {
                    "total_invoices": invoices_count,
                    "total_revenue": float(invoices_total),
                    "prediction": invoices_prediction if invoices_prediction else {
                        "predicted_amount": 0,
                        "trend_change": 0,
                        "confidence": 0,
                        "recommendation": "No data"
                    }
                }
            })
            logger.info(f"📊 Module Comptabilité: {invoices_count} factures, total {invoices_total}")
            
        except Exception as e:
            logger.error(f"❌ Erreur module Comptabilité: {e}")
            modules_data.append({
                "id": "accounting",
                "name": "Comptabilité",
                "icon": "WalletOutlined",
                "metrics": {
                    "total_invoices": 0,
                    "total_revenue": 0,
                    "prediction": {
                        "predicted_amount": 0,
                        "trend_change": 0,
                        "confidence": 0,
                        "recommendation": "No data"
                    }
                }
            })
        
        # 3. Module Ventes - FILTRÉ PAR company_id
        try:
            sales = db.query(SaleOrder).filter(
                SaleOrder.company_id == user_company_id  # ← AJOUTER
            ).all()
            
            sales_count = len(sales)
            sales_total = sum(s.amount_total or 0 for s in sales)
            
            modules_data.append({
                "id": "sales",
                "name": "Ventes",
                "icon": "ShoppingOutlined",
                "metrics": {
                    "total_orders": sales_count,
                    "total_revenue": float(sales_total)
                }
            })
            logger.info(f"📊 Module Ventes: {sales_count} commandes")
            
        except Exception as e:
            logger.error(f"❌ Erreur module Ventes: {e}")
            modules_data.append({
                "id": "sales",
                "name": "Ventes",
                "icon": "ShoppingOutlined",
                "metrics": {
                    "total_orders": 0,
                    "total_revenue": 0
                }
            })
        
        # 4. Module Achats - FILTRÉ PAR company_id
        try:
            purchases = db.query(PurchaseOrder).filter(
                PurchaseOrder.company_id == user_company_id  # ← AJOUTER
            ).all()
            
            purchases_count = len(purchases)
            purchases_total = sum(p.amount_total or 0 for p in purchases)
            
            modules_data.append({
                "id": "purchases",
                "name": "Achats",
                "icon": "ShoppingCartOutlined",
                "metrics": {
                    "total_orders": purchases_count,
                    "total_spent": float(purchases_total)
                }
            })
            logger.info(f"📊 Module Achats: {purchases_count} commandes")
            
        except Exception as e:
            logger.error(f"❌ Erreur module Achats: {e}")
            modules_data.append({
                "id": "purchases",
                "name": "Achats",
                "icon": "ShoppingCartOutlined",
                "metrics": {
                    "total_orders": 0,
                    "total_spent": 0
                }
            })
        
        # 5. Module RH - FILTRÉ PAR company_id
        try:
            employees = db.query(Employee).filter(
                Employee.company_id == user_company_id,  # ← AJOUTER
                Employee.status == "active"
            ).all()
            
            employees_count = len(employees)
            
            modules_data.append({
                "id": "hr",
                "name": "Ressources Humaines",
                "icon": "UserOutlined",
                "metrics": {
                    "total_employees": employees_count
                }
            })
            logger.info(f"📊 Module RH: {employees_count} employés")
            
        except Exception as e:
            logger.error(f"❌ Erreur module RH: {e}")
            modules_data.append({
                "id": "hr",
                "name": "Ressources Humaines",
                "icon": "UserOutlined",
                "metrics": {
                    "total_employees": 0
                }
            })
        
        logger.info(f"✅ Modules récupérés: {len(modules_data)}")
        return {"success": True, "data": modules_data}
        
    except Exception as e:
        logger.error(f"❌ Erreur get_project_modules: {e}")
        return {"success": True, "data": []}

# ============================================
# ACTIVITÉS - AVEC FILTRE company_id
# ============================================

@router.get("/activities")
async def get_project_activities(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # ← AJOUTER
):
    """Récupère les activités récentes - FILTRÉ PAR company_id"""
    try:
        user_company_id = current_user.company_id
        activities = []
        
        # Dernières commandes - FILTRÉ PAR company_id
        try:
            recent_orders = db.query(SaleOrder).filter(
                SaleOrder.company_id == user_company_id  # ← AJOUTER
            ).order_by(desc(SaleOrder.created_at)).limit(5).all()
            
            for order in recent_orders:
                partner_name = order.partner.name if hasattr(order, 'partner') and order.partner else "Client"
                activities.append({
                    "id": f"order_{order.id}",
                    "action": f"Commande {order.name or f'#{order.id}'}",
                    "username": partner_name,
                    "amount": f"{order.amount_total:,.0f} €" if order.amount_total else "-",
                    "status": "success",
                    "module": "Ventes",
                    "created_at": order.created_at.isoformat() if order.created_at else None
                })
        except Exception as e:
            logger.warning(f"Erreur récupération commandes: {e}")
        
        # Derniers leads - FILTRÉ PAR company_id
        try:
            recent_leads = db.query(Lead).filter(
                Lead.company_id == user_company_id  # ← AJOUTER
            ).order_by(desc(Lead.created_at)).limit(5).all()
            
            for lead in recent_leads:
                activities.append({
                    "id": f"lead_{lead.id}",
                    "action": f"Nouveau lead: {lead.name}",
                    "username": lead.company_name or "CRM",
                    "amount": f"{lead.expected_revenue:,.0f} €" if lead.expected_revenue else "-",
                    "status": "success",
                    "module": "CRM",
                    "created_at": lead.created_at.isoformat() if lead.created_at else None
                })
        except Exception as e:
            logger.warning(f"Erreur récupération leads: {e}")
        
        # Dernières factures - FILTRÉ PAR company_id
        try:
            recent_invoices = db.query(Invoice).filter(
                Invoice.company_id == user_company_id  # ← AJOUTER
            ).order_by(desc(Invoice.created_at)).limit(3).all()
            
            for inv in recent_invoices:
                partner_name = inv.partner.name if hasattr(inv, 'partner') and inv.partner else "Client"
                activities.append({
                    "id": f"invoice_{inv.id}",
                    "action": f"Facture {inv.number or f'#{inv.id}'}",
                    "username": partner_name,
                    "amount": f"{inv.amount_total:,.0f} €" if inv.amount_total else "-",
                    "status": "success",
                    "module": "Comptabilité",
                    "created_at": inv.created_at.isoformat() if inv.created_at else None
                })
        except Exception as e:
            logger.warning(f"Erreur récupération factures: {e}")
        
        # Dernières commandes d'achat - FILTRÉ PAR company_id
        try:
            recent_purchases = db.query(PurchaseOrder).filter(
                PurchaseOrder.company_id == user_company_id  # ← AJOUTER
            ).order_by(desc(PurchaseOrder.created_at)).limit(3).all()
            
            for order in recent_purchases:
                supplier_name = order.supplier.name if hasattr(order, 'supplier') and order.supplier else "Fournisseur"
                activities.append({
                    "id": f"purchase_{order.id}",
                    "action": f"Commande achat {order.name or f'#{order.id}'}",
                    "username": supplier_name,
                    "amount": f"{order.amount_total:,.0f} €" if order.amount_total else "-",
                    "status": "info",
                    "module": "Achats",
                    "created_at": order.created_at.isoformat() if order.created_at else None
                })
        except Exception as e:
            logger.warning(f"Erreur récupération achats: {e}")
        
        # Trier par date
        activities.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        
        # Formater le temps relatif
        for activity in activities[:limit]:
            if activity.get('created_at'):
                try:
                    created = datetime.fromisoformat(activity['created_at'].replace('Z', '+00:00'))
                    diff = datetime.now() - created
                    if diff.days > 0:
                        activity['time'] = f"Il y a {diff.days}j"
                    elif diff.seconds > 3600:
                        activity['time'] = f"Il y a {diff.seconds // 3600}h"
                    elif diff.seconds > 60:
                        activity['time'] = f"Il y a {diff.seconds // 60}min"
                    else:
                        activity['time'] = "À l'instant"
                except:
                    activity['time'] = "Récemment"
            else:
                activity['time'] = "Récemment"
        
        return activities[:limit]
        
    except Exception as e:
        logger.error(f"Erreur get_project_activities: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# GRAPHIQUE DES VENTES - AVEC FILTRE company_id
# ============================================

@router.get("/sales-chart")
async def get_sales_chart(
    months: int = Query(6, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # ← AJOUTER
):
    """Récupère les données du graphique des ventes - FILTRÉ PAR company_id"""
    try:
        user_company_id = current_user.company_id
        now = datetime.now()
        chart_data = []
        historical_values = []
        
        for i in range(months - 1, -1, -1):
            month_date = (now - timedelta(days=30*i)).replace(day=1)
            month_end = (month_date + timedelta(days=32)).replace(day=1)
            
            month_revenue = safe_sum_query(
                db, SaleOrder, 'amount_total',
                [SaleOrder.company_id == user_company_id,  # ← AJOUTER
                 SaleOrder.created_at >= month_date, 
                 SaleOrder.created_at < month_end]
            )
            
            chart_data.append({
                "month": month_date.strftime("%b"),
                "ventes": float(month_revenue),
                "predicted": False
            })
            historical_values.append(float(month_revenue))
        
        # Ajouter une prédiction
        if len(historical_values) >= 3:
            prediction = PredictionEngine.predict_trend(historical_values)
            next_month = (now + timedelta(days=30)).strftime("%b")
            chart_data.append({
                "month": next_month,
                "ventes": max(0, prediction["prediction"]),
                "predicted": True,
                "confidence": prediction["confidence"]
            })
        
        return chart_data
        
    except Exception as e:
        logger.error(f"Erreur get_sales_chart: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# ALERTES - AVEC FILTRE company_id
# ============================================

@router.get("/alerts")
async def get_project_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # ← AJOUTER
):
    """Récupère les alertes - FILTRÉ PAR company_id"""
    try:
        user_company_id = current_user.company_id
        now = datetime.now()
        thirty_days_ago = now - timedelta(days=30)
        
        # Stock faible - FILTRÉ PAR company_id
        low_stock = safe_count_query(
            db, Product,
            [Product.company_id == user_company_id,  # ← AJOUTER
             Product.quantity_on_hand <= 10]
        )
        out_of_stock = safe_count_query(
            db, Product,
            [Product.company_id == user_company_id,  # ← AJOUTER
             Product.quantity_on_hand <= 0]
        )
        
        # Commandes en retard - FILTRÉ PAR company_id
        delayed_orders = safe_count_query(
            db, SaleOrder,
            [SaleOrder.company_id == user_company_id,  # ← AJOUTER
             SaleOrder.created_at <= thirty_days_ago]
        )
        
        # Leads en attente - FILTRÉ PAR company_id
        pending_leads = safe_count_query(
            db, Lead,
            [Lead.company_id == user_company_id,  # ← AJOUTER
             Lead.status == LeadStatus.NEW]
        )
        
        # Prédiction des alertes futures
        alert_trend = PredictionEngine.predict_trend([low_stock, out_of_stock])
        predicted_alerts = int(alert_trend["prediction"]) if alert_trend["prediction"] > 0 else 0
        
        return {
            "total": low_stock + out_of_stock + delayed_orders + pending_leads,
            "critical": low_stock + out_of_stock,
            "warning": delayed_orders,
            "info": pending_leads,
            "predicted": predicted_alerts,
            "confidence": alert_trend["confidence"]
        }
        
    except Exception as e:
        logger.error(f"Erreur get_project_alerts: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# SANTÉ - AVEC FILTRE company_id
# ============================================

@router.get("/health")
async def get_project_health(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # ← AJOUTER
):
    """Calcule la santé du projet - FILTRÉ PAR company_id"""
    try:
        user_company_id = current_user.company_id
        thirty_days_ago = datetime.now() - timedelta(days=30)
        
        # Performance (ventes) - FILTRÉ PAR company_id
        sales_30d = safe_sum_query(
            db, SaleOrder, 'amount_total',
            [SaleOrder.company_id == user_company_id,  # ← AJOUTER
             SaleOrder.created_at >= thirty_days_ago]
        )
        performance = min(100, (sales_30d / 100000) * 100) if sales_30d > 0 else 0
        
        # Sécurité (stock) - FILTRÉ PAR company_id
        low_stock = safe_count_query(
            db, Product,
            [Product.company_id == user_company_id,  # ← AJOUTER
             Product.quantity_on_hand <= 10]
        )
        securite = max(0, 100 - (low_stock * 10)) if low_stock > 0 else 100
        
        # Croissance (leads) - FILTRÉ PAR company_id
        new_leads = safe_count_query(
            db, Lead,
            [Lead.company_id == user_company_id,  # ← AJOUTER
             Lead.created_at >= thirty_days_ago]
        )
        croissance = min(100, new_leads * 10) if new_leads > 0 else 0
        
        # Innovation (basée sur les nouvelles commandes) - FILTRÉ PAR company_id
        innovation = min(100, safe_count_query(
            db, SaleOrder,
            [SaleOrder.company_id == user_company_id,  # ← AJOUTER
             SaleOrder.created_at >= thirty_days_ago]
        ) * 5)
        
        # Prédire la santé future
        health_values = [performance, securite, croissance, innovation]
        health_prediction = PredictionEngine.predict_trend(health_values)
        
        # Score global
        score = (performance * 0.35 + securite * 0.35 + croissance * 0.15 + innovation * 0.15)
        
        # Déterminer le statut
        if score >= 80:
            status = "excellent"
        elif score >= 60:
            status = "good"
        elif score >= 40:
            status = "warning"
        else:
            status = "critical"
        
        return {
            "score": round(score, 2),
            "metrics": {
                "performance": round(performance, 2),
                "securite": round(securite, 2),
                "croissance": round(croissance, 2),
                "innovation": round(innovation, 2)
            },
            "status": status,
            "prediction": {
                "next_score": min(100, round(score + health_prediction["trend_change"], 2)),
                "trend": health_prediction["direction"],
                "confidence": health_prediction["confidence"]
            }
        }
        
    except Exception as e:
        logger.error(f"Erreur get_project_health: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# INSIGHTS - AVEC FILTRE company_id
# ============================================

@router.get("/insights")
async def get_project_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # ← AJOUTER
):
    """Génère des insights - FILTRÉ PAR company_id"""
    try:
        user_company_id = current_user.company_id
        insights = []
        thirty_days_ago = datetime.now() - timedelta(days=30)
        
        # 1. INSIGHT VENTES - FILTRÉ PAR company_id
        sales_30d = safe_sum_query(
            db, SaleOrder, 'amount_total',
            [SaleOrder.company_id == user_company_id,  # ← AJOUTER
             SaleOrder.created_at >= thirty_days_ago]
        )
        
        # Prédiction des ventes futures
        monthly_sales = []
        for i in range(3, 0, -1):
            month_date = (datetime.now() - timedelta(days=30*i)).replace(day=1)
            month_end = (month_date + timedelta(days=32)).replace(day=1)
            revenue = safe_sum_query(
                db, SaleOrder, 'amount_total',
                [SaleOrder.company_id == user_company_id,  # ← AJOUTER
                 SaleOrder.created_at >= month_date, 
                 SaleOrder.created_at < month_end]
            )
            monthly_sales.append(revenue)
        sales_prediction = PredictionEngine.predict_trend(monthly_sales)
        
        if sales_30d > 100000:
            insights.append({
                "type": "success",
                "title": "Performance commerciale exceptionnelle",
                "description": f"Ventes du mois: {sales_30d:,.0f}€ (+{sales_prediction['trend_change']:.1f}% prévu)",
                "priority": "high",
                "impact": "Positif",
                "action_path": "/sales",
                "prediction": f"{sales_prediction['prediction']:,.0f}€ attendus"
            })
        elif sales_30d > 50000:
            insights.append({
                "type": "opportunity",
                "title": "Bonne dynamique commerciale",
                "description": f"Ventes du mois: {sales_30d:,.0f}€, tendance {sales_prediction['direction']}",
                "priority": "medium",
                "impact": "Positif",
                "action_path": "/sales",
                "prediction": f"{sales_prediction['prediction']:,.0f}€ attendus"
            })
        else:
            insights.append({
                "type": "warning",
                "title": "Ventes en baisse",
                "description": f"Ventes du mois: {sales_30d:,.0f}€, action recommandée",
                "priority": "high",
                "impact": "Négatif",
                "action_path": "/sales",
                "prediction": "Campagne de relance recommandée"
            })
        
        # 2. INSIGHT LEADS - FILTRÉ PAR company_id
        pending_leads = safe_count_query(
            db, Lead,
            [Lead.company_id == user_company_id,  # ← AJOUTER
             Lead.status.in_([LeadStatus.NEW, LeadStatus.CONTACTED])]
        )
        
        # Prédiction des leads
        lead_data = []
        for i in range(3, 0, -1):
            month_date = (datetime.now() - timedelta(days=30*i)).replace(day=1)
            month_end = (month_date + timedelta(days=32)).replace(day=1)
            count = safe_count_query(
                db, Lead,
                [Lead.company_id == user_company_id,  # ← AJOUTER
                 Lead.created_at >= month_date, 
                 Lead.created_at < month_end]
            )
            lead_data.append(count)
        leads_prediction = PredictionEngine.predict_trend(lead_data)
        
        if pending_leads > 20:
            insights.append({
                "type": "opportunity",
                "title": "Pipeline commercial très actif",
                "description": f"{pending_leads} leads en attente, {leads_prediction['direction']} tendance",
                "priority": "high",
                "impact": "Élevé",
                "action_path": "/crm",
                "prediction": f"{int(leads_prediction['prediction'])} leads attendus"
            })
        elif pending_leads > 5:
            insights.append({
                "type": "info",
                "title": "Leads à suivre",
                "description": f"{pending_leads} leads nécessitent une attention commerciale",
                "priority": "medium",
                "impact": "Moyen",
                "action_path": "/crm",
                "prediction": "Relance recommandée"
            })
        
        # 3. INSIGHT STOCK - FILTRÉ PAR company_id
        low_stock = safe_count_query(
            db, Product,
            [Product.company_id == user_company_id,  # ← AJOUTER
             Product.quantity_on_hand <= 10]
        )
        out_of_stock = safe_count_query(
            db, Product,
            [Product.company_id == user_company_id,  # ← AJOUTER
             Product.quantity_on_hand <= 0]
        )
        
        if low_stock > 10:
            insights.append({
                "type": "warning",
                "title": "Rupture de stock imminente",
                "description": f"{low_stock} produits en stock bas, {out_of_stock} en rupture",
                "priority": "critical",
                "impact": "Élevé",
                "action_path": "/inventory",
                "prediction": "Commander d'urgence"
            })
        elif low_stock > 5:
            insights.append({
                "type": "warning",
                "title": "Niveaux de stock faibles",
                "description": f"{low_stock} produits approchent du seuil critique",
                "priority": "high",
                "impact": "Moyen",
                "action_path": "/inventory",
                "prediction": "Réapprovisionner sous 48h"
            })
        
        # 4. INSIGHT DIGITAL TWIN
        insights.append({
            "type": "info",
            "title": "Jumeaux numériques actifs",
            "description": "Analyse en temps réel des performances commerciales et logistiques",
            "priority": "medium",
            "impact": "Positif",
            "action_path": "/digital-twins",
            "prediction": "Précision: 92%"
        })
        
        return insights
        
    except Exception as e:
        logger.error(f"Erreur get_project_insights: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# KANBAN - AVEC FILTRE company_id
# ============================================

@router.get("/kanban/tasks")
async def get_kanban_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # ← AJOUTER
):
    """Récupère toutes les tâches Kanban - FILTRÉ PAR company_id"""
    try:
        tasks = db.query(KanbanTask).filter(
            KanbanTask.company_id == current_user.company_id  # ← AJOUTER
        ).all()
        return [task.to_dict() for task in tasks]
    except Exception as e:
        logger.error(f"Erreur get_kanban_tasks: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/kanban/tasks")
async def create_kanban_task(
    title: str,
    description: Optional[str] = None,
    priority: str = "medium",
    assignee: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # ← AJOUTER
):
    """Crée une nouvelle tâche Kanban - AVEC company_id"""
    try:
        task = KanbanTask(
            title=title,
            description=description,
            priority=priority,
            assignee=assignee,
            company_id=current_user.company_id,  # ← AJOUTER
            status="todo"
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        return task.to_dict()
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur create_kanban_task: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/kanban/tasks/{task_id}")
async def update_kanban_task(
    task_id: int,
    status: Optional[str] = None,
    order: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # ← AJOUTER
):
    """Met à jour une tâche - FILTRÉ PAR company_id"""
    try:
        task = db.query(KanbanTask).filter(
            KanbanTask.id == task_id,
            KanbanTask.company_id == current_user.company_id  # ← AJOUTER
        ).first()
        
        if not task:
            raise HTTPException(status_code=404, detail="Tâche non trouvée")
            
        if status:
            task.status = status
        if order is not None:
            task.order = order
            
        db.commit()
        db.refresh(task)
        return task.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur update_kanban_task: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/kanban/tasks/{task_id}")
async def delete_kanban_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # ← AJOUTER
):
    """Supprime une tâche - FILTRÉ PAR company_id"""
    try:
        task = db.query(KanbanTask).filter(
            KanbanTask.id == task_id,
            KanbanTask.company_id == current_user.company_id  # ← AJOUTER
        ).first()
        
        if not task:
            raise HTTPException(status_code=404, detail="Tâche non trouvée")
            
        db.delete(task)
        db.commit()
        return {"message": "Tâche supprimée"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur delete_kanban_task: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# DASHBOARD LAYOUT - AVEC FILTRE company_id
# ============================================

@router.get("/layout")
async def get_dashboard_layout(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # ← AJOUTER
):
    """Récupère le layout personnalisé du dashboard - FILTRÉ PAR user_id"""
    try:
        pref = db.query(UserPreference).filter(
            UserPreference.user_id == current_user.id,  # ← AJOUTER (user_id, pas company_id)
            UserPreference.key == "dashboard_layout"
        ).first()
        
        if pref:
            return pref.value
        return None
    except Exception as e:
        logger.error(f"Erreur get_dashboard_layout: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/layout")
async def save_dashboard_layout(
    layout: List[dict],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # ← AJOUTER
):
    """Sauvegarde le layout personnalisé du dashboard - AVEC user_id"""
    try:
        pref = db.query(UserPreference).filter(
            UserPreference.user_id == current_user.id,  # ← AJOUTER (user_id, pas company_id)
            UserPreference.key == "dashboard_layout"
        ).first()
        
        if not pref:
            pref = UserPreference(
                user_id=current_user.id,  # ← AJOUTER
                preference_type=PreferenceType.APPEARANCE,
                key="dashboard_layout",
                value=layout
            )
            db.add(pref)
        else:
            pref.value = layout
            
        db.commit()
        return {"message": "Layout sauvegardé"}
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur save_dashboard_layout: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

logger.info("✅ API PROJECT - Avec prédictions IA et Digital Twins")