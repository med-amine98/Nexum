from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.auth import User

router = APIRouter()

@router.get("/zones")
async def get_zones(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return []

@router.get("/dashboard")
async def get_catastrophe_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return {"total_zones": 0, "high_risk_zones": 0}
