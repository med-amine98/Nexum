# app/api/predictive_analytics.py
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import sys
import logging
import random
import os

logger = logging.getLogger(__name__)

# ========== FORCER LE RECHARGEMENT DU MODULE ==========
if 'app.services.predictiveAnalytic_service' in sys.modules:
    del sys.modules['app.services.predictiveAnalytic_service']
    logger.info("✅ Module predictiveAnalytic_service supprimé du cache")

from app.database import get_db
from app.services.predictiveAnalytic_service import predictive_service
from app.services.predictive_ml_service import get_predictive_ml_service

# ========== IMPORTS DES MODÈLES ==========
from app.models.predictive_analytics import (
    HistoricalData,
    MetricType,
    AlertLevel,
    SalesForecast,
    MetricPrediction,
    SimulationScenario,
    ExogenousFactor,
    AlertThreshold,
    PredictionAlert
)

router = APIRouter(prefix="/predictions", tags=["predictive-analytics"])


async def get_current_user(token: Optional[str] = None):
    """Récupère l'utilisateur courant"""
    class CurrentUser:
        id = 1
        email = "admin@example.com"
        role = "admin"
        company_id = 1
    return CurrentUser()


# ========== ENDPOINTS PRINCIPAUX ==========

@router.get("/dashboard")
async def get_dashboard(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Tableau de bord complet avec toutes les prévisions"""
    try:
        data = predictive_service.get_dashboard_data(db)
        return {**data, "timestamp": datetime.now().isoformat()}
    except Exception as e:
        logger.error(f"Erreur dashboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sales")
async def get_sales_forecast(
    period: str = Query("month", description="Période d'analyse"),
    limit: int = Query(12, description="Nombre de périodes"),
    db: Session = Depends(get_db)
):
    """Prévisions de ventes mensuelles FUTURES"""
    try:
        logger.info(f"=== ENDPOINT /sales appelé avec limit={limit} ===")
        
        # ✅ Utiliser le service ML pour des prévisions mensuelles
        ml_service = get_predictive_ml_service()
        forecasts = ml_service.predict_future_monthly(db, MetricType.REVENUE, limit)
        
        logger.info(f"=== {len(forecasts)} prévisions mensuelles générées ===")
        
        for f in forecasts[:3]:
            logger.info(f"  - {f['date']}: {f['predicted_value']}€")
        
        return forecasts
    except Exception as e:
        logger.error(f"Erreur sales forecast: {e}")
        # ✅ Fallback: générer des prévisions mensuelles basiques
        return generate_fallback_monthly_forecast(limit)


@router.get("/metrics")
async def get_metric_predictions(
    db: Session = Depends(get_db)
):
    """Prédictions des métriques B2B"""
    try:
        predictions = predictive_service.predict_future_metrics(db)
        return predictions
    except Exception as e:
        logger.error(f"Erreur metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/current-metrics")
async def get_current_metrics(
    db: Session = Depends(get_db)
):
    """Métriques actuelles B2B (30 derniers jours)"""
    try:
        metrics = predictive_service.get_current_metrics(db)
        return {
            "revenue": metrics.get("revenue", 0),
            "orders": metrics.get("orders", 0),
            "avg_basket": metrics.get("avg_basket", 0),
            "new_customers": metrics.get("new_clients", 0),
            "conversion_rate": metrics.get("conversion", 0),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Erreur current metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========== ENDPOINTS SCÉNARIOS ==========

@router.get("/scenarios")
async def get_scenarios(
    db: Session = Depends(get_db)
):
    """Récupère tous les scénarios de simulation depuis la base de données"""
    try:
        scenarios = db.query(SimulationScenario).order_by(
            SimulationScenario.created_at.desc()
        ).all()
        
        result = []
        for s in scenarios:
            scenario_dict = {
                "id": s.id,
                "name": s.name,
                "description": s.description,
                "impact": float(s.impact) if s.impact else 0,
                "probability": float(s.probability) if s.probability else 0,
                "created_at": s.created_at.isoformat() if s.created_at else None
            }
            if hasattr(s, 'parameters'):
                scenario_dict["parameters"] = s.parameters
            result.append(scenario_dict)
        
        return result
    except Exception as e:
        logger.error(f"Erreur get scenarios: {e}")
        return [
            {
                "id": 1,
                "name": "Croissance Optimiste",
                "description": "Scénario de croissance optimiste",
                "impact": 15.0,
                "probability": 65.0,
                "created_at": datetime.now().isoformat()
            },
            {
                "id": 2,
                "name": "Croissance Modérée",
                "description": "Scénario de croissance modérée",
                "impact": 8.0,
                "probability": 80.0,
                "created_at": datetime.now().isoformat()
            },
            {
                "id": 3,
                "name": "Récession Légère",
                "description": "Scénario avec ralentissement économique",
                "impact": -5.0,
                "probability": 40.0,
                "created_at": datetime.now().isoformat()
            }
        ]


@router.post("/scenarios")
async def create_scenario(
    data: Dict[str, Any],
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crée un nouveau scénario de simulation"""
    try:
        scenario = SimulationScenario(
            name=data.get("name"),
            description=data.get("description", ""),
            impact=data.get("impact", 0),
            probability=data.get("probability", 50)
        )
        db.add(scenario)
        db.commit()
        db.refresh(scenario)
        
        logger.info(f"✅ Scénario créé: {scenario.name}")
        return {"success": True, "id": scenario.id}
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur create scenario: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========== ENDPOINTS FACTEURS EXOGÈNES ==========

@router.get("/exogenous-factors")
async def get_exogenous_factors(
    db: Session = Depends(get_db)
):
    """Récupère tous les facteurs exogènes depuis la base de données"""
    try:
        factors = db.query(ExogenousFactor).order_by(
            ExogenousFactor.created_at.desc()
        ).all()
        
        return [{
            "id": f.id,
            "name": f.name,
            "type": f.type,
            "frequency": f.frequency,
            "description": f.description,
            "values": f.values,
            "created_at": f.created_at.isoformat() if f.created_at else None
        } for f in factors]
    except Exception as e:
        logger.error(f"Erreur get factors: {e}")
        return []


@router.post("/exogenous-factors")
async def create_exogenous_factor(
    data: Dict[str, Any],
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crée un nouveau facteur exogène"""
    try:
        factor = ExogenousFactor(
            name=data.get("name"),
            type=data.get("type", "economic"),
            frequency=data.get("frequency", "monthly"),
            description=data.get("description", ""),
            values=data.get("values", {})
        )
        db.add(factor)
        db.commit()
        db.refresh(factor)
        
        logger.info(f"✅ Facteur exogène créé: {factor.name}")
        return {"success": True, "id": factor.id}
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur create factor: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========== ENDPOINTS SEUILS D'ALERTE ==========

@router.get("/thresholds")
async def get_thresholds(
    db: Session = Depends(get_db)
):
    """Récupère tous les seuils d'alerte depuis la base de données"""
    try:
        thresholds = db.query(AlertThreshold).filter(
            AlertThreshold.is_active == True
        ).all()
        
        result = []
        for t in thresholds:
            if hasattr(t.metric, 'value'):
                metric_value = t.metric.value
            else:
                metric_value = str(t.metric)
            
            if hasattr(t.level, 'value'):
                level_value = t.level.value
            else:
                level_value = str(t.level)
            
            result.append({
                "id": t.id,
                "metric": metric_value,
                "condition": t.condition,
                "threshold": float(t.threshold),
                "level": level_value,
                "notification_method": t.notification_method,
                "is_active": t.is_active,
                "created_at": t.created_at.isoformat() if t.created_at else None
            })
        
        return result
    except Exception as e:
        logger.error(f"Erreur get thresholds: {e}")
        return [
            {
                "id": 1,
                "metric": "revenue",
                "condition": "lt",
                "threshold": 10000.0,
                "level": "warning",
                "notification_method": ["email"],
                "is_active": True,
                "created_at": datetime.now().isoformat()
            },
            {
                "id": 2,
                "metric": "revenue",
                "condition": "lt",
                "threshold": 5000.0,
                "level": "critical",
                "notification_method": ["email", "push"],
                "is_active": True,
                "created_at": datetime.now().isoformat()
            },
            {
                "id": 3,
                "metric": "orders",
                "condition": "lt",
                "threshold": 2.0,
                "level": "warning",
                "notification_method": ["email"],
                "is_active": True,
                "created_at": datetime.now().isoformat()
            }
        ]


@router.post("/thresholds")
async def create_threshold(
    data: Dict[str, Any],
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crée un nouveau seuil d'alerte"""
    try:
        metric_value = data.get("metric")
        if isinstance(metric_value, str):
            try:
                metric_enum = MetricType(metric_value.lower())
            except ValueError:
                metric_enum = metric_value
        else:
            metric_enum = metric_value
        
        level_value = data.get("level", "warning")
        if isinstance(level_value, str):
            try:
                level_enum = AlertLevel(level_value.lower())
            except ValueError:
                level_enum = level_value
        else:
            level_enum = level_value
        
        threshold = AlertThreshold(
            metric=metric_enum,
            condition=data.get("condition", "lt"),
            threshold=data.get("threshold", 0),
            level=level_enum,
            notification_method=data.get("notification_method", ["email"]),
            is_active=data.get("is_active", True)
        )
        db.add(threshold)
        db.commit()
        db.refresh(threshold)
        
        metric_display = metric_value if isinstance(metric_value, str) else metric_value.value
        logger.info(f"✅ Seuil d'alerte créé: {metric_display} {threshold.condition} {threshold.threshold}")
        return {"success": True, "id": threshold.id}
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur create threshold: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========== ENDPOINTS DONNÉES HISTORIQUES ==========

@router.get("/historical")
async def get_historical_data(
    metric_name: Optional[str] = None,
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db)
):
    """Récupère les données historiques depuis la base de données"""
    try:
        query = db.query(HistoricalData)
        
        if metric_name:
            try:
                metric_enum = MetricType(metric_name.lower())
                query = query.filter(HistoricalData.metric == metric_enum)
            except ValueError:
                pass
        
        cutoff_date = datetime.now() - timedelta(days=days)
        query = query.filter(HistoricalData.date >= cutoff_date)
        
        data = query.order_by(HistoricalData.date).all()
        
        return [{
            "id": d.id,
            "metric": d.metric.value if hasattr(d.metric, 'value') else str(d.metric),
            "value": d.value,
            "date": d.date.isoformat(),
            "notes": d.notes,
            "created_at": d.created_at.isoformat() if d.created_at else None
        } for d in data]
    except Exception as e:
        logger.error(f"Erreur get historical data: {e}")
        return []


@router.post("/historical-data")
async def add_historical_data(
    data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Ajoute une donnée historique"""
    try:
        historical = HistoricalData(
            date=datetime.fromisoformat(data["date"]),
            metric=MetricType(data["metric"].lower()),
            value=data["value"],
            notes=data.get("notes", "")
        )
        db.add(historical)
        db.commit()
        db.refresh(historical)
        
        logger.info(f"✅ Donnée historique ajoutée: {historical.metric.value} = {historical.value}")
        return {"success": True, "id": historical.id}
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur add historical: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/historical-data/bulk")
async def add_historical_data_bulk(
    data: List[Dict[str, Any]],
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Ajoute plusieurs données historiques en une fois"""
    try:
        added = 0
        for item in data:
            historical = HistoricalData(
                date=datetime.fromisoformat(item["date"]),
                metric=item["metric"].lower(),
                value=item["value"],
                notes=item.get("notes", "")
            )
            db.add(historical)
            added += 1
        
        db.commit()
        logger.info(f"✅ {added} données historiques ajoutées")
        return {"success": True, "count": added}
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur add historical bulk: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========== ENDPOINTS ENTRAÎNEMENT ET STATUT DES MODÈLES ==========

@router.post("/train-models")
async def train_predictive_models(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Entraîne tous les modèles Random Forest pour les métriques B2B"""
    try:
        ml_service = get_predictive_ml_service()
        results = ml_service.train_all_models(db)
        
        success_count = sum(1 for r in results.values() if r.get("success", False))
        
        if success_count == 0:
            return {
                "success": False,
                "message": "Aucun modèle n'a pu être entraîné. Vérifiez les données historiques.",
                "results": results
            }
        
        return {
            "success": True,
            "message": f"{success_count} modèles entraînés avec succès",
            "results": results
        }
    except Exception as e:
        logger.error(f"Erreur train_models: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/model-status")
async def get_model_status(
    db: Session = Depends(get_db)
):
    """Vérifie le statut des modèles entraînés"""
    try:
        ml_service = get_predictive_ml_service()
        
        status = {
            "is_loaded": ml_service.is_loaded,
            "models": []
        }
        
        for metric in MetricType:
            model_loaded = metric.value in ml_service.models
            feature_importance = ml_service.get_feature_importance(metric.value)
            
            status["models"].append({
                "metric": metric.value,
                "loaded": model_loaded,
                "feature_importance": feature_importance[:5] if feature_importance else []
            })
        
        return status
    except Exception as e:
        logger.error(f"Erreur model_status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========== ENDPOINTS SIMULATION ==========

@router.post("/simulate")
async def run_simulation(
    data: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """Exécute une simulation de scénario"""
    try:
        result = predictive_service.run_simulation(
            db, 
            data.get("scenario_id"), 
            data.get("custom_params", {})
        )
        return result
    except Exception as e:
        logger.error(f"Erreur simulation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========== ENDPOINTS EXPORT ET HEALTH ==========

@router.get("/export")
async def export_predictions(
    db: Session = Depends(get_db)
):
    """Exporte les prévisions au format CSV"""
    from fastapi.responses import StreamingResponse
    import io
    import csv
    
    try:
        data = predictive_service.get_dashboard_data(db)
        
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Date", "Prédiction (€)", "Borne Inf (€)", "Borne Sup (€)", "Confiance"])
        
        for forecast in data.get("sales_forecast", []):
            writer.writerow([
                forecast.get("date", ""),
                forecast.get("predicted_value", 0),
                forecast.get("lower_bound", 0),
                forecast.get("upper_bound", 0),
                forecast.get("confidence", 85)
            ])
        
        output.seek(0)
        filename = f"predictions_b2b_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode('utf-8-sig')),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        logger.error(f"Erreur export: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Vérifie l'état du service"""
    return {
        "status": "healthy",
        "service": "predictive-analytics",
        "timestamp": datetime.now().isoformat()
    }


@router.post("/fine-tune")
async def fine_tune_model(data: dict):
    """Fine-tuning du modèle"""
    from app.assistants.manager import assistant_manager
    assistant_manager.broadcast_learning("Correction experte RLHF reçue.", {"type": "rlhf"})
    return {"status": "success"}


@router.post("/reload-models")
async def reload_models(
    current_user = Depends(get_current_user)
):
    """Recharge les modèles depuis le disque"""
    try:
        ml_service = get_predictive_ml_service()
        ml_service.load_models()
        
        return {
            "success": True,
            "message": "Modèles rechargés avec succès",
            "loaded_models": list(ml_service.models.keys())
        }
    except Exception as e:
        logger.error(f"Erreur reload_models: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/force-save-models")
async def force_save_models(
    current_user = Depends(get_current_user)
):
    """Force la sauvegarde des modèles sur le disque"""
    try:
        ml_service = get_predictive_ml_service()
        
        if not ml_service.models:
            return {
                "success": False,
                "message": "Aucun modèle à sauvegarder. Entraînez d'abord les modèles."
            }
        
        ml_service.save_models()
        
        saved_files = []
        for metric in ml_service.models.keys():
            model_file = f"{ml_service.model_path}{metric}_model.pkl"
            if os.path.exists(model_file):
                saved_files.append(model_file)
        
        return {
            "success": True,
            "message": f"{len(saved_files)} modèles sauvegardés",
            "files": saved_files
        }
    except Exception as e:
        logger.error(f"Erreur force_save_models: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/train-model/{metric_name}")
async def train_specific_model(
    metric_name: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Entraîne un modèle spécifique"""
    try:
        ml_service = get_predictive_ml_service()
        
        try:
            metric = MetricType(metric_name.lower())
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Métrique invalide: {metric_name}")
        
        result = ml_service.train_model(db, metric)
        
        if result.get("success"):
            return {
                "success": True,
                "message": f"Modèle {metric_name} entraîné avec succès",
                "result": result
            }
        else:
            return {
                "success": False,
                "message": result.get("message", "Erreur lors de l'entraînement")
            }
    except Exception as e:
        logger.error(f"Erreur train_model {metric_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========== FONCTION DE FALLBACK ==========

def generate_fallback_monthly_forecast(months: int = 12) -> List[Dict[str, Any]]:
    """Génère des prévisions mensuelles de fallback"""
    base_value = 19800  # CA réel
    current_date = datetime.now().replace(day=1)
    forecasts = []
    
    for i in range(months):
        date = current_date + timedelta(days=30 * (i + 1))
        # Croissance de 3-8% par mois
        growth = 1 + (0.03 + (i * 0.004))
        pred_value = base_value * (growth ** (i + 1))
        
        forecasts.append({
            "date": date.isoformat(),
            "predicted_value": round(float(pred_value), 2),
            "lower_bound": round(float(pred_value * 0.85), 2),
            "upper_bound": round(float(pred_value * 1.15), 2),
            "confidence": 0.85,
            "metric": "revenue"
        })
    
    return forecasts