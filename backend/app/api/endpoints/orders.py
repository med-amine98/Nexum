# app/api/endpoints/orders.py - Version corrigée avec statuts français
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, timedelta
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
import json
import asyncio
import random
import logging
from app.database import get_db
from app.models import Invoice, InvoiceLine, Partner, InvoiceStatus
from app.models import Product as StockProduct
from app.models import SaleOrder, SaleOrderLine
from app.websocket_manager import manager

logger = logging.getLogger(__name__)

# CORRECTION: Définir OrderStatus localement pour éviter les problèmes d'ENUM
class OrderStatus:
    DRAFT = "brouillon"
    CONFIRMED = "confirmé"
    DONE = "terminé"
    CANCELLED = "annulé"
    DELIVERED = "livré"
    
    @classmethod
    def get_all_statuses(cls):
        return [cls.DRAFT, cls.CONFIRMED, cls.DONE, cls.CANCELLED, cls.DELIVERED]

from app.core.dependencies import get_current_active_user
from app.models.auth import User

router = APIRouter()


class OrderItem(BaseModel):
    product_name: Optional[str] = None
    product: Optional[str] = None
    quantity: int



class OrderCreate(BaseModel):
    order_id: str
    user_id: str
    username: str
    product: Optional[str] = None
    quantity: Optional[int] = None
    items: Optional[List[OrderItem]] = None
    customer: str
    address: str
    phone: Optional[str] = ""
    email: Optional[str] = ""
    status: str = "pending"
    date: str
    source: str
    extracted: bool = False
    original_message: Optional[str] = None
    price: Optional[float] = None
    company_id: Optional[int] = None


class OrderStatusUpdate(BaseModel):
    status: str


async def get_product_price_from_db(product_name: str, company_id: int, db: Session) -> float:
    """Récupérer le prix d'un produit depuis la base de données avec isolation SaaS"""
    try:
        product = db.query(StockProduct).filter(
            StockProduct.name.ilike(f"%{product_name}%"),
            StockProduct.company_id == company_id
        ).first()
        
        if product:
            return product.unit_price or 0
        return 0
    except Exception as e:
        logger.error(f"Erreur récupération prix: {e}")
        return 0


async def update_stock_in_db(product_name: str, quantity: int, company_id: int, db: Session):
    """Mettre à jour la quantité en stock dans la base de données avec isolation SaaS"""
    try:
        product = db.query(StockProduct).filter(
            StockProduct.name.ilike(f"%{product_name}%"),
            StockProduct.company_id == company_id
        ).first()
        
        if product:
            current_qty = product.quantity_on_hand or 0
            new_qty = current_qty - quantity
            
            product.quantity_on_hand = new_qty
            db.commit()
            
            logger.info(f"📦 Stock mis à jour: {product.name} - Ancien: {current_qty}, Nouveau: {new_qty}")
            return True
        else:
            logger.warning(f"⚠️ Produit non trouvé: {product_name} (Company: {company_id})")
            return False
    except Exception as e:
        logger.error(f"❌ Erreur mise à jour stock: {e}")
        db.rollback()
        return False


async def create_sale_order_from_invoice(invoice: Invoice, order_data: dict, company_id: int, db: Session):
    """Créer une commande de vente à partir de la facture avec isolation SaaS"""
    try:
        partner = db.query(Partner).filter(
            Partner.id == invoice.partner_id,
            Partner.company_id == company_id
        ).first()
        
        if not partner:
            logger.warning(f"⚠️ Partenaire non trouvé pour l'invoice {invoice.id} (Company: {company_id})")
            return None
        
        sale_order_name = f"SO{datetime.now().strftime('%Y%m%d%H%M%S')}{random.randint(10, 99)}"
        
        # CORRECTION: Utiliser OrderStatus.DRAFT qui vaut "brouillon"
        sale_order = SaleOrder(
            name=sale_order_name,
            partner_id=partner.id,
            company_id=company_id,
            date_order=datetime.now(),
            amount_total=invoice.amount_total,
            amount_untaxed=invoice.amount_untaxed,
            amount_tax=invoice.amount_tax,
            state=OrderStatus.DRAFT,
            origin=f"Commande Discord: {order_data.get('order_id')}"
        )
        
        db.add(sale_order)
        db.commit()
        db.refresh(sale_order)
        
        items_to_create = []
        if order_data.get('items'):
            items_to_create = order_data['items']
        else:
            items_to_create = [{
                'name': order_data.get('product'),
                'quantity': order_data.get('quantity', 1),
                'unit_price': order_data.get('price', 0)
            }]
        
        for item in items_to_create:
            product = db.query(StockProduct).filter(
                StockProduct.name.ilike(f"%{item.get('name')}%"),
                StockProduct.company_id == company_id
            ).first()
            
            price = item.get('unit_price', 0)
            qty = item.get('quantity', 1)
            subtotal = price * qty
            
            sale_line = SaleOrderLine(
                order_id=sale_order.id,
                product_id=product.id if product else None,
                name=item.get('name'),
                product_uom_qty=qty,
                price_unit=price,
                price_subtotal=subtotal,
                price_tax=subtotal * 0.20,
                price_total=subtotal * 1.20
            )
            db.add(sale_line)
        
        db.commit()
        
        logger.info(f"✅ Commande de vente créée: {sale_order_name} pour {partner.name}")
        return sale_order
        
    except Exception as e:
        logger.error(f"❌ Erreur création commande vente: {e}")
        db.rollback()
        return None


async def create_invoice_from_order(order_data: dict, company_id: int, db: Session):
    """Créer une facture à partir d'une commande confirmée avec isolation SaaS"""
    
    try:
        # 1. Créer ou récupérer le partenaire
        partner = db.query(Partner).filter(
            Partner.name == order_data.get('customer'),
            Partner.company_id == company_id
        ).first()
        
        if not partner:
            partner = Partner(
                name=order_data.get('customer'),
                email=order_data.get('email'),
                phone=order_data.get('phone'),
                company_id=company_id,
                is_company=True
            )
            db.add(partner)
            db.commit()
            db.refresh(partner)
            logger.info(f"✅ Nouveau client créé: {partner.name} (Company: {company_id})")
        
        # 2. Calculer les montants avec récupération automatique des prix
        amount_untaxed = 0
        invoice_lines_data = []
        items_to_process = []
        
        if order_data.get('items'):
            items_to_process = order_data['items']
        else:
            # Récupérer le prix depuis la base si non fourni
            price = order_data.get('price', 0)
            if price == 0:
                price = await get_product_price_from_db(order_data.get('product', ''), company_id, db)
            
            items_to_process = [{
                'name': order_data.get('product'),
                'quantity': order_data.get('quantity', 1),
                'unit_price': price
            }]
        
        for item in items_to_process:
            price = item.get('unit_price', 0)
            quantity = item.get('quantity', 1)
            subtotal = price * quantity
            amount_untaxed += subtotal
            
            invoice_lines_data.append({
                'name': item.get('name'),
                'quantity': quantity,
                'price_unit': price,
                'price_subtotal': subtotal,
                'price_tax': subtotal * 0.20,
                'price_total': subtotal * 1.20
            })
            
            # 3. Mettre à jour le stock
            await update_stock_in_db(item.get('name'), quantity, company_id, db)
        
        # Calculer TVA (20%)
        amount_tax = amount_untaxed * 0.20
        amount_total = amount_untaxed + amount_tax
        
        # 4. Générer le numéro de facture unique
        invoice_number = f"INV-{datetime.now().strftime('%Y%m%d%H%M%S')}-{random.randint(100, 999)}"
        
        # 5. Créer la facture
        invoice = Invoice(
            number=invoice_number,
            partner_id=partner.id,
            company_id=company_id,
            date_invoice=datetime.now(),
            date_due=datetime.now() + timedelta(days=30),
            amount_untaxed=amount_untaxed,
            amount_tax=amount_tax,
            amount_total=amount_total,
            status=InvoiceStatus.DRAFT,
            payment_status="not_paid",
            notes=f"Commande {order_data.get('order_id')} - Créée automatiquement depuis Discord"
        )
        
        db.add(invoice)
        db.commit()
        db.refresh(invoice)
        
        # 6. Créer les lignes de facture
        for line_data in invoice_lines_data:
            invoice_line = InvoiceLine(
                invoice_id=invoice.id,
                name=line_data['name'],
                quantity=line_data['quantity'],
                price_unit=line_data['price_unit'],
                price_subtotal=line_data['price_subtotal'],
                price_tax=line_data['price_tax'],
                price_total=line_data['price_total']
            )
            db.add(invoice_line)
        
        db.commit()
        
        # 7. Créer la commande de vente
        sale_order = await create_sale_order_from_invoice(invoice, order_data, company_id, db)
        
        logger.info(f"📄 Facture créée: {invoice_number} - Total: {amount_total}€")
        logger.info(f"🛒 Commande vente créée: {sale_order.name if sale_order else 'Non créée'}")
        
        return invoice
        
    except Exception as e:
        logger.error(f"❌ Erreur création facture: {e}")
        db.rollback()
        return None


@router.post("/create")
async def create_order(order: OrderCreate, db: Session = Depends(get_db)):
    """Créer une commande (depuis Discord ou autre)"""
    
    # 1. Vérifier la compagnie
    company_id = order.company_id or 1
        
    # 2. Créer ou récupérer le partenaire
    partner = db.query(Partner).filter(
        Partner.name == order.customer,
        Partner.company_id == company_id
    ).first()
    
    if not partner:
        partner = Partner(
            name=order.customer,
            email=order.email,
            phone=order.phone,
            company_id=company_id,
            is_company=True
        )
        db.add(partner)
        db.commit()
        db.refresh(partner)
    
    # 3. Créer la SaleOrder
    sale_order = SaleOrder(
        name=f"DIS-{order.order_id}-{datetime.now().strftime('%M%S')}",
        partner_id=partner.id,
        company_id=company_id,
        date_order=datetime.now(),
        amount_total=0,
        state=OrderStatus.DRAFT,
        notes=f"Source: {order.source} | Message: {order.original_message}"
    )
    db.add(sale_order)
    db.commit()
    db.refresh(sale_order)
    
    # 4. Ajouter les lignes
    total_amount = 0
    items = order.items if order.items else [OrderItem(product_name=order.product, quantity=order.quantity or 1)]
    
    for item in items:
        prod_name = item.product_name or item.product or "Produit inconnu"
        product = db.query(StockProduct).filter(
            StockProduct.name.ilike(f"%{prod_name}%"),
            StockProduct.company_id == company_id
        ).first()
        
        price = product.unit_price if product else (order.price or 0)
        line_total = price * item.quantity
        total_amount += line_total
        
        line = SaleOrderLine(
            order_id=sale_order.id,
            product_id=product.id if product else None,
            product_name=prod_name,
            quantity=item.quantity,
            price_unit=price,
            price_subtotal=line_total,
            price_total=line_total * 1.2
        )
        db.add(line)
    
    sale_order.amount_total = total_amount * 1.2
    sale_order.amount_untaxed = total_amount
    sale_order.amount_tax = total_amount * 0.2
    
    db.commit()
    
    # Notification WebSocket
    try:
        await manager.send_notification(
            title="Nouvelle Commande Enterprise",
            message=f"Commande de {order.customer} pour {order.product or 'plusieurs articles'}",
            sector="enterprise",
            type="success",
            data={"order_id": sale_order.name, "customer": order.customer}
        )
        logger.info(f"📣 Notification de commande envoyée via WebSocket (Secteur: enterprise)")
    except Exception as e:
        logger.error(f"❌ Erreur notification commande: {e}")
    
    return {
        "success": True,
        "order_id": sale_order.id,
        "order_name": sale_order.name
    }


@router.get("/discord")
async def get_discord_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    limit: int = 50
):
    """Récupérer les commandes Discord (SaleOrders avec origin discord)"""
    company_id = current_user.company_id
    
    orders = db.query(SaleOrder).filter(
        SaleOrder.company_id == company_id,
        SaleOrder.name.like("DIS-%")
    ).order_by(desc(SaleOrder.date_order)).limit(limit).all()
    
    result = []
    for o in orders:
        result.append({
            "order_id": o.name,
            "id": o.id,
            "customer": o.partner.name if o.partner else "Inconnu",
            "date": o.date_order.isoformat(),
            "total": o.amount_total,
            "status": o.state if isinstance(o.state, str) else (o.state.value if hasattr(o.state, 'value') else str(o.state)),
            "source": "discord"
        })
    
    return {"orders": result, "total": len(result)}


@router.get("/invoice/{order_id}")
async def get_invoice(
    order_id: str, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Récupérer la facture d'une commande"""
    company_id = current_user.company_id
    
    # Trouver la commande par son nom ou ID
    sale_order = db.query(SaleOrder).filter(
        SaleOrder.company_id == company_id,
        (SaleOrder.name == order_id) | (SaleOrder.id == int(order_id) if order_id.isdigit() else False)
    ).first()
    
    if not sale_order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
        
    invoice = db.query(Invoice).filter(
        Invoice.company_id == company_id,
        Invoice.origin == sale_order.name
    ).first()
    
    if not invoice:
        # Si pas de facture en DB, on renvoie les données de la commande
        return {
            "success": True,
            "invoice": {
                "order_id": sale_order.name,
                "customer": sale_order.partner.name if sale_order.partner else "Inconnu",
                "total": sale_order.amount_total,
                "status": "pending"
            }
        }
        
    return {
        "success": True,
        "invoice": {
            "invoice_id": invoice.number,
            "order_id": sale_order.name,
            "date": invoice.date_invoice.isoformat(),
            "customer": sale_order.partner.name if sale_order.partner else "Inconnu",
            "total": invoice.amount_total,
            "status": invoice.status.value if hasattr(invoice.status, 'value') else invoice.status
        }
    }


@router.put("/{order_id}/status")
async def update_order_status(
    order_id: str, 
    update: OrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Mettre à jour le statut d'une commande"""
    company_id = current_user.company_id
    
    sale_order = db.query(SaleOrder).filter(
        SaleOrder.company_id == company_id,
        (SaleOrder.name == order_id) | (SaleOrder.id == int(order_id) if order_id.isdigit() else False)
    ).first()
    
    if not sale_order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    
    # Valider le statut
    valid_statuses = OrderStatus.get_all_statuses()
    if update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Statut invalide. Valeurs acceptées: {valid_statuses}")
        
    sale_order.state = update.status
    db.commit()
    
    return {"success": True, "order_id": sale_order.id, "status": update.status}


@router.get("/invoices")
async def get_all_invoices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    limit: int = 100
):
    """Récupérer toutes les factures de la compagnie"""
    company_id = current_user.company_id
    
    invoices = db.query(Invoice).filter(
        Invoice.company_id == company_id
    ).order_by(desc(Invoice.date_invoice)).limit(limit).all()
    
    result = []
    for inv in invoices:
        result.append({
            "id": inv.id,
            "number": inv.number,
            "date_invoice": inv.date_invoice.isoformat(),
            "amount_total": inv.amount_total,
            "status": inv.status.value if hasattr(inv.status, 'value') else inv.status
        })
   
    return result


@router.get("/sales-orders")
async def get_sales_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    limit: int = 50
):
    """Récupérer les commandes au format attendu par le dashboard ventes"""
    company_id = current_user.company_id
    
    orders = db.query(SaleOrder).filter(
        SaleOrder.company_id == company_id
    ).order_by(desc(SaleOrder.date_order)).limit(limit).all()
    
    result = []
    for order in orders:
        # Obtenir le statut correctement (string)
        status_value = order.state if isinstance(order.state, str) else (order.state.value if hasattr(order.state, 'value') else str(order.state))
        
        result.append({
            "id": order.id,
            "name": order.name,
            "partner_name": order.partner.name if order.partner else "Inconnu",
            "date_order": order.date_order.isoformat() if order.date_order else None,
            "amount_total": order.amount_total,
            "status": status_value,
            "origin": order.name[:3] if order.name else "MAN",
            "created_from_discord": order.name.startswith("DIS") if order.name else False,
            "lines": []
        })
    
    return result


@router.get("/sales-dashboard/kpi")
async def get_sales_kpi(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """KPIs pour le dashboard ventes"""
    company_id = current_user.company_id
    
    orders = db.query(SaleOrder).filter(SaleOrder.company_id == company_id).all()
    
    total_revenue = sum(o.amount_total for o in orders if o.amount_total is not None)
    total_orders = len(orders)
    
    # CORRECTION: Utiliser les nouvelles valeurs françaises
    pending_orders = len([o for o in orders if o.state == OrderStatus.DRAFT])
    confirmed_orders = len([o for o in orders if o.state == OrderStatus.CONFIRMED])
    
    # Calculer les tendances (mock pour l'instant)
    revenue_trend = 12.5
    orders_trend = 8.2
    pending_trend = -2.1
    confirmed_trend = 15.3
    
    return [
        {"title": "Chiffre d'affaires", "value": round(total_revenue, 2), "prefix": "€", "trend": revenue_trend},
        {"title": "Commandes", "value": total_orders, "trend": orders_trend},
        {"title": "En attente", "value": pending_orders, "trend": pending_trend},
        {"title": "Confirmées", "value": confirmed_orders, "trend": confirmed_trend}
    ]


@router.get("/stock/alerts")
async def get_stock_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Récupérer les alertes de stock"""
    from app.models import Product as StockProduct
    company_id = current_user.company_id
    
    alerts = []
    
    # Stock faible (< 10)
    low_stock = db.query(StockProduct).filter(
        StockProduct.company_id == company_id,
        StockProduct.quantity_on_hand < 10,
        StockProduct.quantity_on_hand > 0,
        StockProduct.is_active == True
    ).limit(10).all()
    
    for p in low_stock:
        alerts.append({
            "product": p.name,
            "available": p.quantity_on_hand,
            "requested": 0,
            "deficit": 0
        })
    
    return {"alerts": alerts, "total": len(alerts)}