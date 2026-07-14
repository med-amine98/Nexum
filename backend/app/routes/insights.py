# app/routes/insights.py
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import json

from app.database import get_db
from app.models.insight import Insight

router = APIRouter(prefix="/insights", tags=["insights"])


@router.get("/dashboard")
async def get_dashboard(
    db: Session = Depends(get_db)
):
    """Récupérer les données du dashboard insights"""
    try:
        insights = db.query(Insight).all()
        
        # Calculer les statistiques
        total = len(insights)
        active = len([i for i in insights if not i.is_applied and not i.is_dismissed])
        applied = len([i for i in insights if i.is_applied])
        dismissed = len([i for i in insights if i.is_dismissed])
        
        return {
            "insights": insights,
            "keywords": [],
            "performance": {
                "value": 75,
                "trend": 5
            },
            "market_trends": []
        }
        
    except Exception as e:
        print(f"Erreur get_dashboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/insights")
async def create_insight(
    request: Request,
    db: Session = Depends(get_db)
):
    """Créer un nouvel insight"""
    try:
        data = await request.json()
        
        # Créer l'insight
        insight = Insight(
            title=data.get('title'),
            description=data.get('description'),
            insight_type=data.get('insight_type'),
            category=data.get('category'),
            impact=data.get('impact', 'Moyen'),
            potential_value=data.get('potential_value', 0),
            confidence=data.get('confidence', 80),
            urgency=data.get('urgency', 0),
            recommended_actions=data.get('recommended_actions', []),
            company_id=data.get('company_id', 1)
        )
        
        db.add(insight)
        db.commit()
        db.refresh(insight)
        
        return {"success": True, "message": "Insight créé avec succès", "id": insight.id}
        
    except Exception as e:
        db.rollback()
        print(f"Erreur create_insight: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{insight_id}/apply")
async def apply_insight(
    insight_id: int,
    db: Session = Depends(get_db)
):
    """Appliquer un insight"""
    try:
        insight = db.query(Insight).filter(Insight.id == insight_id).first()
        if not insight:
            raise HTTPException(status_code=404, detail="Insight non trouvé")
        
        insight.is_applied = True
        db.commit()
        
        return {"success": True, "message": "Insight appliqué avec succès"}
        
    except Exception as e:
        db.rollback()
        print(f"Erreur apply_insight: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{insight_id}/dismiss")
async def dismiss_insight(
    insight_id: int,
    db: Session = Depends(get_db)
):
    """Ignorer un insight"""
    try:
        insight = db.query(Insight).filter(Insight.id == insight_id).first()
        if not insight:
            raise HTTPException(status_code=404, detail="Insight non trouvé")
        
        insight.is_dismissed = True
        db.commit()
        
        return {"success": True, "message": "Insight ignoré avec succès"}
        
    except Exception as e:
        db.rollback()
        print(f"Erreur dismiss_insight: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/feedback")
async def add_feedback(
    request: Request,
    db: Session = Depends(get_db)
):
    """Ajouter un feedback sur un insight"""
    try:
        data = await request.json()
        # Logique d'ajout de feedback
        return {"success": True, "message": "Feedback enregistré avec succès"}
        
    except Exception as e:
        print(f"Erreur add_feedback: {e}")
        raise HTTPException(status_code=500, detail=str(e))