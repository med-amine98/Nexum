from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.core.dependencies import get_current_user, get_current_admin
from app.models.auth import User
from app.models.product import Product
from app.models.stock import StockMovement

router = APIRouter(prefix="/products", tags=["Products"])

@router.get("/")
async def get_products(
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupère la liste des produits"""
    query = db.query(Product).filter(Product.company_id == current_user.company_id)
    
    if search:
        query = query.filter(Product.name.ilike(f"%{search}%"))
    
    products = query.offset(skip).limit(limit).all()
    return products

@router.post("/")
async def create_product(
    name: str,
    sku: str,
    unit_price: float = 0.0,
    description: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Crée un nouveau produit"""
    product = Product(
        name=name,
        sku=sku,
        unit_price=unit_price,
        description=description,
        company_id=current_user.company_id
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product
