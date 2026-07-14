"""
app/api/ai_engine.py
=====================
Router FastAPI exposant les endpoints du moteur IA centralisé.

Endpoints disponibles :
  POST /api/v1/ai/analyze/all         — Lance toutes les analyses IA
  POST /api/v1/ai/analyze/sales       — Analyse IA des ventes
  POST /api/v1/ai/analyze/leads       — Lead scoring CRM
  POST /api/v1/ai/analyze/employees   — Analyse RH (performance, burnout, churn)
  POST /api/v1/ai/analyze/products    — Prévision stock & demande
  POST /api/v1/ai/analyze/stock       — Détection anomalies stock
  POST /api/v1/ai/analyze/purchases   — Analyse achats & fournisseurs
  POST /api/v1/ai/analyze/banking     — Analyse risque client bancaire
  POST /api/v1/ai/analyze/invoices    — Risque paiement & fraude factures
  GET  /api/v1/ai/status              — Statut du moteur IA
"""

import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.database import get_db
import app.services.ai_engine_service as ai_engine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["AI Engine 🤖"])

# Track last run times
_last_runs: dict = {}


def _record_run(domain: str):
    _last_runs[domain] = datetime.utcnow().isoformat()


# ---------------------------------------------------------------------------
# Status
# ---------------------------------------------------------------------------

@router.get("/status", summary="Statut du moteur IA")
def get_ai_status():
    """
    Retourne l'état du moteur IA : disponibilité des algorithmes
    et horodatage des dernières analyses par domaine.
    """
    return {
        "status": "operational",
        "engine": "AIEngineService v1.0",
        "algorithms": [
            "GradientBoostingRegressor",
            "RandomForestClassifier",
            "RandomForestRegressor",
            "IsolationForest",
            "LinearRegression",
            "LogisticRegression",
            "KMeans",
        ],
        "domains": [
            "sales", "leads", "employees", "products",
            "stock", "purchases", "banking", "invoices",
        ],
        "last_runs": _last_runs,
        "timestamp": datetime.utcnow().isoformat(),
    }


# ---------------------------------------------------------------------------
# Analyze ALL
# ---------------------------------------------------------------------------

@router.post("/analyze/all", summary="Lancer toutes les analyses IA")
def analyze_all(db: Session = Depends(get_db)):
    """
    Lance séquentiellement les algorithmes IA sur **tous les domaines**.
    Chaque domaine est indépendant — une erreur dans l'un n'arrête pas les autres.

    Domaines analysés : ventes, CRM, RH, produits, stock, achats, banking, factures.
    """
    try:
        results = ai_engine.analyze_all(db)
        for domain in results:
            if isinstance(results[domain], dict) and "updated" in results[domain]:
                _record_run(domain)
        return {
            "success": True,
            "message": "Analyse IA complète terminée",
            "results": results,
        }
    except Exception as e:
        logger.error(f"❌ [AI-All] Erreur: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Individual domain endpoints
# ---------------------------------------------------------------------------

@router.post("/analyze/sales", summary="Analyse IA des ventes")
def analyze_sales(db: Session = Depends(get_db)):
    """
    **Algorithmes utilisés :**
    - GradientBoostingRegressor → `ai_closing_probability`
    - RandomForestRegressor → `ai_revenue_forecast`
    - LogisticRegression → `ai_churn_risk_interaction`
    """
    try:
        result = ai_engine.analyze_sales(db)
        _record_run("sales")
        return {"success": True, **result}
    except Exception as e:
        logger.error(f"❌ [AI-Sales] {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze/leads", summary="Lead scoring CRM")
def analyze_leads(db: Session = Depends(get_db)):
    """
    **Algorithmes utilisés :**
    - RandomForestRegressor → `ai_lead_score` (0–100)
    - KMeans → segmentation comportementale (cold/warm/hot)
    - Règles métier → `ai_next_action`
    """
    try:
        result = ai_engine.analyze_leads(db)
        _record_run("leads")
        return {"success": True, **result}
    except Exception as e:
        logger.error(f"❌ [AI-Leads] {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze/employees", summary="Analyse RH (performance, burnout, churn)")
def analyze_employees(db: Session = Depends(get_db)):
    """
    **Algorithmes utilisés :**
    - RandomForestRegressor → `ai_performance_score`
    - GradientBoostingRegressor → `churn_risk_score`
    - IsolationForest → `ai_burnout_risk_score`
    - Règles → `ai_career_path_suggestion`
    """
    try:
        result = ai_engine.analyze_employees(db)
        _record_run("employees")
        return {"success": True, **result}
    except Exception as e:
        logger.error(f"❌ [AI-Employees] {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze/products", summary="Prévision demande & obsolescence produits")
def analyze_products(db: Session = Depends(get_db)):
    """
    **Algorithmes utilisés :**
    - RandomForestRegressor → `ai_demand_forecast` (30j)
    - Formule ML → `smart_reorder_point`
    - IsolationForest → `ai_obsolescence_risk`
    - Score composite → `ai_customer_interest_score`
    """
    try:
        result = ai_engine.analyze_products(db)
        _record_run("products")
        return {"success": True, **result}
    except Exception as e:
        logger.error(f"❌ [AI-Products] {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze/stock", summary="Détection anomalies & prévision stock")
def analyze_stock(db: Session = Depends(get_db)):
    """
    **Algorithmes utilisés :**
    - IsolationForest → `ai_anomaly_score`
    - LinearRegression → `ai_stock_forecast_7d`
    - Règle seuil → `ai_suggested_reorder`
    """
    try:
        result = ai_engine.analyze_stock(db)
        _record_run("stock")
        return {"success": True, **result}
    except Exception as e:
        logger.error(f"❌ [AI-Stock] {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze/purchases", summary="Analyse achats & fiabilité fournisseurs")
def analyze_purchases(db: Session = Depends(get_db)):
    """
    **Algorithmes utilisés :**
    - RandomForestRegressor → `ai_supplier_reliability`
    - GradientBoostingRegressor → `ai_delivery_risk`
    - IsolationForest → `ai_fraud_risk`
    """
    try:
        result = ai_engine.analyze_purchases(db)
        _record_run("purchases")
        return {"success": True, **result}
    except Exception as e:
        logger.error(f"❌ [AI-Purchases] {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze/banking", summary="Analyse risque & segmentation clients bancaires")
def analyze_banking(db: Session = Depends(get_db)):
    """
    **Algorithmes utilisés :**
    - GradientBoostingRegressor → `risk_score`
    - KMeans (4 clusters) → `segment` (premium/standard/at_risk/nouveau)
    """
    try:
        result = ai_engine.analyze_banking(db)
        _record_run("banking")
        return {"success": True, **result}
    except Exception as e:
        logger.error(f"❌ [AI-Banking] {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze/invoices", summary="Risque paiement & détection fraude factures")
def analyze_invoices(db: Session = Depends(get_db)):
    """
    **Algorithmes utilisés :**
    - GradientBoostingRegressor → `ai_payment_risk`
    - IsolationForest → `ai_fraud_score`
    """
    try:
        result = ai_engine.analyze_invoices(db)
        _record_run("invoices")
        return {"success": True, **result}
    except Exception as e:
        logger.error(f"❌ [AI-Invoices] {e}")
        raise HTTPException(status_code=500, detail=str(e))
