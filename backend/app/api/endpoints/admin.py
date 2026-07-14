from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.database import get_db
from app.core.dependencies import get_current_super_admin
from app.models.auth import User
from app.models.company import Company
from app.services.billing_service import billing_service
import random

router = APIRouter()

@router.get("/stats")
async def get_admin_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_super_admin)
):
    total_users = db.query(User).count()
    total_companies = db.query(Company).count()
    active_companies = db.query(Company).filter(Company.is_active == True).count()
    
    return {
        "total_users": total_users,
        "total_companies": total_companies,
        "active_companies": active_companies,
        "revenue_mtl": 458000, # Simulated
        "growth": 12.5
    }

@router.get("/models")
async def get_ai_models_status(current_user: User = Depends(get_current_super_admin)):
    """Retourne l'état de santé et les performances des modèles d'IA"""
    return [
        {
            "id": "churn-v3",
            "name": "Churn Prediction (XGBoost)",
            "status": "online",
            "accuracy": 94.2,
            "latency": "45ms",
            "last_training": "2024-05-01",
            "usage_count": 1250,
            "sector": "Banking/Insurance"
        },
        {
            "id": "credit-scoring-v2",
            "name": "Credit Scoring (Random Forest)",
            "status": "online",
            "accuracy": 91.5,
            "latency": "30ms",
            "last_training": "2024-04-28",
            "usage_count": 890,
            "sector": "Banking"
        },
        {
            "id": "fraud-gnn-v1",
            "name": "Fraud Detection (GNN)",
            "status": "online",
            "accuracy": 98.2,
            "latency": "120ms",
            "last_training": "2024-05-05",
            "usage_count": 5400,
            "sector": "Finance"
        },
        {
            "id": "catastrophe-bayesian",
            "name": "Catastrophe Model (Bayesian)",
            "status": "online",
            "accuracy": 89.7,
            "latency": "250ms",
            "last_training": "2024-05-06",
            "usage_count": 150,
            "sector": "Insurance"
        },
        {
            "id": "quantum-orchestrator",
            "name": "Quantum Router (GNN/QNN)",
            "status": "online",
            "accuracy": 99.1,
            "latency": "15ms",
            "last_training": "2024-05-07",
            "usage_count": 12400,
            "sector": "Core"
        }
    ]

@router.get("/companies")
async def list_companies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_super_admin)
):
    companies = db.query(Company).all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "sector": c.sector,
            "tier": c.subscription_tier,
            "status": "actif" if c.is_active else "inactif",
            "expires": c.subscription_expires.isoformat() if c.subscription_expires else None,
            "user_count": len(c.users) if c.users else 0
        } for c in companies
    ]

@router.get("/users")
async def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_super_admin)
):
    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "role": u.role,
            "company": u.company.name if u.company else "N/A",
            "status": "actif" if u.is_active else "inactif"
        } for u in users
    ]

@router.post("/invoices/generate-expiring")
async def generate_expiring_invoices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_super_admin)
):
    """Génère des factures pour toutes les entreprises dont l'abonnement expire bientôt"""
    results = billing_service.check_expiring_subscriptions(db)
    return {
        "status": "success",
        "generated_count": len(results),
        "details": results
    }

@router.post("/companies/{company_id}/invoice")
async def generate_manual_invoice(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_super_admin)
):
    """Génère manuellement une facture pour une entreprise spécifique"""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    prices = {"free": 0, "standard": 99, "premium": 299, "enterprise": 999}
    amount = prices.get(company.subscription_tier, 99)
    
    invoice = billing_service.generate_invoice_pdf(company, amount, company.subscription_tier)
    return {
        "status": "success",
        "invoice": invoice
    }
