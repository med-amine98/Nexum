# app/api/churn.py
# -*- coding: utf-8 -*-

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timedelta
import logging
import uuid
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_, or_

from app.core.dependencies import get_current_user
from app.models.auth import User
from app.models.churn import (
    ChurnClient, ChurnInteraction, CompetitorOffer, RetentionAction, 
    RetentionOffer, ChurnRiskLevel, ClientSegment, ChurnReason, 
    InteractionType, RetentionActionType, ActionResult
)
from app.services.churn_prediction_ai import churn_prediction_ai
from app.database import get_db

logger = logging.getLogger(__name__)
logger.info("🔧 CHARGEMENT DU MODULE CHURN PREDICTION...")
router = APIRouter(prefix="/churn-prediction", tags=["Churn Prediction"])
logger.info("✅ ROUTER CHURN PREDICTION CRÉÉ")

# ===== SCHEMAS PYDANTIC =====
from pydantic import BaseModel, Field

class AtRiskClientResponse(BaseModel):
    id: int
    client_id: str
    client_name: str
    client_email: Optional[str]
    city: Optional[str]
    segment: str
    client_tenure: int
    loyalty_score: float
    churn_probability: float
    risk_level: str
    main_reason: Optional[str]
    interactions_count: int
    competitor_offers_count: int

class ClientInteractionCreate(BaseModel):
    interaction_type: str
    content: Optional[str] = None
    satisfaction_score: Optional[float] = 0

class CompetitorOfferCreate(BaseModel):
    competitor: str
    offer: str
    value: Optional[float] = 0

class RetentionActionCreate(BaseModel):
    action_type: str
    cost: Optional[float] = 0
    description: Optional[str] = None

class ApplyOfferRequest(BaseModel):
    offer_id: int
    notes: Optional[str] = None

class ClientCreate(BaseModel):
    client_name: str
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    city: Optional[str] = None
    segment: str = "standard"
    client_tenure: int = 0
    loyalty_score: float = 50

class DeepAnalysisResponse(BaseModel):
    churn_probability: float
    risk_level: str
    main_reason: str
    risk_factors: List[str]
    recommendations: List[dict]
    interactions_analysis: dict
    competitor_analysis: dict

# ===== ENDPOINTS =====
@router.get("/at-risk", response_model=List[AtRiskClientResponse])
async def get_at_risk_clients(
    risk_level: Optional[str] = Query(None, description="Niveau de risque"),
    segment: Optional[str] = Query(None, description="Segment client"),
    churn_reason: Optional[str] = Query(None, description="Raison d'attrition"),
    city: Optional[str] = Query(None, description="Ville"),
    search: Optional[str] = Query(None, description="Recherche"),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Récupérer les clients à risque d'attrition avec analyse IA"""
    try:
        query = db.query(ChurnClient)
        
        if risk_level and risk_level != 'all':
            query = query.filter(ChurnClient.risk_level == risk_level)
        if segment and segment != 'all':
            query = query.filter(ChurnClient.segment == segment)
        if city and city != 'all':
            query = query.filter(ChurnClient.city == city)
        if search:
            query = query.filter(ChurnClient.client_name.ilike(f"%{search}%"))
        if start_date:
            query = query.filter(ChurnClient.created_at >= start_date)
        if end_date:
            query = query.filter(ChurnClient.created_at <= end_date)
        
        clients = query.order_by(desc(ChurnClient.churn_probability)).limit(100).all()
        
        # Mettre à jour les probabilités avec l'IA pour chaque client
        results = []
        for client in clients:
            # Récupérer les interactions et offres concurrentes
            interactions = db.query(ChurnInteraction).filter(
                ChurnInteraction.client_id == client.id
            ).all()
            
            competitor_offers = db.query(CompetitorOffer).filter(
                CompetitorOffer.client_id == client.id
            ).all()
            
            # Préparer les données pour l'IA
            client_data = {
                "id": client.id,
                "client_name": client.client_name,
                "client_tenure": client.client_tenure,
                "loyalty_score": client.loyalty_score,
                "segment": client.segment,
                "interactions": [{
                    "interaction_type": i.interaction_type,
                    "satisfaction_score": i.satisfaction_score,
                    "interaction_date": i.interaction_date
                } for i in interactions],
                "competitor_offers": [{"competitor": o.competitor} for o in competitor_offers]
            }
            
            # Calculer la probabilité avec l'IA
            prediction = churn_prediction_ai.calculate_churn_probability(client_data)
            
            # Mettre à jour le client en base si nécessaire
            if abs(client.churn_probability - prediction["churn_probability"]) > 5:
                client.churn_probability = prediction["churn_probability"]
                client.risk_level = prediction["risk_level"]
                client.main_reason = prediction["main_reason"]
                db.commit()
            
            results.append(AtRiskClientResponse(
                id=client.id,
                client_id=client.client_id,
                client_name=client.client_name,
                client_email=client.client_email,
                city=client.city,
                segment=client.segment,
                client_tenure=client.client_tenure or 0,
                loyalty_score=client.loyalty_score or 0,
                churn_probability=client.churn_probability or 0,
                risk_level=client.risk_level or "low",
                main_reason=client.main_reason,
                interactions_count=len(interactions),
                competitor_offers_count=len(competitor_offers)
            ))
        
        return results
        
    except Exception as e:
        logger.error(f"Erreur get_at_risk_clients: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dashboard")
async def get_churn_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Dashboard de prédiction d'attrition"""
    try:
        total_clients = db.query(ChurnClient).count()
        
        # Compter les clients par niveau de risque
        risk_counts = {
            "critical": db.query(ChurnClient).filter(ChurnClient.risk_level == "critical").count(),
            "high": db.query(ChurnClient).filter(ChurnClient.risk_level == "high").count(),
            "medium": db.query(ChurnClient).filter(ChurnClient.risk_level == "medium").count(),
            "low": db.query(ChurnClient).filter(ChurnClient.risk_level == "low").count()
        }
        
        at_risk_clients = risk_counts["critical"] + risk_counts["high"]
        high_risk_clients = risk_counts["critical"]
        
        # Calculer le taux d'attrition réel (clients perdus)
        # Pour l'instant, on utilise une simulation basée sur les actions échouées
        failed_actions = db.query(RetentionAction).filter(
            RetentionAction.result == "failed"
        ).count()
        
        total_actions = db.query(RetentionAction).count() or 1
        churn_rate = (failed_actions / total_actions) * 100 if total_actions > 0 else 15
        
        # Taux de rétention
        success_actions = db.query(RetentionAction).filter(
            RetentionAction.result == "success"
        ).count()
        retention_rate = (success_actions / total_actions) * 100 if total_actions > 0 else 85
        
        # Revenu préservé estimé
        saved_revenue = high_risk_clients * 2500  # Estimation
        
        # Analyse des raisons d'attrition
        reason_counts = {}
        for reason in ["low_engagement", "complaints", "competitive_offer", "price_sensitive", "service_quality"]:
            count = db.query(ChurnClient).filter(ChurnClient.main_reason == reason).count()
            if count > 0 or total_clients > 0:
                reason_counts[reason] = round((count / max(total_clients, 1)) * 100, 1)
        
        # Récupérer les actions récentes
        recent_actions = db.query(RetentionAction).order_by(
            desc(RetentionAction.action_date)
        ).limit(5).all()
        
        recent_alerts = []
        for action in recent_actions:
            client = db.query(ChurnClient).filter(ChurnClient.id == action.client_id).first()
            if client:
                recent_alerts.append({
                    "id": action.id,
                    "severity": "high" if action.action_type == "call" and client.risk_level == "critical" else "medium",
                    "description": f"Action de rétention - {action.action_type} pour {client.client_name}",
                    "detection_method": "AI Churn Prediction",
                    "fraud_type": action.action_type,
                    "time": f"Il y a {(datetime.utcnow() - action.action_date).seconds // 3600} heures",
                    "resolved": action.result == "success"
                })
        
        return {
            "total_clients": total_clients,
            "at_risk_clients": at_risk_clients,
            "high_risk_clients": high_risk_clients,
            "churn_rate": round(churn_rate, 1),
            "retention_rate": round(retention_rate, 1),
            "saved_revenue": round(saved_revenue, 2),
            "actions_success_rate": round((success_actions / max(total_actions, 1)) * 100, 1),
            "churn_distribution": reason_counts,
            "recent_alerts": recent_alerts
        }
        
    except Exception as e:
        logger.error(f"Erreur dashboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/predictions")
async def get_churn_predictions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Prédictions d'attrition avec IA"""
    try:
        # Récupérer les clients à haut risque
        high_risk_clients = db.query(ChurnClient).filter(
            ChurnClient.risk_level.in_(["critical", "high"])
        ).order_by(desc(ChurnClient.churn_probability)).limit(10).all()
        
        predictions = []
        for client in high_risk_clients:
            # Récupérer les données pour l'IA
            interactions = db.query(ChurnInteraction).filter(
                ChurnInteraction.client_id == client.id
            ).all()
            
            recommendations = churn_prediction_ai.get_retention_recommendations({
                "churn_probability": client.churn_probability,
                "client_tenure": client.client_tenure,
                "segment": client.segment,
                "main_reason": client.main_reason,
                "interactions": [{"interaction_type": i.interaction_type} for i in interactions]
            })
            
            predictions.append({
                "id": client.id,
                "client_name": client.client_name,
                "city": client.city,
                "risk_score": client.churn_probability,
                "risk_level": client.risk_level,
                "main_reason": client.main_reason,
                "detection_method": "AI Ensemble (XGBoost/LightGBM)",
                "recommendation": recommendations[0]["description"] if recommendations else "Analyse standard recommandée"
            })
        
        return {
            "predictions": predictions,
            "high_risk": len([p for p in predictions if p["risk_level"] == "critical"]),
            "medium_risk": len([p for p in predictions if p["risk_level"] == "high"]),
            "low_risk": 0,
            "detection_methods": ["XGBoost", "LightGBM", "Survival Analysis", "Reinforcement Learning"]
        }
        
    except Exception as e:
        logger.error(f"Erreur predictions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/retention-offers")
async def get_retention_offers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Récupérer les offres de rétention disponibles"""
    try:
        offers = db.query(RetentionOffer).filter(
            RetentionOffer.is_active == True
        ).all()
        
        if not offers:
            # Créer des offres par défaut
            default_offers = [
                RetentionOffer(name="Remise Fidélité", offer_type="discount", value=50, duration=6, success_rate=75),
                RetentionOffer(name="Upgrade Premium", offer_type="upgrade", value=0, duration=12, success_rate=65),
                RetentionOffer(name="Bonus Bienvenue", offer_type="bonus", value=100, duration=3, success_rate=70)
            ]
            for offer in default_offers:
                db.add(offer)
            db.commit()
            offers = default_offers
        
        return [{
            "id": o.id,
            "name": o.name,
            "type": o.offer_type,
            "value": o.value,
            "duration": o.duration,
            "success_rate": o.success_rate
        } for o in offers]
        
    except Exception as e:
        logger.error(f"Erreur retention_offers: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/retention-actions")
async def get_retention_actions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Récupérer les actions de rétention"""
    try:
        actions = db.query(RetentionAction).order_by(
            desc(RetentionAction.action_date)
        ).limit(50).all()
        
        results = []
        for action in actions:
            client = db.query(ChurnClient).filter(ChurnClient.id == action.client_id).first()
            results.append({
                "id": action.id,
                "client_name": client.client_name if client else "Inconnu",
                "city": client.city if client else "Inconnu",
                "action_type": action.action_type,
                "action_date": action.action_date,
                "result": action.result,
                "cost": action.cost,
                "description": action.description
            })
        
        return results
        
    except Exception as e:
        logger.error(f"Erreur retention_actions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/clients", status_code=201)
async def create_client(
    client_data: ClientCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Créer un nouveau client avec analyse IA"""
    try:
        client_id = f"CL-{uuid.uuid4().hex[:8].upper()}"
        
        client = ChurnClient(
            client_id=client_id,
            client_name=client_data.client_name,
            client_email=client_data.client_email,
            client_phone=client_data.client_phone,
            city=client_data.city,
            segment=client_data.segment,
            client_tenure=client_data.client_tenure,
            loyalty_score=client_data.loyalty_score,
            churn_probability=0,
            risk_level="low"
        )
        
        db.add(client)
        db.commit()
        db.refresh(client)
        
        # Analyser le nouveau client avec l'IA
        client_dict = {
            "id": client.id,
            "client_name": client.client_name,
            "client_tenure": client.client_tenure,
            "loyalty_score": client.loyalty_score,
            "segment": client.segment,
            "interactions": [],
            "competitor_offers": []
        }
        
        prediction = churn_prediction_ai.calculate_churn_probability(client_dict)
        client.churn_probability = prediction["churn_probability"]
        client.risk_level = prediction["risk_level"]
        client.main_reason = prediction["main_reason"]
        db.commit()
        
        return {
            "id": client.id,
            "client_id": client.client_id,
            "client_name": client.client_name,
            "message": "Client créé avec succès",
            "churn_probability": client.churn_probability,
            "risk_level": client.risk_level
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur create_client: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/clients/{client_id}")
async def get_client_details(
    client_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Récupérer les détails d'un client"""
    try:
        client = db.query(ChurnClient).filter(ChurnClient.id == client_id).first()
        if not client:
            raise HTTPException(status_code=404, detail="Client non trouvé")
        
        interactions = db.query(ChurnInteraction).filter(
            ChurnInteraction.client_id == client.id
        ).order_by(desc(ChurnInteraction.interaction_date)).all()
        
        competitor_offers = db.query(CompetitorOffer).filter(
            CompetitorOffer.client_id == client.id
        ).all()
        
        retention_actions = db.query(RetentionAction).filter(
            RetentionAction.client_id == client.id
        ).all()
        
        return {
            "id": client.id,
            "client_id": client.client_id,
            "client_name": client.client_name,
            "client_email": client.client_email,
            "client_phone": client.client_phone,
            "city": client.city,
            "segment": client.segment,
            "client_tenure": client.client_tenure,
            "loyalty_score": client.loyalty_score,
            "churn_probability": client.churn_probability,
            "risk_level": client.risk_level,
            "main_reason": client.main_reason,
            "interactions": [{
                "id": i.id,
                "type": i.interaction_type,
                "content": i.content,
                "satisfaction_score": i.satisfaction_score,
                "date": i.interaction_date
            } for i in interactions],
            "competitor_offers": [{
                "id": o.id,
                "competitor": o.competitor,
                "offer": o.offer,
                "value": o.value,
                "date": o.offer_date
            } for o in competitor_offers],
            "retention_actions": [{
                "id": a.id,
                "type": a.action_type,
                "cost": a.cost,
                "description": a.description,
                "result": a.result,
                "date": a.action_date
            } for a in retention_actions]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur get_client_details: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/clients/{client_id}/interactions")
async def add_interaction(
    client_id: int,
    interaction: ClientInteractionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Ajouter une interaction client et mettre à jour l'analyse IA"""
    try:
        client = db.query(ChurnClient).filter(ChurnClient.id == client_id).first()
        if not client:
            raise HTTPException(status_code=404, detail="Client non trouvé")
        
        new_interaction = ChurnInteraction(
            client_id=client.id,
            interaction_type=interaction.interaction_type,
            content=interaction.content,
            satisfaction_score=interaction.satisfaction_score or 0,
            interaction_date=datetime.utcnow()
        )
        
        db.add(new_interaction)
        db.commit()
        
        # Recalculer le risque avec l'IA
        all_interactions = db.query(ChurnInteraction).filter(
            ChurnInteraction.client_id == client.id
        ).all()
        
        competitor_offers = db.query(CompetitorOffer).filter(
            CompetitorOffer.client_id == client.id
        ).all()
        
        client_data = {
            "client_tenure": client.client_tenure,
            "loyalty_score": client.loyalty_score,
            "segment": client.segment,
            "interactions": [{
                "interaction_type": i.interaction_type,
                "satisfaction_score": i.satisfaction_score,
                "interaction_date": i.interaction_date
            } for i in all_interactions],
            "competitor_offers": [{"competitor": o.competitor} for o in competitor_offers]
        }
        
        prediction = churn_prediction_ai.calculate_churn_probability(client_data)
        client.churn_probability = prediction["churn_probability"]
        client.risk_level = prediction["risk_level"]
        client.main_reason = prediction["main_reason"]
        db.commit()
        
        return {
            "success": True,
            "message": "Interaction ajoutée",
            "churn_probability": client.churn_probability,
            "risk_level": client.risk_level
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur add_interaction: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/clients/{client_id}/competitor-offers")
async def add_competitor_offer(
    client_id: int,
    offer: CompetitorOfferCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Enregistrer une offre concurrente"""
    try:
        client = db.query(ChurnClient).filter(ChurnClient.id == client_id).first()
        if not client:
            raise HTTPException(status_code=404, detail="Client non trouvé")
        
        competitor_offer = CompetitorOffer(
            client_id=client.id,
            competitor=offer.competitor,
            offer=offer.offer,
            value=offer.value or 0,
            offer_date=datetime.utcnow()
        )
        
        db.add(competitor_offer)
        db.commit()
        
        # Mettre à jour le risque (augmentation)
        # Les offres concurrentes augmentent le risque d'attrition
        client.churn_probability = min(100, client.churn_probability + 15)
        if client.churn_probability > 70:
            client.risk_level = "critical"
        elif client.churn_probability > 55:
            client.risk_level = "high"
        client.main_reason = "competitive_offer"
        db.commit()
        
        return {
            "success": True,
            "message": "Offre concurrente enregistrée",
            "churn_probability": client.churn_probability
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur add_competitor_offer: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/clients/{client_id}/retention-action")
async def add_retention_action(
    client_id: int,
    action: RetentionActionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lancer une action de rétention"""
    try:
        client = db.query(ChurnClient).filter(ChurnClient.id == client_id).first()
        if not client:
            raise HTTPException(status_code=404, detail="Client non trouvé")
        
        retention_action = RetentionAction(
            client_id=client.id,
            action_type=action.action_type,
            cost=action.cost or 0,
            description=action.description,
            result="pending",
            action_date=datetime.utcnow()
        )
        
        db.add(retention_action)
        
        # Simuler l'efficacité de l'action (sera mis à jour plus tard)
        # Pour l'instant, on optimise avec l'IA
        if client.churn_probability < 30:
            expected_success = "success"
        elif client.churn_probability > 70:
            expected_success = "pending"
        else:
            expected_success = "success"
        
        db.commit()
        
        return {
            "success": True,
            "message": f"Action de rétention lancée: {action.action_type}",
            "action_id": retention_action.id,
            "action_type": action.action_type,
            "expected_result": expected_success
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur add_retention_action: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/clients/{client_id}/apply-offer")
async def apply_retention_offer(
    client_id: int,
    request: ApplyOfferRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Appliquer une offre de rétention"""
    try:
        client = db.query(ChurnClient).filter(ChurnClient.id == client_id).first()
        if not client:
            raise HTTPException(status_code=404, detail="Client non trouvé")
        
        offer = db.query(RetentionOffer).filter(RetentionOffer.id == request.offer_id).first()
        if not offer:
            raise HTTPException(status_code=404, detail="Offre non trouvée")
        
        # Créer une action de rétention avec l'offre
        retention_action = RetentionAction(
            client_id=client.id,
            action_type="offer",
            cost=offer.value if offer.offer_type == "discount" else 0,
            description=f"Offre appliquée: {offer.name} - {request.notes or ''}",
            result="pending",
            action_date=datetime.utcnow()
        )
        
        db.add(retention_action)
        
        # Réduire la probabilité d'attrition
        client.churn_probability = max(0, client.churn_probability - offer.success_rate * 0.6)
        if client.churn_probability < 35:
            client.risk_level = "low"
        elif client.churn_probability < 55:
            client.risk_level = "medium"
        
        db.commit()
        
        return {
            "success": True,
            "message": f"Offre {offer.name} appliquée avec succès",
            "new_churn_probability": client.churn_probability,
            "new_risk_level": client.risk_level
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur apply_retention_offer: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/clients/{client_id}/deep-analysis")
async def run_deep_analysis(
    client_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Analyse approfondie IA"""
    try:
        client = db.query(ChurnClient).filter(ChurnClient.id == client_id).first()
        if not client:
            raise HTTPException(status_code=404, detail="Client non trouvé")
        
        interactions = db.query(ChurnInteraction).filter(
            ChurnInteraction.client_id == client.id
        ).all()
        
        competitor_offers = db.query(CompetitorOffer).filter(
            CompetitorOffer.client_id == client.id
        ).all()
        
        # Analyse des interactions
        complaints = [i for i in interactions if i.interaction_type == "complaint"]
        avg_satisfaction = sum(i.satisfaction_score or 0 for i in interactions) / max(len(interactions), 1)
        
        # Préparer les données pour l'IA
        client_data = {
            "client_tenure": client.client_tenure,
            "loyalty_score": client.loyalty_score,
            "segment": client.segment,
            "interactions": [{
                "interaction_type": i.interaction_type,
                "satisfaction_score": i.satisfaction_score,
                "interaction_date": i.interaction_date
            } for i in interactions],
            "competitor_offers": [{"competitor": o.competitor} for o in competitor_offers],
            "churn_probability": client.churn_probability,
            "main_reason": client.main_reason
        }
        
        # Obtenir les recommandations
        recommendations = churn_prediction_ai.get_retention_recommendations(client_data)
        
        # Analyse de survie simulée
        survival_analysis = {
            "churn_probability": client.churn_probability,
            "expected_time": max(7, int((100 - client.churn_probability) / 2)),
            "confidence_interval": [max(0, client.churn_probability - 15), min(100, client.churn_probability + 15)]
        }
        
        # Analyse NLP sentiment
        nlp_analysis = {
            "sentiment_score": avg_satisfaction * 10,
            "sentiment_trend": "decreasing" if len(complaints) > 2 else "stable",
            "key_complaints": [c.content for c in complaints[:3] if c.content],
            "recommended_actions": ["Contacter le client", "Offrir une compensation"]
        }
        
        return {
            "client_id": client.client_id,
            "client_name": client.client_name,
            "survival_analysis": survival_analysis,
            "nlp_analysis": nlp_analysis,
            "retention_recommendations": {
                "best_offer": recommendations[0]["description"] if recommendations else "Offre standard",
                "expected_impact": recommendations[0]["expected_impact"] if recommendations else "Réduction du risque de 30%",
                "priority_actions": [r["type"] for r in recommendations[:3]]
            },
            "risk_factors": churn_prediction_ai._get_risk_factors(client_data, client.churn_probability)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur deep_analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))


logger.info("✅ MODULE CHURN PREDICTION AVEC IA CHARGÉ AVEC SUCCÈS")