from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session
from app.dependencies import get_db
from app.models.subscription import SubscriptionPlan, CompanySubscription
from app.schemas.subscription import SubscriptionPlanCreate, SubscriptionPlanResponse, CompanySubscriptionCreate, CompanySubscriptionResponse, CompanySubscriptionUpdate
from typing import List

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])

@router.get("/plans", response_model=List[SubscriptionPlanResponse])
def list_plans(db: Session = Depends(get_db)):
    return db.query(SubscriptionPlan).filter(SubscriptionPlan.is_active == True).all()

@router.post("/company", response_model=CompanySubscriptionResponse, status_code=status.HTTP_201_CREATED)
def create_company_subscription(payload: CompanySubscriptionCreate, db: Session = Depends(get_db)):
    # In production, verify Stripe payment before creation
    sub = CompanySubscription(**payload.dict())
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub

@router.put("/company/{sub_id}", response_model=CompanySubscriptionResponse)
def update_company_subscription(sub_id: int, payload: CompanySubscriptionUpdate, db: Session = Depends(get_db)):
    sub = db.query(CompanySubscription).filter(CompanySubscription.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    for key, value in payload.dict(exclude_unset=True).items():
        setattr(sub, key, value)
    db.commit()
    db.refresh(sub)
    return sub

@router.delete("/company/{sub_id}", response_model=dict)
def cancel_subscription(sub_id: int, db: Session = Depends(get_db)):
    sub = db.query(CompanySubscription).filter(CompanySubscription.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    sub.status = "canceled"
    db.commit()
    return {"success": True, "message": "Subscription canceled"}
