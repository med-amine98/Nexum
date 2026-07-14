# app/api/endpoints/enterprise.py - Version complète et corrigée avec quantity_on_hand
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func
from datetime import datetime, timedelta
from typing import Optional, List, Dict
from app.database import get_db
from app.models import (
    Employee, Department,      # HR
    Project,                   # Projets
    Product,                   # Produits
    SaleOrder, SaleOrderLine,  # Ventes
    PurchaseOrder, PurchaseOrderLine,  # Achats
    StockMovement,             # Mouvements de stock
    Invoice, InvoiceLine,      # Factures
    Partner,                   # Clients/Fournisseurs
    Company                    # Compagnie
)
from app.models.hr import EmployeeStatus, LeaveStatus, LeaveType
from app.core.dependencies import get_current_active_user
from app.models.auth import User

router = APIRouter(tags=["Enterprise"])


# ==================== KPIS ====================
@router.get("/kpi")
async def get_kpi(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Récupérer les KPIs"""
    company_id = current_user.company_id
    
    # Nombre d'employés actifs
    employees_count = db.query(Employee).filter(
        Employee.company_id == company_id,
        Employee.status == EmployeeStatus.ACTIVE
    ).count()
    
    # Valeur totale du stock
    total_stock_value = db.query(func.sum(Product.unit_price * Product.quantity_on_hand)).filter(
        Product.company_id == company_id
    ).scalar() or 0
    
    # Nombre de produits en stock
    products_in_stock = db.query(Product).filter(
        Product.company_id == company_id,
        Product.quantity_on_hand > 0
    ).count()
    
    # Nombre de projets actifs
    projects_active = db.query(Project).filter(
        Project.company_id == company_id,
        Project.status == 'ACTIVE'
    ).count()
    
    # Progression moyenne des projets
    avg_progress = db.query(func.avg(Project.progress)).filter(
        Project.company_id == company_id,
        Project.status == 'ACTIVE'
    ).scalar() or 0
    
    # Chiffre d'affaires du mois
    current_month = datetime.now().replace(day=1)
    revenue = db.query(func.sum(SaleOrder.amount_total)).filter(
        SaleOrder.company_id == company_id,
        SaleOrder.date_order >= current_month
    ).scalar() or 0
    
    return {
        "employees": employees_count,
        "stock_value": float(total_stock_value),
        "products_in_stock": products_in_stock,
        "projects_active": projects_active,
        "avg_project_progress": float(avg_progress),
        "revenue": float(revenue)
    }


# ==================== EMPLOYÉS ====================
@router.get("/employees")
async def get_employees(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    department: Optional[str] = None,
    status: Optional[str] = None
):
    """Récupérer les employés"""
    company_id = current_user.company_id
    query = db.query(Employee).filter(Employee.company_id == company_id)
    
    if department:
        query = query.filter(Employee.department.has(name=department))
    
    if status:
        query = query.filter(Employee.status == status)
    
    employees = query.all()
    
    return [
        {
            "id": e.id,
            "name": f"{e.first_name} {e.last_name}",
            "first_name": e.first_name,
            "last_name": e.last_name,
            "email": e.email,
            "position": e.position or "Non défini",
            "status": e.status.value if e.status else "UNKNOWN",
            "salary": float(e.salary) if e.salary else 0,
            "department": e.department.name if e.department else "Non affecté"
        }
        for e in employees
    ]


# ==================== PROJETS ====================
@router.get("/projects")
async def get_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    status: Optional[str] = None
):
    """Récupérer les projets"""
    company_id = current_user.company_id
    query = db.query(Project).filter(Project.company_id == company_id)
    
    if status:
        query = query.filter(Project.status == status)
    
    projects = query.all()
    
    return [
        {
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "progress": float(p.progress) if p.progress else 0,
            "status": p.status,
            "start_date": p.start_date.isoformat() if p.start_date else None,
            "end_date": p.end_date.isoformat() if p.end_date else None
        }
        for p in projects
    ]


# ==================== PRODUITS ====================
@router.get("/products")
async def get_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    low_stock_only: bool = False,
    limit: int = 100
):
    """Récupérer les produits"""
    company_id = current_user.company_id
    query = db.query(Product).filter(Product.company_id == company_id)
    
    if low_stock_only:
        query = query.filter(Product.quantity_on_hand < 10, Product.quantity_on_hand > 0)
    
    products = query.limit(limit).all()
    
    return [
        {
            "id": p.id,
            "name": p.name,
            "sku": p.sku,
            "price": float(p.unit_price) if p.unit_price else 0,
            "quantity": float(p.quantity_on_hand) if p.quantity_on_hand else 0,
            "active": p.is_active  
        }
        for p in products
    ]
# ==================== VENTES ====================
@router.get("/sales")
async def get_sales(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    limit: int = 50,
    status: Optional[str] = None
):
    """Récupérer les ventes depuis sale_orders"""
    company_id = current_user.company_id
    query = db.query(SaleOrder).filter(SaleOrder.company_id == company_id)
    
    if status:
        query = query.filter(SaleOrder.state == status)
    
    orders = query.order_by(desc(SaleOrder.date_order)).limit(limit).all()
    
    result = []
    for order in orders:
        # Récupérer le nom du partenaire depuis la table Partner
        partner_name = None
        if order.partner_id:
            partner = db.query(Partner).filter(Partner.id == order.partner_id).first()
            partner_name = partner.name if partner else None
        
        result.append({
            "id": order.id,
            "order_name": order.name,
            "client": partner_name,
            "amount": float(order.amount_total) if order.amount_total else 0,
            "date": order.date_order.isoformat() if order.date_order else None,
            "status": order.state
        })
    
    return result

# ==================== ACHATS ====================
@router.get("/purchases")
async def get_purchases(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    limit: int = 50
):
    """Récupérer les achats depuis purchase_orders"""
    company_id = current_user.company_id
    query = db.query(PurchaseOrder).filter(PurchaseOrder.company_id == company_id)
    
    orders = query.order_by(desc(PurchaseOrder.date_order)).limit(limit).all()
    
    result = []
    for order in orders:
        partner_name = None
        if order.partner_id:
            partner = db.query(Partner).filter(Partner.id == order.partner_id).first()
            partner_name = partner.name if partner else None
        
        result.append({
            "id": order.id,
            "name": order.name,
            "supplier": partner_name,
            "amount": float(order.amount_total) if order.amount_total else 0,
            "date": order.date_order.isoformat() if order.date_order else None,
            "status": order.state
        })
    
    return result
# ==================== STOCK ====================
@router.get("/stock/alerts")
async def get_stock_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Récupérer les alertes de stock"""
    company_id = current_user.company_id
    
    # Stock faible (< 10)
    low_stock = db.query(Product).filter(
        Product.company_id == company_id,
        Product.quantity_on_hand < 10,
        Product.quantity_on_hand > 0,
        Product.is_active == True
    ).all()
    
    # Rupture de stock
    out_of_stock = db.query(Product).filter(
        Product.company_id == company_id,
        Product.quantity_on_hand <= 0,
        Product.is_active == True
    ).all()
    
    return {
        "low_stock": [
            {
                "id": p.id,
                "name": p.name,
                "quantity": float(p.quantity_on_hand),
                "price": float(p.unit_price) if p.unit_price else 0
            }
            for p in low_stock
        ],
        "out_of_stock": [
            {
                "id": p.id,
                "name": p.name,
                "quantity": float(p.quantity_on_hand),
                "price": float(p.unit_price) if p.unit_price else 0
            }
            for p in out_of_stock
        ],
        "total_low_stock": len(low_stock),
        "total_out_of_stock": len(out_of_stock)
    }

# ==================== SUPPLY CHAIN ====================
@router.get("/supply-chain")
async def get_supply_chain(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    weeks: int = 12
):
    """Récupérer les données supply chain depuis stock_movements"""
    company_id = current_user.company_id
    
    movements = db.query(StockMovement).filter(
        StockMovement.company_id == company_id
    ).order_by(desc(StockMovement.created_at)).limit(weeks * 10).all()
    
    if not movements:
        return [
            {"week": f"S{i}", "demand": 1000 + i * 50, "supply": 950 + i * 40, "inventory": 500 - i * 20}
            for i in range(1, weeks + 1)
        ]
    
    weekly_data = {}
    for m in movements:
        week = m.created_at.strftime("%Y-W%W")
        
        if week not in weekly_data:
            weekly_data[week] = {"demand": 0, "supply": 0, "inventory": 0}
        
        if m.quantity > 0:
            weekly_data[week]["supply"] += m.quantity
        else:
            weekly_data[week]["demand"] += abs(m.quantity)
    
    return [
        {"week": week, "demand": data["demand"], "supply": data["supply"], "inventory": data["inventory"]}
        for week, data in list(weekly_data.items())[:weeks]
    ]


# ==================== NEWS ====================
@router.get("/news")
async def get_news(db: Session = Depends(get_db), limit: int = 20):
    """Récupérer les actualités"""
    
    return [
        {
            "id": 1,
            "title": "Bienvenue sur Enterprise Dashboard",
            "description": "Votre plateforme de gestion d'entreprise intégrée",
            "source": "Neura ERP",
            "url": "#",
            "published_at": datetime.now().isoformat()
        },
        {
            "id": 2,
            "title": "Nouvelle fonctionnalité: Gestion des commandes Discord",
            "description": "Les commandes depuis Discord sont automatiquement synchronisées",
            "source": "Neura ERP",
            "url": "#",
            "published_at": datetime.now().isoformat()
        }
    ]


# ==================== YOUTH TRENDS ====================
@router.get("/youth-trends")
async def get_youth_trends():
    """Récupérer les tendances jeunes"""
    
    return [
        {"id": 1, "topic": "IA Générative", "interest": 94, "growth": "+45%", "category": "Tech"},
        {"id": 2, "topic": "GreenTech", "interest": 89, "growth": "+38%", "category": "Environnement"},
        {"id": 3, "topic": "Metaverse", "interest": 72, "growth": "+25%", "category": "Tech"},
        {"id": 4, "topic": "Travail hybride", "interest": 78, "growth": "+30%", "category": "Travail"},
        {"id": 5, "topic": "Blockchain", "interest": 68, "growth": "+20%", "category": "Tech"}
    ]


# ==================== SECTOR TRENDS ====================
@router.get("/sector-trends")
async def get_sector_trends():
    """Récupérer les tendances sectorielles"""
    
    return [
        {"sector": "Technologie", "growth": 15.2, "confidence": 88, "impact": "positive"},
        {"sector": "Finance", "growth": 8.5, "confidence": 82, "impact": "positive"},
        {"sector": "Santé", "growth": 9.8, "confidence": 79, "impact": "stable"},
        {"sector": "Industrie", "growth": 5.2, "confidence": 76, "impact": "stable"},
        {"sector": "Commerce", "growth": 7.3, "confidence": 80, "impact": "positive"}
    ]


# ==================== TRENDS ====================
@router.get("/trends")
async def get_trends():
    """Récupérer les tendances de recherche"""
    
    return [
        {"id": 1, "topic": "Intelligence Artificielle", "volume": 95, "trend": "up", "category": "Technologie"},
        {"id": 2, "topic": "Transformation Digitale", "volume": 88, "trend": "up", "category": "Digital"},
        {"id": 3, "topic": "Cybersécurité", "volume": 82, "trend": "up", "category": "Sécurité"},
        {"id": 4, "topic": "Cloud Computing", "volume": 79, "trend": "up", "category": "Technologie"},
        {"id": 5, "topic": "RSE", "volume": 74, "trend": "up", "category": "ESG"}
    ]


# ==================== FINANCIAL FORECAST ====================
@router.get("/financial-forecast")
async def get_financial_forecast(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Récupérer les prévisions financières"""
    company_id = current_user.company_id
    
    months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun"]
    
    sales_by_month = db.query(
        func.extract('month', SaleOrder.date_order).label('month'),
        func.sum(SaleOrder.amount_total).label('total')
    ).filter(
        SaleOrder.company_id == company_id,
        SaleOrder.date_order >= datetime.now() - timedelta(days=180)
    ).group_by('month').all()
    
    sales_dict = {int(m): float(t) for m, t in sales_by_month if m}
    
    forecast = []
    for i, month in enumerate(months):
        month_num = i + 1
        actual = sales_dict.get(month_num, 0)
        forecast.append({
            "month": month,
            "actual": actual if actual > 0 else None,
            "forecast": actual * 1.1 if actual > 0 else 50000
        })
    
    return forecast


# ==================== RISK METRICS ====================
@router.get("/risk-metrics")
async def get_risk_metrics():
    """Récupérer les métriques de risque"""
    
    return {
        "credit": 25,
        "market": 45,
        "operational": 30,
        "liquidity": 20,
        "overall": 35
    }


# ==================== PERFORMANCE METRICS ====================
@router.get("/performance-metrics")
async def get_performance_metrics():
    """Récupérer les métriques de performance"""
    
    return {
        "retention": 92,
        "employeeSatisfaction": 84,
        "employeeEngagement": 82,
        "salesTarget": 85
    }


# ==================== ALERTS ====================
@router.get("/alerts")
async def get_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Récupérer les alertes"""
    company_id = current_user.company_id
    alerts = []
    
    # Stock faible
    low_stock = db.query(Product).filter(
        Product.company_id == company_id,
        Product.quantity_on_hand < 10,
        Product.quantity_on_hand > 0,
        Product.is_active == True
    ).limit(5).all()
    
    for p in low_stock:
        alerts.append({
            "id": p.id,
            "title": f"Stock faible: {p.name}",
            "amount": float(p.quantity_on_hand),
            "type": "warning",
            "created_at": datetime.now().isoformat()
        })
    
    return alerts
# ==================== DASHBOARD ====================
@router.get("/dashboard")
async def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Récupérer les indicateurs clés"""
    company_id = current_user.company_id
    
    return {
        "employees": db.query(Employee).filter(Employee.company_id == company_id, Employee.status == EmployeeStatus.ACTIVE).count(),
        "products": db.query(Product).filter(Product.company_id == company_id, Product.is_active == True).count(),  
        "products_in_stock": db.query(Product).filter(Product.company_id == company_id, Product.quantity_on_hand > 0).count(),
        "products_low_stock": db.query(Product).filter(Product.company_id == company_id, Product.quantity_on_hand < 10, Product.quantity_on_hand > 0).count(),
        "products_out_of_stock": db.query(Product).filter(Product.company_id == company_id, Product.quantity_on_hand <= 0, Product.is_active == True).count(), 
        "projects": db.query(Project).filter(Project.company_id == company_id).count(),
        "projects_active": db.query(Project).filter(Project.company_id == company_id, Project.status == 'ACTIVE').count(),
        "total_stock_value": float(db.query(func.sum(Product.unit_price * Product.quantity_on_hand)).filter(Product.company_id == company_id).scalar() or 0)
    }


# ==================== DÉPARTEMENTS ====================
@router.get("/departments")
async def get_departments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Récupérer tous les départements"""
    company_id = current_user.company_id
    
    departments = db.query(Department).filter(Department.company_id == company_id).all()
    
    return [
        {
            "id": d.id,
            "name": d.name,
            "code": d.code,
            "manager_id": d.manager_id,
            "employee_count": db.query(Employee).filter(Employee.department_id == d.id).count()
        }
        for d in departments
    ]


# ==================== STATISTIQUES PRODUITS ====================
@router.get("/products/stats")
async def get_products_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Récupérer les statistiques des produits"""
    company_id = current_user.company_id
    
    total_products = db.query(Product).filter(Product.company_id == company_id, Product.is_active == True).count() 
    total_value = db.query(func.sum(Product.unit_price * Product.quantity_on_hand)).filter(Product.company_id == company_id).scalar() or 0
    avg_price = db.query(func.avg(Product.unit_price)).filter(Product.company_id == company_id).scalar() or 0
    total_quantity = db.query(func.sum(Product.quantity_on_hand)).filter(Product.company_id == company_id).scalar() or 0
    
    return {
        "total_products": total_products,
        "total_stock_value": float(total_value),
        "average_price": float(avg_price),
        "total_quantity": float(total_quantity)
    }


# ==================== RECHERCHE ====================
@router.get("/search")
async def search_all(
    q: str, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Rechercher dans toutes les tables"""
    company_id = current_user.company_id
    
    results = {
        "employees": [],
        "projects": [],
        "products": []
    }
    
    if q:
        employees = db.query(Employee).filter(
            Employee.company_id == company_id,
            (Employee.first_name.ilike(f"%{q}%")) |
            (Employee.last_name.ilike(f"%{q}%")) |
            (Employee.email.ilike(f"%{q}%"))
        ).limit(10).all()
        
        results["employees"] = [
            {
                "id": e.id,
                "name": f"{e.first_name} {e.last_name}",
                "email": e.email,
                "type": "employee"
            }
            for e in employees
        ]
        
        projects = db.query(Project).filter(
            Project.company_id == company_id,
            Project.name.ilike(f"%{q}%")
        ).limit(10).all()
        
        results["projects"] = [
            {
                "id": p.id,
                "name": p.name,
                "status": p.status,
                "type": "project"
            }
            for p in projects
        ]
        
        products = db.query(Product).filter(
            Product.company_id == company_id,
            (Product.name.ilike(f"%{q}%")) |
            (Product.sku.ilike(f"%{q}%"))
        ).limit(10).all()
        
        results["products"] = [
            {
                "id": p.id,
                "name": p.name,
                "sku": p.sku,
                "price": float(p.unit_price) if p.unit_price else 0,
                "quantity": float(p.quantity_on_hand) if p.quantity_on_hand else 0,
                "type": "product"
            }
            for p in products
        ]
    
    return results