from fastapi import APIRouter, Depends, Query, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime
from app.database import get_db
from app.models.purchase import PurchaseOrder, PurchaseOrderStatus
from app.models.partner import Partner
from app.core.dependencies import get_current_user
from app.models.auth import User
import logging
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/orders")
async def get_purchase_orders(
    date_from: str = None,
    date_to: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    orders = db.query(PurchaseOrder).filter(PurchaseOrder.company_id == current_user.company_id).all()
    return [
        {
            "id": o.id,
            "name": o.name,
            "supplier_id": o.supplier_id,
            "amount_total": float(o.amount_total) if o.amount_total else 0,
            "date_order": o.date_order.isoformat() if o.date_order else None,
            "status": o.status.value if o.status else "DRAFT"
        }
        for o in orders
    ]

@router.get("/suppliers")
async def get_suppliers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    suppliers = db.query(Partner).filter(Partner.is_supplier == True, Partner.company_id == current_user.company_id).all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "email": s.email,
            "phone": s.phone
        }
        for s in suppliers
    ]

@router.post("/suppliers")
async def create_supplier(
    request: Request, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Crée un nouveau fournisseur"""
    try:
        # Lire le body de la requête
        body = await request.body()
        body_str = body.decode('utf-8')
        logger.info(f"=== BODY REÇU (RAW) ===")
        logger.info(body_str)
        
        # Essayer de parser le JSON
        supplier_data = json.loads(body_str) if body_str else {}
        logger.info(f"=== JSON PARSÉ ===")
        logger.info(json.dumps(supplier_data, indent=2, ensure_ascii=False))
        
        # Vérifier tous les champs possibles
        name = (supplier_data.get("name") or 
                supplier_data.get("supplier_name") or 
                supplier_data.get("supplierName") or
                supplier_data.get("nom") or
                supplier_data.get("fournisseur"))
        
        email = (supplier_data.get("email") or 
                 supplier_data.get("supplier_email") or 
                 supplier_data.get("supplierEmail"))
        
        phone = (supplier_data.get("phone") or 
                 supplier_data.get("supplier_phone") or 
                 supplier_data.get("supplierPhone") or
                 supplier_data.get("telephone") or
                 supplier_data.get("tel"))
        
        address = supplier_data.get("address") or supplier_data.get("adresse")
        
        logger.info(f"=== CHAMPS EXTRAPOLÉS ===")
        logger.info(f"name: {name}")
        logger.info(f"email: {email}")
        logger.info(f"phone: {phone}")
        logger.info(f"address: {address}")
        
        if not name:
            logger.error("Nom manquant - tous les champs reçus:")
            logger.error(list(supplier_data.keys()))
            raise HTTPException(status_code=400, detail="Le nom du fournisseur est requis")
        
        # Créer le nouveau fournisseur
        new_supplier = Partner(
            name=name,
            email=email,
            phone=phone,
            address=address,
            is_supplier=True,
            company_id=current_user.company_id
        )
        
        db.add(new_supplier)
        db.commit()
        db.refresh(new_supplier)
        
        logger.info(f"✅ Fournisseur créé: ID={new_supplier.id}, Nom={new_supplier.name}")
        
        return {
            "success": True,
            "id": new_supplier.id,
            "name": new_supplier.name,
            "email": new_supplier.email,
            "phone": new_supplier.phone,
            "message": "Fournisseur créé avec succès"
        }
    except json.JSONDecodeError as e:
        logger.error(f"Erreur JSON: {e}")
        logger.error(f"Body reçu: {body_str}")
        raise HTTPException(status_code=400, detail="Format JSON invalide")
    except Exception as e:
        logger.error(f"Erreur: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard/kpi")
async def get_purchases_kpi(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    total_orders = db.query(PurchaseOrder).filter(PurchaseOrder.company_id == current_user.company_id).count()
    pending_orders = db.query(PurchaseOrder).filter(PurchaseOrder.status == "DRAFT", PurchaseOrder.company_id == current_user.company_id).count()
    delivered_orders = db.query(PurchaseOrder).filter(PurchaseOrder.status == "RECEIVED", PurchaseOrder.company_id == current_user.company_id).count()
    
    return [
        {"title": "Total commandes", "value": total_orders, "color": "#1890ff", "trend": 5},
        {"title": "Commandes en attente", "value": pending_orders, "color": "#faad14", "trend": -2},
        {"title": "Commandes livrées", "value": delivered_orders, "color": "#52c41a", "trend": 8},
        {"title": "Dépenses mensuelles", "value": 0, "color": "#722ed1", "trend": 0}
    ]

@router.get("/dashboard/supplier-stats")
async def get_supplier_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    suppliers = db.query(Partner).filter(Partner.is_supplier == True, Partner.company_id == current_user.company_id).all()
    stats = []
    for supplier in suppliers:
        orders = db.query(PurchaseOrder).filter(PurchaseOrder.supplier_id == supplier.id, PurchaseOrder.company_id == current_user.company_id).all()
        total_amount = sum([o.amount_total for o in orders if o.amount_total]) if orders else 0
        stats.append({
            "id": supplier.id,
            "name": supplier.name,
            "total_orders": len(orders),
            "total_amount": float(total_amount)
        })
    return stats

@router.post("/orders")
async def create_purchase_order(
    order_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Crée une nouvelle commande d'achat"""
    supplier_id = order_data.get("supplier_id")
    if not supplier_id:
        raise HTTPException(status_code=400, detail="Supplier ID is required")
    
    supplier = db.query(Partner).filter(Partner.id == supplier_id, Partner.company_id == current_user.company_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    new_order = PurchaseOrder(
        name=f"PO-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
        supplier_id=supplier_id,
        partner_id_old=supplier_id,
        amount_total=order_data.get("amount_total", 0),
        amount_untaxed=order_data.get("amount_untaxed", 0),
        amount_tax=order_data.get("amount_tax", 0),
        status=PurchaseOrderStatus.DRAFT,
        delivery_status="NOT_DELIVERED",
        date_order=datetime.now(),
        created_by=current_user.id,
        company_id=current_user.company_id
    )
    
    db.add(new_order)
    db.commit()
    db.refresh(new_order)
    
    return new_order

@router.get("/orders/{order_id}")
async def get_purchase_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupère une commande d'achat spécifique"""
    order = db.query(PurchaseOrder).filter(PurchaseOrder.id == order_id, PurchaseOrder.company_id == current_user.company_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    return {
        "id": order.id,
        "name": order.name,
        "supplier_id": order.supplier_id,
        "amount_total": float(order.amount_total) if order.amount_total else 0,
        "amount_untaxed": float(order.amount_untaxed) if order.amount_untaxed else 0,
        "amount_tax": float(order.amount_tax) if order.amount_tax else 0,
        "status": order.status.value if order.status else "DRAFT",
        "delivery_status": order.delivery_status,
        "date_order": order.date_order.isoformat() if order.date_order else None,
        "expected_date": order.expected_date.isoformat() if order.expected_date else None,
        "delivery_date": order.delivery_date.isoformat() if order.delivery_date else None,
        "notes": order.notes,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "updated_at": order.updated_at.isoformat() if order.updated_at else None,
        "supplier": {
            "id": order.supplier.id,
            "name": order.supplier.name,
            "email": order.supplier.email
        } if order.supplier else None
    }

@router.post("/orders")
async def create_purchase_order(
    order_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Crée une nouvelle commande d'achat"""
    supplier_id = order_data.get("supplier_id")
    if not supplier_id:
        raise HTTPException(status_code=400, detail="Supplier ID is required")
    
    supplier = db.query(Partner).filter(Partner.id == supplier_id, Partner.company_id == current_user.company_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    new_order = PurchaseOrder(
        name=f"PO-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
        supplier_id=supplier_id,
        partner_id_old=supplier_id,  # Important : remplir cette colonne
        amount_total=order_data.get("amount_total", 0),
        amount_untaxed=order_data.get("amount_untaxed", 0),
        amount_tax=order_data.get("amount_tax", 0),
        status=PurchaseOrderStatus.DRAFT,
        delivery_status="NOT_DELIVERED",
        date_order=datetime.now(),
        created_by=current_user.id,
        company_id=current_user.company_id
    )
    
    db.add(new_order)
    db.commit()
    db.refresh(new_order)
    
    # Retourner les détails avec le fournisseur
    return {
        "id": new_order.id,
        "name": new_order.name,
        "supplier_id": new_order.supplier_id,
        "supplier_name": supplier.name,
        "amount_total": new_order.amount_total,
        "status": new_order.status.value,
        "delivery_status": new_order.delivery_status,
        "date_order": new_order.date_order.isoformat(),
        "message": "Purchase order created successfully"
    }

@router.put("/orders/{order_id}/delivery-status")
async def update_delivery_status(
    order_id: int,
    status_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Met à jour le statut de livraison d'une commande"""
    order = db.query(PurchaseOrder).filter(PurchaseOrder.id == order_id, PurchaseOrder.company_id == current_user.company_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    new_status = status_data.get("delivery_status")
    if new_status:
        order.delivery_status = new_status
    
    db.commit()
    
    return {
        "id": order.id,
        "delivery_status": order.delivery_status,
        "message": "Delivery status updated"
    }

@router.get("/orders")
async def get_purchase_orders(
    date_from: str = None,
    date_to: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    orders = db.query(PurchaseOrder).filter(PurchaseOrder.company_id == current_user.company_id).all()
    result = []
    for o in orders:
        # Récupérer le nom du fournisseur
        supplier_name = None
        if o.supplier_id:
            supplier = db.query(Partner).filter(Partner.id == o.supplier_id, Partner.company_id == current_user.company_id).first()
            supplier_name = supplier.name if supplier else None
        
        # Traduire le statut de livraison en français
        delivery_status_fr = {
            "NOT_DELIVERED": "Non livré",
            "PARTIAL": "Partiel",
            "DELIVERED": "Livré"
        }.get(o.delivery_status, o.delivery_status or "-")
        
        result.append({
            "id": o.id,
            "name": o.name,
            "supplier_id": o.supplier_id,
            "supplier_name": supplier_name or "-",
            "amount_total": float(o.amount_total) if o.amount_total else 0,
            "date_order": o.date_order.strftime("%d/%m/%Y") if o.date_order else None,
            "status": o.status.value if o.status else "DRAFT",
            "delivery_status": delivery_status_fr,
            "delivery_status_raw": o.delivery_status
        })
    return result
