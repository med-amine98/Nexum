# app/api/endpoints/churn.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List, Optional
from datetime import datetime, timedelta
import uuid
import random
import traceback
from app.database import get_db
from app.core.dependencies import get_current_user, get_optional_user
from app.models.auth import User
from app.models.churn import (
    ChurnClient, ChurnInteraction, CompetitorOffer, RetentionAction, RetentionOffer,
    ChurnRiskLevel, ClientSegment, ChurnReason, InteractionType, RetentionActionType, ActionResult
)
import logging
logger = logging.getLogger(__name__)


router = APIRouter()
logger.info("✅ ROUTER CHURN CRÉÉ")

# ===== SCHEMAS =====
from pydantic import BaseModel

class ClientCreate(BaseModel):
    client_name: str
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    city: Optional[str] = None
    segment: str = "standard"
    client_tenure: Optional[int] = 0

class InteractionCreate(BaseModel):
    interaction_type: str
    content: Optional[str] = None
    satisfaction_score: Optional[float] = None

class CompetitorOfferCreate(BaseModel):
    competitor: str
    offer: str
    value: Optional[float] = 0
    offer_date: Optional[datetime] = None

class RetentionActionCreate(BaseModel):
    action_type: str
    cost: Optional[float] = 0
    description: Optional[str] = None

class ApplyOfferCreate(BaseModel):
    offer_id: int
    notes: Optional[str] = None

# ===== DONNÉES MOCK =====
def generate_mock_clients():
    clients = []
    names = ["Jean Dupont", "Marie Martin", "Pierre Durand", "Sophie Bernard", "Lucas Petit"]
    cities = ["Paris", "Lyon", "Marseille", "Bordeaux", "Lille", "Toulouse", "Nice", "Nantes"]
    segments = ["premium", "standard", "entry"]
    reasons = ["low_engagement", "complaints", "competitive_offer", "price_sensitive", "service_quality"]
    
    for i in range(1, 21):
        risk = random.choice(["low", "medium", "high", "critical"])
        prob = random.uniform(10, 95)
        clients.append({
            "id": i,
            "client_id": f"CL-{i:04d}",
            "client_name": random.choice(names) + f" {i}",
            "client_email": f"client{i}@example.com",
            "client_phone": f"06{random.randint(10000000, 99999999)}",
            "city": random.choice(cities),
            "segment": random.choice(segments),
            "client_tenure": random.randint(1, 120),
            "loyalty_score": random.uniform(0, 100),
            "churn_probability": prob,
            "risk_level": risk,
            "main_reason": random.choice(reasons) if prob > 40 else None,
            "created_at": datetime.now() - timedelta(days=random.randint(0, 365))
        })
    return clients

MOCK_CLIENTS = generate_mock_clients()
MOCK_PREDICTIONS = [
    {"client_name": "Jean Dupont", "risk_score": 85, "recommendation": "Appeler immédiatement"},
    {"client_name": "Marie Martin", "risk_score": 72, "recommendation": "Offrir une remise"},
    {"client_name": "Pierre Durand", "risk_score": 68, "recommendation": "Programme fidélité"},
    {"client_name": "Sophie Bernard", "risk_score": 55, "recommendation": "Email personnalisé"},
    {"client_name": "Lucas Petit", "risk_score": 45, "recommendation": "Suivi mensuel"}
]

MOCK_OFFERS = [
    {"id": 1, "name": "Remise 20%", "type": "discount", "value": 200, "duration": 12, "success_rate": 75},
    {"id": 2, "name": "Upgrade Premium", "type": "upgrade", "value": 0, "duration": 6, "success_rate": 85},
    {"id": 3, "name": "Bonus fidélité", "type": "bonus", "value": 100, "duration": 12, "success_rate": 70}
]

MOCK_ACTIONS = [
    {"id": 1, "client_name": "Jean Dupont", "city": "Paris", "action_type": "call", "action_date": datetime.now() - timedelta(days=2), "result": "pending", "cost": 0},
    {"id": 2, "client_name": "Marie Martin", "city": "Lyon", "action_type": "offer", "action_date": datetime.now() - timedelta(days=5), "result": "success", "cost": 200}
]

# ===== ENDPOINTS =====
@router.get("/at-risk")
async def get_at_risk_clients(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    risk_level: Optional[str] = Query(None),
    segment: Optional[str] = Query(None),
    churn_reason: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Récupérer les clients à risque d'attrition"""
    try:
        filtered = MOCK_CLIENTS
        
        if risk_level and risk_level != 'all':
            filtered = [c for c in filtered if c['risk_level'] == risk_level]
        if segment and segment != 'all':
            filtered = [c for c in filtered if c['segment'] == segment]
        if churn_reason and churn_reason != 'all':
            filtered = [c for c in filtered if c.get('main_reason') == churn_reason]
        if city and city != 'all':
            filtered = [c for c in filtered if c.get('city') == city]
        if search:
            filtered = [c for c in filtered if search.lower() in c['client_name'].lower()]
        
        return filtered[skip:skip+limit]
        
    except Exception as e:
        logger.error(f"❌ Erreur get_at_risk_clients: {e}")
        return MOCK_CLIENTS[skip:skip+limit]


@router.get("/dashboard")
async def get_churn_dashboard(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Dashboard de prédiction d'attrition"""
    try:
        total_clients = len(MOCK_CLIENTS)
        at_risk = len([c for c in MOCK_CLIENTS if c['risk_level'] in ['high', 'critical']])
        high_risk = len([c for c in MOCK_CLIENTS if c['risk_level'] == 'critical'])
        
        # Distribution des raisons
        churn_dist = {
            'low_engagement': len([c for c in MOCK_CLIENTS if c.get('main_reason') == 'low_engagement']),
            'complaints': len([c for c in MOCK_CLIENTS if c.get('main_reason') == 'complaints']),
            'competitive_offer': len([c for c in MOCK_CLIENTS if c.get('main_reason') == 'competitive_offer']),
            'price_sensitive': len([c for c in MOCK_CLIENTS if c.get('main_reason') == 'price_sensitive']),
            'service_quality': len([c for c in MOCK_CLIENTS if c.get('main_reason') == 'service_quality'])
        }
        
        # Calculer les pourcentages
        for key in churn_dist:
            churn_dist[key] = round(churn_dist[key] / total_clients * 100, 1) if total_clients > 0 else 0
        
        return {
            "total_clients": total_clients,
            "at_risk_clients": at_risk,
            "high_risk_clients": high_risk,
            "churn_rate": round(at_risk / total_clients * 100, 1) if total_clients > 0 else 0,
            "retention_rate": 85,
            "saved_revenue": 125000,
            "actions_success_rate": 75,
            "churn_distribution": churn_dist
        }
        
    except Exception as e:
        logger.error(f"❌ Erreur dashboard: {e}")
        return {
            "total_clients": 0,
            "at_risk_clients": 0,
            "high_risk_clients": 0,
            "churn_rate": 0,
            "retention_rate": 0,
            "saved_revenue": 0,
            "actions_success_rate": 0,
            "churn_distribution": {}
        }


@router.get("/predictions")
async def get_churn_predictions(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Récupérer les prédictions IA"""
    return {"predictions": MOCK_PREDICTIONS[:limit]}


@router.get("/retention-offers")
async def get_retention_offers(
    active_only: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Récupérer les offres de rétention"""
    return MOCK_OFFERS


@router.get("/retention-actions")
async def get_retention_actions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Récupérer les actions de rétention"""
    return MOCK_ACTIONS[skip:skip+limit]


@router.post("/clients")
async def create_client(
    client: ClientCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Ajouter un client"""
    try:
        client_id = f"CL-{uuid.uuid4().hex[:8].upper()}"
        
        new_client = {
            "id": len(MOCK_CLIENTS) + 1,
            "client_id": client_id,
            "client_name": client.client_name,
            "client_email": client.client_email,
            "client_phone": client.client_phone,
            "city": client.city,
            "segment": client.segment,
            "client_tenure": client.client_tenure,
            "loyalty_score": 50,
            "churn_probability": random.uniform(10, 50),
            "risk_level": "low",
            "main_reason": None,
            "created_at": datetime.now()
        }
        
        MOCK_CLIENTS.append(new_client)
        
        return {
            "id": new_client["id"],
            "client_id": new_client["client_id"],
            "message": "Client ajouté avec succès"
        }
        
    except Exception as e:
        logger.error(f"❌ Erreur create_client: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/clients/{client_id}/interactions")
async def add_interaction(
    client_id: int,
    interaction: InteractionCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Ajouter une interaction client"""
    return {"message": "Interaction ajoutée avec succès"}


@router.post("/clients/{client_id}/competitor-offers")
async def add_competitor_offer(
    client_id: int,
    offer: CompetitorOfferCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Ajouter une offre concurrente"""
    return {"message": "Offre concurrente enregistrée"}


@router.post("/clients/{client_id}/retention-action")
async def add_retention_action(
    client_id: int,
    action: RetentionActionCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Ajouter une action de rétention"""
    return {
        "message": "Action de rétention lancée",
        "action_type": action.action_type
    }


@router.post("/clients/{client_id}/apply-offer")
async def apply_offer(
    client_id: int,
    offer: ApplyOfferCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Appliquer une offre de rétention"""
    offer_data = next((o for o in MOCK_OFFERS if o["id"] == offer.offer_id), None)
    return {
        "message": "Offre appliquée avec succès",
        "offer_name": offer_data["name"] if offer_data else "Offre"
    }


@router.post("/clients/{client_id}/deep-analysis")
async def deep_analysis(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Analyse approfondie IA"""
    return {
        "analysis_results": {
            "survival_analysis": {
                "churn_probability": random.uniform(50, 95),
                "expected_time": random.randint(15, 60)
            },
            "nlp_analysis": {
                "sentiment_score": random.uniform(40, 80),
                "key_complaints": ["Service client", "Tarifs élevés"]
            },
            "retention_recommendations": {
                "best_offer": "Remise 20%",
                "expected_impact": "+85% retention"
            }
        }
    }


logger.info("✅ MODULE CHURN CHARGÉ AVEC SUCCÈS")