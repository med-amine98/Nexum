from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.auth import User
from app.models.product import Product
from app.models.partner import Partner

router = APIRouter()

@router.get("/")
async def search(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    products = db.query(Product).filter(Product.name.ilike(f"%{q}%")).limit(5).all()
    partners = db.query(Partner).filter(Partner.name.ilike(f"%{q}%")).limit(5).all()
    
    return {
        "products": [{"id": p.id, "name": p.name} for p in products],
        "partners": [{"id": p.id, "name": p.name} for p in partners]
    }
