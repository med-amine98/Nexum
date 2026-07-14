# app/routes/companies.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.company import Company

# ✅ Vérifier que le router est bien défini
router = APIRouter(prefix="/api/v1/companies", tags=["companies"])

@router.get("/")
async def get_companies(
    db: Session = Depends(get_db)
):
    """Récupérer toutes les entreprises"""
    try:
        companies = db.query(Company).all()
        return companies
    except Exception as e:
        print(f"Erreur get_companies: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{company_id}")
async def get_company(
    company_id: int,
    db: Session = Depends(get_db)
):
    """Récupérer une entreprise par ID"""
    try:
        company = db.query(Company).filter(Company.id == company_id).first()
        if not company:
            raise HTTPException(status_code=404, detail="Entreprise non trouvée")
        return company
    except Exception as e:
        print(f"Erreur get_company: {e}")
        raise HTTPException(status_code=500, detail=str(e))