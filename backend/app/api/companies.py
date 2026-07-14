from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.core.dependencies import get_current_user, get_current_admin
from app.models.company import Company
from app.models.auth import User

router = APIRouter()

@router.post("/subscription")
async def update_subscription(
    subscription_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Met à jour l'abonnement de l'entreprise de l'utilisateur connecté"""
    if not current_user.company_id:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    tier = subscription_data.get('tier', 'free')
    months = subscription_data.get('months', 1)
    
    company.subscription_tier = tier
    from datetime import datetime, timedelta
    company.subscription_expires = datetime.utcnow() + timedelta(days=30 * months)
    
    db.commit()
    db.refresh(company)
    
    return {
        "success": True,
        "subscription_tier": company.subscription_tier,
        "subscription_expires": company.subscription_expires
    }
