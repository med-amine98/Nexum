# app/api/endpoints/predictions.py
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
from app.models.prediction import (
    HistoricalData, Prediction, Scenario, ExogenousFactor, 
    AlertThreshold, PredictionAlert,
    PredictionMetric, ScenarioType, ExogenousFactorType, AlertLevel, AlertCondition
)
import logging
logger = logging.getLogger(__name__)
router = APIRouter()
logger.info("✅ ROUTER PREDICTIONS CRÉÉ")

# ===== DONNÉES MOCK =====
def generate_mock_sales_forecast():
    forecasts = []
    for i in range(6, -1, -1):
        date = datetime.now() - timedelta(days=30*i)
        forecasts.append({
            "date": date.isoformat(),
            "predicted_value": random.uniform(80000, 120000),
            "lower_bound": random.uniform(70000, 90000),
            "upper_bound": random.uniform(100000, 140000),
            "actual_value": random.uniform(75000, 115000) if i < 3 else 0
        })
    return forecasts

def generate_mock_metric_predictions():
    return [
        {"metric_name": "revenue", "current_value": 95000, "predicted_value": 105000, "trend": 10.5, "confidence": 92, "unit": "€"},
        {"metric_name": "orders", "current_value": 1250, "predicted_value": 1350, "trend": 8.0, "confidence": 88, "unit": ""},
        {"metric_name": "avg_basket", "current_value": 76, "predicted_value": 78, "trend": 2.6, "confidence": 85, "unit": "€"},
        {"metric_name": "conversion", "current_value": 3.2, "predicted_value": 3.5, "trend": 9.4, "confidence": 78, "unit": "%"},
        {"metric_name": "new_clients", "current_value": 45, "predicted_value": 52, "trend": 15.6, "confidence": 82, "unit": ""}
    ]

MOCK_SCENARIOS = [
    {"id": 1, "name": "Croissance optimiste", "description": "Scénario de croissance forte", "impact": 25, "probability": 30},
    {"id": 2, "name": "Stabilité", "description": "Scénario de maintien", "impact": 5, "probability": 50},
    {"id": 3, "name": "Récession", "description": "Scénario de baisse", "impact": -15, "probability": 20}
]

MOCK_EXOGENOUS_FACTORS = [
    {"id": 1, "name": "Météo", "type": "weather", "frequency": "daily", "description": "Impact météo sur les ventes"},
    {"id": 2, "name": "Indice économique", "type": "economic", "frequency": "monthly", "description": "Confiance des consommateurs"},
    {"id": 3, "name": "Saisonnalité", "type": "seasonal", "frequency": "yearly", "description": "Périodes de fêtes"}
]

MOCK_THRESHOLDS = [
    {"id": 1, "metric": "revenue", "condition": "lt", "threshold": 80000, "level": "warning", "notification_method": ["email"]},
    {"id": 2, "metric": "orders", "condition": "lt", "threshold": 1000, "level": "critical", "notification_method": ["email", "push"]}
]

# ===== ENDPOINTS =====
@router.get("/dashboard")
async def get_predictions_dashboard(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Dashboard des prédictions"""
    try:
        sales_forecast = generate_mock_sales_forecast()
        metric_predictions = generate_mock_metric_predictions()
        
        return {
            "sales_forecast": sales_forecast,
            "metric_predictions": metric_predictions,
            "overall_confidence": 87.5,
            "target_value": 1000000,
            "error_margin": 8.5
        }
    except Exception as e:
        logger.error(f"❌ Erreur dashboard: {e}")
        return {
            "sales_forecast": [],
            "metric_predictions": [],
            "overall_confidence": 0,
            "target_value": 0,
            "error_margin": 0
        }


@router.get("/sales")
async def get_sales_forecast(
    period: str = Query("month", description="week, month, quarter, year"),
    limit: int = Query(12, ge=1, le=24),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Récupérer les prévisions de ventes"""
    try:
        return generate_mock_sales_forecast()[:limit]
    except Exception as e:
        logger.error(f"❌ Erreur sales: {e}")
        return []


@router.get("/scenarios")
async def get_scenarios(
    active_only: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Récupérer les scénarios de simulation"""
    try:
        return MOCK_SCENARIOS
    except Exception as e:
        logger.error(f"❌ Erreur scenarios: {e}")
        return []


@router.post("/scenarios", status_code=status.HTTP_201_CREATED)
async def create_scenario(
    scenario_data: dict,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Créer un nouveau scénario"""
    try:
        new_scenario = {
            "id": len(MOCK_SCENARIOS) + 1,
            "name": scenario_data.get("name"),
            "description": scenario_data.get("description"),
            "impact": scenario_data.get("impact", 0),
            "probability": scenario_data.get("probability", 0)
        }
        MOCK_SCENARIOS.append(new_scenario)
        return {"id": new_scenario["id"], "message": "Scénario créé avec succès"}
    except Exception as e:
        logger.error(f"❌ Erreur create_scenario: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/exogenous-factors")
async def get_exogenous_factors(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Récupérer les facteurs exogènes"""
    try:
        return MOCK_EXOGENOUS_FACTORS
    except Exception as e:
        logger.error(f"❌ Erreur exogenous_factors: {e}")
        return []


@router.post("/exogenous-factors", status_code=status.HTTP_201_CREATED)
async def create_exogenous_factor(
    factor_data: dict,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Créer un facteur exogène"""
    try:
        new_factor = {
            "id": len(MOCK_EXOGENOUS_FACTORS) + 1,
            "name": factor_data.get("name"),
            "type": factor_data.get("type"),
            "frequency": factor_data.get("frequency"),
            "description": factor_data.get("description")
        }
        MOCK_EXOGENOUS_FACTORS.append(new_factor)
        return {"id": new_factor["id"], "message": "Facteur exogène créé avec succès"}
    except Exception as e:
        logger.error(f"❌ Erreur create_factor: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/thresholds")
async def get_thresholds(
    active_only: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Récupérer les seuils d'alerte"""
    try:
        return MOCK_THRESHOLDS
    except Exception as e:
        logger.error(f"❌ Erreur thresholds: {e}")
        return []


@router.post("/thresholds", status_code=status.HTTP_201_CREATED)
async def create_threshold(
    threshold_data: dict,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Créer un seuil d'alerte"""
    try:
        new_threshold = {
            "id": len(MOCK_THRESHOLDS) + 1,
            "metric": threshold_data.get("metric"),
            "condition": threshold_data.get("condition"),
            "threshold": threshold_data.get("threshold"),
            "level": threshold_data.get("level", "info"),
            "notification_method": threshold_data.get("notification_method", ["email"])
        }
        MOCK_THRESHOLDS.append(new_threshold)
        return {"id": new_threshold["id"], "message": "Seuil d'alerte créé avec succès"}
    except Exception as e:
        logger.error(f"❌ Erreur create_threshold: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/historical-data")
async def add_historical_data(
    data: dict,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Ajouter des données historiques"""
    try:
        return {"message": "Données historiques ajoutées avec succès"}
    except Exception as e:
        logger.error(f"❌ Erreur add_historical_data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/simulate")
async def run_simulation(
    simulation_data: dict,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Lancer une simulation"""
    try:
        scenario_id = simulation_data.get("scenario_id")
        scenario = next((s for s in MOCK_SCENARIOS if s["id"] == scenario_id), None)
        
        base_revenue = 95000
        variation = scenario["impact"] if scenario else random.uniform(-20, 30)
        projected_revenue = base_revenue * (1 + variation / 100)
        
        return {
            "scenario_name": scenario["name"] if scenario else "Personnalisé",
            "projected_revenue": projected_revenue,
            "variation": variation,
            "confidence": random.uniform(75, 95),
            "recommendation": "Augmenter le budget marketing pour capitaliser sur la croissance" if variation > 10 else "Optimiser les coûts en période de stabilité"
        }
    except Exception as e:
        logger.error(f"❌ Erreur simulate: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/export")
async def export_predictions(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Exporter les prédictions en CSV"""
    try:
        from fastapi.responses import StreamingResponse
        import io
        import csv
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        writer.writerow(["Date", "Prédiction", "Borne inférieure", "Borne supérieure", "Valeur réelle"])
        
        for forecast in generate_mock_sales_forecast():
            writer.writerow([
                forecast["date"],
                forecast["predicted_value"],
                forecast["lower_bound"],
                forecast["upper_bound"],
                forecast["actual_value"]
            ])
        
        output.seek(0)
        
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=predictions_{datetime.now().strftime('%Y%m%d')}.csv"}
        )
    except Exception as e:
        logger.error(f"❌ Erreur export: {e}")
        raise HTTPException(status_code=500, detail=str(e))


logger.info("✅ MODULE PREDICTIONS CHARGÉ AVEC SUCCÈS")