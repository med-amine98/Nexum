from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from datetime import datetime, timedelta
from typing import List, Optional
import random

from app.models.sale import SaleOrder, SaleOrderLine, OrderStatus, PaymentStatus
from app.models.partner import Partner
from app.models.product import Product
from app.schemas.sale import SaleOrderCreate, SaleOrderUpdate, OrderFilterParams

class SaleService:
    @staticmethod
    def generate_order_name(db: Session) -> str:
        """Génère un numéro de commande unique"""
        last_order = db.query(SaleOrder).order_by(SaleOrder.id.desc()).first()
        last_number = int(last_order.name.split('-')[-1]) if last_order else 0
        new_number = last_number + 1
        return f"SO-{datetime.now().year}-{str(new_number).zfill(4)}"
    
    @staticmethod
    def create_order(db: Session, order_data: SaleOrderCreate) -> SaleOrder:
        """Crée une nouvelle commande"""
        # Calcul des totaux
        amount_untaxed = sum(
            line.quantity * line.price_unit * (1 - line.discount/100)
            for line in order_data.lines
        )
        amount_tax = amount_untaxed * 0.20  # TVA 20%
        amount_total = amount_untaxed + amount_tax
        
        # Création de la commande
        db_order = SaleOrder(
            name=SaleService.generate_order_name(db),
            partner_id=order_data.partner_id,
            valid_until=order_data.valid_until,
            notes=order_data.notes,
            amount_untaxed=amount_untaxed,
            amount_tax=amount_tax,
            amount_total=amount_total,
            status=OrderStatus.DRAFT
        )
        db.add(db_order)
        db.flush()
        
        # Création des lignes
        for line_data in order_data.lines:
            product = db.query(Product).filter(Product.id == line_data.product_id).first()
            price_subtotal = line_data.quantity * line_data.price_unit * (1 - line_data.discount/100)
            
            db_line = SaleOrderLine(
                order_id=db_order.id,
                product_id=line_data.product_id,
                description=line_data.description or product.name,
                quantity=line_data.quantity,
                price_unit=line_data.price_unit,
                discount=line_data.discount,
                price_subtotal=price_subtotal
            )
            db.add(db_line)
        
        db.commit()
        db.refresh(db_order)
        return db_order
    
    @staticmethod
    def get_orders(db: Session, filters: OrderFilterParams) -> List[SaleOrder]:
        """Récupère les commandes avec filtres"""
        query = db.query(SaleOrder)
        
        if filters.status:
            query = query.filter(SaleOrder.status == filters.status)
        
        if filters.date_from:
            query = query.filter(SaleOrder.date_order >= filters.date_from)
        
        if filters.date_to:
            query = query.filter(SaleOrder.date_order <= filters.date_to)
        
        if filters.partner_id:
            query = query.filter(SaleOrder.partner_id == filters.partner_id)
        
        if filters.search:
            query = query.join(Partner).filter(
                or_(
                    SaleOrder.name.ilike(f"%{filters.search}%"),
                    Partner.name.ilike(f"%{filters.search}%")
                )
            )
        
        return query.order_by(SaleOrder.date_order.desc()).all()
    
    @staticmethod
    def confirm_order(db: Session, order_id: int) -> SaleOrder:
        """Confirme une commande"""
        order = db.query(SaleOrder).filter(SaleOrder.id == order_id).first()
        if order and order.status == OrderStatus.DRAFT:
            order.status = OrderStatus.CONFIRMED
            db.commit()
            db.refresh(order)
        return order
    
    @staticmethod
    def cancel_order(db: Session, order_id: int) -> SaleOrder:
        """Annule une commande"""
        order = db.query(SaleOrder).filter(SaleOrder.id == order_id).first()
        if order:
            order.status = OrderStatus.CANCELLED
            db.commit()
            db.refresh(order)
        return order