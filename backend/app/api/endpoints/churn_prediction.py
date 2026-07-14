# app/api/endpoints/churn_prediction.py
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

router = APIRouter()
import logging
logger = logging.getLogger(__name__)
logger.info("✅ ROUTER CHURN PREDICTION CRÉÉ")

# ===== DONNÉES MOCK POUR LE CHURN =====
def generate_mock_churn_clients():
    clients = []
    names = ["Jean Dupont", "Marie Martin", "Pierre Durand", "Sophie Bernard", "Lucas Petit", 
             "Isabelle Lambert", "Thomas Moreau", "Julie Renard", "Nicolas Leroy", "Céline Girard"]
    cities = ["Paris", "Lyon", "Marseille", "Bordeaux", "Lille", "Toulouse", "Nice", "Nantes", 
              "Strasbourg", "Montpellier", "Rennes", "Grenoble"]
    segments = ["premium", "standard", "entry"]
    reasons = ["low_engagement", "complaints", "competitive_offer", "price_sensitive", "service_quality"]
    
    for i in range(1, 31):
        risk = random.choice(["low", "medium", "high", "critical"])
        prob = random.uniform(10, 95)
        clients.append({
            "id": i,
            "client_id": f"CL-{i:04d}",
            "client_name": random.choice(names),
            "client_email": f"client{i}@example.com",
            "client_phone": f"06{random.randint(10000000, 99999999)}",
            "city": random.choice(cities),
            "segment": random.choice(segments),
            "client_tenure": random.randint(1, 120),
            "loyalty_score": random.uniform(0, 100),
            "churn_probability": prob,
            "risk_level": risk,
            "main_reason": random.choice(reasons) if prob > 40 else None,
            "created_at": (datetime.now() - timedelta(days=random.randint(0, 365))).isoformat()
        })
    return clients

MOCK_CHURN_CLIENTS = generate_mock_churn_clients()
MOCK_CHURN_PREDICTIONS = [
    {"id": 1, "client_name": "Jean Dupont", "risk_score": 85, "risk_level": "critical", "recommendation": "Appeler immédiatement pour une offre personnalisée"},
    {"id": 2, "client_name": "Marie Martin", "risk_score": 72, "risk_level": "high", "recommendation": "Offrir une remise de 20% sur les frais"},
    {"id": 3, "client_name": "Pierre Durand", "risk_score": 68, "risk_level": "high", "recommendation": "Proposer un programme de fidélité"},
    {"id": 4, "client_name": "Sophie Bernard", "risk_score": 55, "risk_level": "medium", "recommendation": "Envoyer un email personnalisé"},
    {"id": 5, "client_name": "Lucas Petit", "risk_score": 45, "risk_level": "medium", "recommendation": "Suivi mensuel avec conseiller"},
    {"id": 6, "client_name": "Isabelle Lambert", "risk_score": 82, "risk_level": "critical", "recommendation": "Intervention immédiate - réclamation en cours"},
    {"id": 7, "client_name": "Thomas Moreau", "risk_score": 38, "risk_level": "low", "recommendation": "Newsletter mensuelle"}
]

MOCK_RETENTION_OFFERS = [
    {"id": 1, "name": "Remise 20%", "type": "discount", "value": 200, "duration": 12, "success_rate": 75},
    {"id": 2, "name": "Upgrade Premium", "type": "upgrade", "value": 0, "duration": 6, "success_rate": 85},
    {"id": 3, "name": "Bonus fidélité", "type": "bonus", "value": 100, "duration": 12, "success_rate": 70},
    {"id": 4, "name": "Offre découverte", "type": "discount", "value": 50, "duration": 3, "success_rate": 60}
]

MOCK_RETENTION_ACTIONS = [
    {"id": 1, "client_name": "Jean Dupont", "city": "Paris", "action_type": "call", "action_date": (datetime.now() - timedelta(days=2)).isoformat(), "result": "pending", "cost": 0},
    {"id": 2, "client_name": "Marie Martin", "city": "Lyon", "action_type": "offer", "action_date": (datetime.now() - timedelta(days=5)).isoformat(), "result": "success", "cost": 200},
    {"id": 3, "client_name": "Pierre Durand", "city": "Marseille", "action_type": "email", "action_date": (datetime.now() - timedelta(days=1)).isoformat(), "result": "pending", "cost": 0},
    {"id": 4, "client_name": "Sophie Bernard", "city": "Bordeaux", "action_type": "meeting", "action_date": (datetime.now() - timedelta(days=3)).isoformat(), "result": "success", "cost": 150}
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
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Récupérer les clients à risque d'attrition"""
    try:
        filtered = MOCK_CHURN_CLIENTS
        
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
        traceback.print_exc()
        return MOCK_CHURN_CLIENTS[skip:skip+limit]


@router.get("/dashboard")
async def get_churn_dashboard(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Dashboard de prédiction d'attrition clients"""
    try:
        total_clients = len(MOCK_CHURN_CLIENTS)
        at_risk = len([c for c in MOCK_CHURN_CLIENTS if c['risk_level'] in ['high', 'critical']])
        high_risk = len([c for c in MOCK_CHURN_CLIENTS if c['risk_level'] == 'critical'])
        medium_risk = len([c for c in MOCK_CHURN_CLIENTS if c['risk_level'] == 'medium'])
        low_risk = len([c for c in MOCK_CHURN_CLIENTS if c['risk_level'] == 'low'])
        
        # Distribution des raisons
        churn_dist = {
            'low_engagement': len([c for c in MOCK_CHURN_CLIENTS if c.get('main_reason') == 'low_engagement']),
            'complaints': len([c for c in MOCK_CHURN_CLIENTS if c.get('main_reason') == 'complaints']),
            'competitive_offer': len([c for c in MOCK_CHURN_CLIENTS if c.get('main_reason') == 'competitive_offer']),
            'price_sensitive': len([c for c in MOCK_CHURN_CLIENTS if c.get('main_reason') == 'price_sensitive']),
            'service_quality': len([c for c in MOCK_CHURN_CLIENTS if c.get('main_reason') == 'service_quality'])
        }
        
        # Calculer les pourcentages
        for key in churn_dist:
            churn_dist[key] = round(churn_dist[key] / total_clients * 100, 1) if total_clients > 0 else 0
        
        # Distribution par ville
        city_dist = {}
        for c in MOCK_CHURN_CLIENTS:
            city = c.get('city', 'Paris')
            if city not in city_dist:
                city_dist[city] = {'total': 0, 'high_risk': 0}
            city_dist[city]['total'] += 1
            if c['risk_level'] in ['high', 'critical']:
                city_dist[city]['high_risk'] += 1
        
        return {
            "total_clients": total_clients,
            "at_risk_clients": at_risk,
            "high_risk_clients": high_risk,
            "medium_risk_clients": medium_risk,
            "low_risk_clients": low_risk,
            "churn_rate": round(at_risk / total_clients * 100, 1) if total_clients > 0 else 0,
            "retention_rate": 85,
            "saved_revenue": 125000,
            "actions_success_rate": 75,
            "churn_distribution": churn_dist,
            "city_distribution": city_dist
        }
        
    except Exception as e:
        logger.error(f"❌ Erreur dashboard: {e}")
        traceback.print_exc()
        return {
            "total_clients": 0,
            "at_risk_clients": 0,
            "high_risk_clients": 0,
            "medium_risk_clients": 0,
            "low_risk_clients": 0,
            "churn_rate": 0,
            "retention_rate": 0,
            "saved_revenue": 0,
            "actions_success_rate": 0,
            "churn_distribution": {},
            "city_distribution": {}
        }


@router.get("/predictions")
async def get_churn_predictions(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Récupérer les prédictions IA d'attrition"""
    return {
        "predictions": MOCK_CHURN_PREDICTIONS[:limit],
        "high_risk": len([p for p in MOCK_CHURN_PREDICTIONS if p['risk_level'] in ['critical', 'high']]),
        "medium_risk": len([p for p in MOCK_CHURN_PREDICTIONS if p['risk_level'] == 'medium']),
        "low_risk": len([p for p in MOCK_CHURN_PREDICTIONS if p['risk_level'] == 'low'])
    }


@router.get("/retention-offers")
async def get_retention_offers(
    active_only: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Récupérer les offres de rétention disponibles"""
    return MOCK_RETENTION_OFFERS


@router.get("/retention-actions")
async def get_retention_actions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Récupérer les actions de rétention réalisées"""
    return MOCK_RETENTION_ACTIONS[skip:skip+limit]


@router.post("/clients")
async def create_churn_client(
    client_data: dict,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Ajouter un client"""
    try:
        client_id = f"CL-{uuid.uuid4().hex[:8].upper()}"
        
        new_client = {
            "id": len(MOCK_CHURN_CLIENTS) + 1,
            "client_id": client_id,
            "client_name": client_data.get("client_name"),
            "client_email": client_data.get("client_email"),
            "client_phone": client_data.get("client_phone"),
            "city": client_data.get("city", "Paris"),
            "segment": client_data.get("segment", "standard"),
            "client_tenure": client_data.get("client_tenure", 0),
            "loyalty_score": 50,
            "churn_probability": random.uniform(10, 50),
            "risk_level": "low",
            "main_reason": None,
            "created_at": datetime.now().isoformat()
        }
        
        MOCK_CHURN_CLIENTS.append(new_client)
        
        return {
            "id": new_client["id"],
            "client_id": new_client["client_id"],
            "message": "Client ajouté avec succès"
        }
        
    except Exception as e:
        logger.error(f"❌ Erreur create_churn_client: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/clients/{client_id}")
async def get_churn_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Récupérer les détails d'un client"""
    try:
        for client in MOCK_CHURN_CLIENTS:
            if client["id"] == client_id:
                # Ajouter des interactions simulées
                client["interactions"] = [
                    {"id": 1, "type": "call", "content": "Appel de suivi mensuel", "date": (datetime.now() - timedelta(days=10)).isoformat()},
                    {"id": 2, "type": "email", "content": "Newsletter promotionnelle", "date": (datetime.now() - timedelta(days=5)).isoformat()}
                ]
                client["competitor_offers"] = []
                return client
        
        return MOCK_CHURN_CLIENTS[0]
        
    except Exception as e:
        logger.error(f"❌ Erreur get_churn_client: {e}")
        return MOCK_CHURN_CLIENTS[0]


@router.post("/clients/{client_id}/interactions")
async def add_churn_interaction(
    client_id: int,
    interaction: dict,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Ajouter une interaction client"""
    return {"message": "Interaction ajoutée avec succès"}


@router.post("/clients/{client_id}/competitor-offers")
async def add_churn_competitor_offer(
    client_id: int,
    offer: dict,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Ajouter une offre concurrente"""
    return {"message": "Offre concurrente enregistrée"}


@router.post("/clients/{client_id}/retention-action")
async def add_churn_retention_action(
    client_id: int,
    action: dict,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Ajouter une action de rétention"""
    return {
        "message": "Action de rétention lancée",
        "action_type": action.get("action_type", "call")
    }


@router.post("/clients/{client_id}/apply-offer")
async def apply_churn_offer(
    client_id: int,
    offer_data: dict,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Appliquer une offre de rétention"""
    offer_id = offer_data.get("offer_id")
    offer = next((o for o in MOCK_RETENTION_OFFERS if o["id"] == offer_id), None)
    return {
        "message": "Offre appliquée avec succès",
        "offer_name": offer["name"] if offer else "Offre standard"
    }


@router.post("/clients/{client_id}/deep-analysis")
async def deep_churn_analysis(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Analyse approfondie IA d'attrition"""
    return {
        "analysis_results": {
            "survival_analysis": {
                "churn_probability": random.uniform(50, 95),
                "expected_time": random.randint(15, 60)
            },
            "nlp_analysis": {
                "sentiment_score": random.uniform(40, 80),
                "key_complaints": ["Service client", "Tarifs élevés", "Manque de réactivité"]
            },
            "retention_recommendations": {
                "best_offer": "Remise 20% pendant 6 mois",
                "expected_impact": "+85% retention"
            }
        }
    }


logger.info("✅ MODULE CHURN PREDICTION CHARGÉ AVEC SUCCÈS")