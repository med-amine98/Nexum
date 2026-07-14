from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.auth import User
from app.models.company import Company
from app.models.saas import SubscriptionPlan, SaaSPayment, PaymentStatus
from app.services.billing_service import billing_service
from typing import List
import uuid

router = APIRouter()

@router.get("/plans")
async def get_plans(db: Session = Depends(get_db)):
    return db.query(SubscriptionPlan).filter(SubscriptionPlan.is_active == True).all()

@router.post("/subscribe")
async def create_subscription(
    plan_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="L'utilisateur n'est pas associé à une entreprise")
    
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.code == plan_code).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan non trouvé")
    
    # Créer une intention de paiement
    payment = SaaSPayment(
        company_id=current_user.company_id,
        plan_id=plan.id,
        amount=plan.price,
        status=PaymentStatus.PENDING,
        payment_method="simulation",
        transaction_id=str(uuid.uuid4())
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    
    return {
        "message": "Intention de paiement créée",
        "payment_id": payment.id,
        "amount": payment.amount,
        "status": payment.status
    }

@router.post("/payments/{payment_id}/validate")
async def validate_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # En production, cela serait fait via un webhook Stripe ou par un admin
    payment = db.query(SaaSPayment).filter(SaaSPayment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Paiement non trouvé")
    
    if payment.status == PaymentStatus.PAID:
        return {"message": "Paiement déjà validé"}
    
    # Mettre à jour le statut du paiement
    payment.status = PaymentStatus.PAID
    
    # Mettre à jour l'entreprise
    company = db.query(Company).filter(Company.id == payment.company_id).first()
    if company:
        company.subscription_tier = payment.plan.code
        # Ajouter 30 jours à la date d'expiration
        from datetime import datetime, timedelta
        company.subscription_expires = datetime.now() + timedelta(days=30)
        company.is_active = True
    
    db.commit()
    
    # Générer la facture PDF finale
    invoice = billing_service.generate_invoice_pdf(company, payment.amount, payment.plan.code)
    payment.invoice_path = invoice["path"]
    db.commit()
    
    return {
        "message": "Paiement validé avec succès. Abonnement activé.",
        "tier": company.subscription_tier,
        "expires": company.subscription_expires.isoformat()
    }

@router.get("/my-subscription")
async def get_my_subscription(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="Aucune entreprise associée")
    
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    return {
        "tier": company.subscription_tier,
        "expires": company.subscription_expires,
        "is_active": company.is_active,
        "payment_history": db.query(SaaSPayment).filter(SaaSPayment.company_id == company.id).all()
    }

@router.get("/all-payments")
async def get_all_payments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not getattr(current_user, "is_super_admin", False):
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    
    payments = db.query(SaaSPayment).all()
    return [
        {
            "id": p.id,
            "company_name": p.company.name,
            "plan_name": p.plan.name,
            "amount": p.amount,
            "status": p.status,
            "date": p.created_at,
            "transaction_id": p.transaction_id
        } for p in payments
    ]
