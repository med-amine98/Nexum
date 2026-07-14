from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.core.dependencies import get_current_user, get_current_admin
from app.models.auth import User
from app.models.product import Product
from app.models.stock import StockMovement, MovementType

router = APIRouter()

@router.get("/products")
async def get_inventory_products(
    skip: int = 0,
    limit: int = 100,
    low_stock: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupère les produits avec leurs stocks"""
    query = db.query(Product)
    
    if low_stock:
        query = query.filter(Product.quantity_on_hand < 10)
    
    products = query.offset(skip).limit(limit).all()
    
    result = []
    for product in products:
        result.append({
            "id": product.id,
            "name": product.name,
            "sku": product.sku,
            "quantity": product.quantity_on_hand,
            "unit_price": product.unit_price,
            "total_value": product.quantity_on_hand * product.unit_price
        })
    
    return result

@router.get("/movements")
async def get_stock_movements(
    skip: int = 0,
    limit: int = 100,
    product_id: Optional[int] = None,
    movement_type: Optional[MovementType] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupère les mouvements de stock"""
    query = db.query(StockMovement)
    
    if product_id:
        query = query.filter(StockMovement.product_id == product_id)
    if movement_type:
        query = query.filter(StockMovement.movement_type == movement_type)
    
    movements = query.order_by(StockMovement.created_at.desc()).offset(skip).limit(limit).all()
    return movements

@router.post("/movements")
async def create_stock_movement(
    product_id: int,
    quantity: float,
    movement_type: MovementType,
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Crée un mouvement de stock"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    previous_stock = product.quantity_on_hand
    
    if movement_type == MovementType.RECEIPT:
        new_stock = previous_stock + quantity
    elif movement_type == MovementType.SHIPMENT:
        if quantity > previous_stock:
            raise HTTPException(status_code=400, detail="Insufficient stock")
        new_stock = previous_stock - quantity
    else:
        new_stock = previous_stock
    
    # Mettre à jour le stock du produit
    product.quantity_on_hand = new_stock
    
    # Créer le mouvement
    movement = StockMovement(
        product_id=product_id,
        quantity=quantity,
        movement_type=movement_type,
        previous_stock=previous_stock,
        new_stock=new_stock,
        notes=notes,
        created_by=current_user.id
    )
    
    db.add(movement)
    db.commit()
    db.refresh(movement)
    
    return movement

@router.get("/dashboard/stats")
async def get_inventory_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Statistiques d'inventaire"""
    total_products = db.query(func.count(Product.id)).scalar() or 0
    total_value = db.query(func.sum(Product.quantity_on_hand * Product.unit_price)).scalar() or 0
    low_stock_products = db.query(func.count(Product.id)).filter(Product.quantity_on_hand < 10).scalar() or 0
    
    return {
        "total_products": total_products,
        "total_value": float(total_value),
        "low_stock_products": low_stock_products,
        "out_of_stock": 0
    }
