"""
app/services/ai_engine_service.py
==================================
Moteur IA centralisé pour l'ERP Nexum.

Ce service contient des algorithmes Machine Learning scikit-learn qui calculent
et mettent à jour les colonnes ai_* de chaque modèle SQLAlchemy.

Algorithmes utilisés :
  - RandomForestClassifier / RandomForestRegressor
  - GradientBoostingRegressor
  - IsolationForest (détection d'anomalies)
  - LinearRegression
  - KMeans (segmentation)
  - LogisticRegression
"""

import logging
import math
from datetime import datetime, date
from typing import Dict, Any, List, Optional

import numpy as np
from sklearn.ensemble import (
    RandomForestClassifier,
    RandomForestRegressor,
    GradientBoostingRegressor,
    IsolationForest,
)
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _safe_float(val, default: float = 0.0) -> float:
    """Convert any value to float safely."""
    try:
        if val is None:
            return default
        return float(val)
    except (TypeError, ValueError):
        return default


def _days_since(dt) -> float:
    """Return days elapsed since a date/datetime. Returns 0 if None."""
    if dt is None:
        return 0.0
    try:
        if isinstance(dt, datetime):
            return max(0.0, (datetime.utcnow() - dt).days)
        if isinstance(dt, date):
            return max(0.0, (date.today() - dt).days)
    except Exception:
        pass
    return 0.0


def _fit_predict(X: np.ndarray, model) -> np.ndarray:
    """Fit model and return predictions, with fallback to zeros on error."""
    try:
        model.fit(X, np.zeros(len(X)))  # unsupervised case
        return model.predict(X)
    except Exception as e:
        logger.warning(f"Model fit/predict failed: {e}")
        return np.zeros(len(X))


# ---------------------------------------------------------------------------
# 1. SALES — SaleOrder
# ---------------------------------------------------------------------------

def analyze_sales(db) -> Dict[str, Any]:
    """
    Calcule les scores IA pour chaque SaleOrder :
      - ai_closing_probability  : Gradient Boosting (probabilité de conversion)
      - ai_revenue_forecast     : Random Forest Regressor (prévision revenus)
      - ai_customer_sentiment   : score heuristique basé sur le statut
      - ai_churn_risk_interaction: Logistic Regression
    """
    from app.models.sale import SaleOrder

    orders = db.query(SaleOrder).all()
    if not orders:
        return {"updated": 0, "domain": "sales"}

    # Build feature matrix
    # Features: [amount_total, amount_tax, nb_lines, days_since_order, discount_ratio]
    X = []
    for o in orders:
        lines = o.lines if o.lines else []
        total_discount = sum(_safe_float(l.discount) for l in lines)
        avg_discount = total_discount / max(len(lines), 1)
        X.append([
            _safe_float(o.amount_total),
            _safe_float(o.amount_tax),
            len(lines),
            _days_since(o.date_order),
            avg_discount,
        ])

    X_arr = np.array(X, dtype=float)
    n = len(X_arr)

    # ── Gradient Boosting → closing probability ──────────────────────────
    # Synthetic labels: orders with high amount & few days = higher probability
    amounts = X_arr[:, 0]
    days = X_arr[:, 3]
    norm_amt = (amounts - amounts.min()) / (amounts.ptp() + 1e-9)
    norm_days = 1 - (days - days.min()) / (days.ptp() + 1e-9)
    y_close = np.clip(0.3 * norm_amt + 0.4 * norm_days + 0.3 * np.random.RandomState(42).rand(n), 0, 1)

    gb = GradientBoostingRegressor(n_estimators=30, max_depth=3, random_state=42)
    try:
        gb.fit(X_arr, y_close)
        closing_probs = np.clip(gb.predict(X_arr), 0, 1)
    except Exception:
        closing_probs = y_close

    # ── Random Forest → revenue forecast ─────────────────────────────────
    y_rev = amounts * (1 + 0.1 * np.sin(days / 30))
    rf_reg = RandomForestRegressor(n_estimators=30, max_depth=4, random_state=42)
    try:
        rf_reg.fit(X_arr, y_rev)
        revenue_forecasts = np.clip(rf_reg.predict(X_arr), 0, None)
    except Exception:
        revenue_forecasts = y_rev

    # ── Logistic Regression → churn risk ─────────────────────────────────
    # High discount + long delay = churn risk
    y_churn = (X_arr[:, 4] > 10).astype(float) * 0.6 + (X_arr[:, 3] > 30).astype(float) * 0.4
    lr = LogisticRegression(random_state=42, max_iter=200)
    try:
        lr.fit(X_arr, (y_churn > 0.5).astype(int))
        churn_probs = lr.predict_proba(X_arr)[:, 1]
    except Exception:
        churn_probs = y_churn

    # ── Persist ──────────────────────────────────────────────────────────
    status_sentiment = {
        "terminé": 0.9, "livré": 0.85, "confirmé": 0.7,
        "brouillon": 0.4, "annulé": 0.1,
    }

    updated = 0
    for i, order in enumerate(orders):
        order.ai_closing_probability = round(float(closing_probs[i]), 4)
        order.ai_revenue_forecast = round(float(revenue_forecasts[i]), 2)
        order.ai_customer_sentiment = status_sentiment.get(order.state, 0.5)
        order.ai_churn_risk_interaction = round(float(churn_probs[i]), 4)
        order.ai_insights = {
            "closing_probability": order.ai_closing_probability,
            "revenue_forecast": order.ai_revenue_forecast,
            "churn_risk": order.ai_churn_risk_interaction,
            "analyzed_at": datetime.utcnow().isoformat(),
        }
        order.last_ai_update = datetime.utcnow()
        updated += 1

    db.commit()
    logger.info(f"✅ [AI-Sales] {updated} orders analysés")
    return {"updated": updated, "domain": "sales"}


# ---------------------------------------------------------------------------
# 2. CRM — Lead
# ---------------------------------------------------------------------------

def analyze_leads(db) -> Dict[str, Any]:
    """
    Calcule les scores IA pour chaque Lead CRM :
      - ai_lead_score     : Random Forest Classifier (0–100)
      - ai_next_action    : règle basée sur le score et le statut
      - ai_sentiment_analysis : KMeans (segmentation comportementale)
    """
    from app.models.crm import Lead

    leads = db.query(Lead).all()
    if not leads:
        return {"updated": 0, "domain": "leads"}

    X = []
    for l in leads:
        X.append([
            _safe_float(l.expected_revenue),
            _safe_float(l.probability),
            _days_since(l.created_at),
            1 if l.source else 0,
            {"high": 2, "medium": 1, "low": 0}.get(l.priority or "medium", 1),
        ])

    X_arr = np.array(X, dtype=float)
    n = len(X_arr)

    # ── Random Forest → lead score (0-100) ───────────────────────────────
    # Synthetic target: high revenue + high probability = high score
    revenues = X_arr[:, 0]
    probs = X_arr[:, 1]
    norm_rev = (revenues - revenues.min()) / (revenues.ptp() + 1e-9)
    y_score = np.clip(0.5 * norm_rev + 0.35 * (probs / 100.0) + 0.15 * np.random.RandomState(7).rand(n), 0, 1)

    rf_cls = RandomForestRegressor(n_estimators=30, max_depth=4, random_state=42)
    try:
        rf_cls.fit(X_arr, y_score * 100)
        lead_scores = np.clip(rf_cls.predict(X_arr), 0, 100)
    except Exception:
        lead_scores = y_score * 100

    # ── KMeans → segmentation (3 clusters: cold, warm, hot) ──────────────
    scaler = StandardScaler()
    try:
        X_scaled = scaler.fit_transform(X_arr)
        kmeans = KMeans(n_clusters=min(3, n), random_state=42, n_init=10)
        segments = kmeans.fit_predict(X_scaled)
    except Exception:
        segments = np.zeros(n, dtype=int)

    segment_labels = {0: "cold", 1: "warm", 2: "hot"}

    # ── Next action rules ─────────────────────────────────────────────────
    def _next_action(score: float, status: str) -> str:
        if score >= 75:
            return "Préparer une proposition commerciale personnalisée"
        elif score >= 50:
            return "Planifier un appel de qualification approfondi"
        elif score >= 25:
            return "Envoyer du contenu éducatif et nurturing"
        else:
            return "Mettre en liste de veille passive — lead non qualifié"

    updated = 0
    for i, lead in enumerate(leads):
        lead.ai_lead_score = round(float(lead_scores[i]), 1)
        lead.ai_next_action = _next_action(lead.ai_lead_score, str(lead.status))
        seg = segment_labels.get(int(segments[i]), "cold")
        lead.ai_sentiment_analysis = f"Segment: {seg} | Score: {lead.ai_lead_score}/100"
        lead.ai_risk_tags = {
            "segment": seg,
            "lead_score": lead.ai_lead_score,
            "analyzed_at": datetime.utcnow().isoformat(),
        }
        updated += 1

    db.commit()
    logger.info(f"✅ [AI-CRM] {updated} leads analysés")
    return {"updated": updated, "domain": "leads"}


# ---------------------------------------------------------------------------
# 3. HR — Employee
# ---------------------------------------------------------------------------

def analyze_employees(db) -> Dict[str, Any]:
    """
    Calcule les scores IA pour chaque Employee :
      - ai_performance_score  : Random Forest Regressor (0-100)
      - churn_risk_score      : Gradient Boosting (0-1)
      - ai_burnout_risk_score : Isolation Forest (anomalie sur congés)
      - ai_career_path_suggestion : règle basée sur le score
    """
    from app.models.hr import Employee, Leave

    employees = db.query(Employee).all()
    if not employees:
        return {"updated": 0, "domain": "employees"}

    # Compter congés par employé
    leave_counts = {}
    leaves = db.query(Leave).all()
    for lv in leaves:
        leave_counts[lv.employee_id] = leave_counts.get(lv.employee_id, 0) + 1

    X = []
    for emp in employees:
        tenure_days = _days_since(emp.hire_date)
        X.append([
            _safe_float(emp.salary),
            tenure_days,
            leave_counts.get(emp.id, 0),
            1 if emp.status and emp.status.value == "active" else 0,
            1 if emp.department_id else 0,
        ])

    X_arr = np.array(X, dtype=float)
    n = len(X_arr)

    # ── Random Forest → performance score ────────────────────────────────
    salaries = X_arr[:, 0]
    tenures = X_arr[:, 1]
    norm_sal = (salaries - salaries.min()) / (salaries.ptp() + 1e-9)
    norm_ten = np.clip(tenures / 3650, 0, 1)  # cap at 10 years
    y_perf = np.clip(0.4 * norm_sal + 0.4 * norm_ten + 0.2 * X_arr[:, 3], 0, 1) * 100

    rf_perf = RandomForestRegressor(n_estimators=30, max_depth=4, random_state=42)
    try:
        rf_perf.fit(X_arr, y_perf)
        perf_scores = np.clip(rf_perf.predict(X_arr), 0, 100)
    except Exception:
        perf_scores = y_perf

    # ── Gradient Boosting → churn risk ───────────────────────────────────
    # High leaves + low salary + short tenure = churn risk
    y_churn = np.clip(
        0.4 * (X_arr[:, 2] / (leave_counts.values().__len__() + 1))
        + 0.3 * (1 - norm_sal)
        + 0.3 * (1 - norm_ten),
        0, 1
    )
    gb_churn = GradientBoostingRegressor(n_estimators=30, max_depth=3, random_state=42)
    try:
        gb_churn.fit(X_arr, y_churn)
        churn_scores = np.clip(gb_churn.predict(X_arr), 0, 1)
    except Exception:
        churn_scores = y_churn

    # ── Isolation Forest → burnout (anomalie congés) ─────────────────────
    iso = IsolationForest(contamination=0.15, random_state=42)
    try:
        iso.fit(X_arr)
        iso_scores = iso.score_samples(X_arr)  # négatif = plus anomal
        burnout = np.clip(-iso_scores / (-iso_scores.max() + 1e-9), 0, 1)
    except Exception:
        burnout = np.zeros(n)

    # ── Career path rules ─────────────────────────────────────────────────
    def _career_path(perf: float, churn: float, tenure_days: float) -> str:
        if perf >= 80 and churn < 0.3:
            return "Profil High Performer — Recommandé pour promotion ou leadership"
        elif churn >= 0.7:
            return "Risque élevé de départ — Entretien de rétention urgent"
        elif tenure_days > 1825 and perf >= 60:
            return "Expérimenté stable — Envisager un programme de mentorat"
        elif perf < 40:
            return "Plan de développement personnalisé recommandé"
        else:
            return "Progression standard — Suivi trimestriel suffisant"

    updated = 0
    for i, emp in enumerate(employees):
        emp.ai_performance_score = round(float(perf_scores[i]), 1)
        emp.churn_risk_score = round(float(churn_scores[i]), 4)
        emp.ai_burnout_risk_score = round(float(burnout[i]), 4)
        emp.ai_career_path_suggestion = _career_path(
            emp.ai_performance_score,
            emp.churn_risk_score,
            X_arr[i, 1]
        )
        emp.ai_skill_gap_analysis = {
            "performance_score": emp.ai_performance_score,
            "churn_risk": emp.churn_risk_score,
            "burnout_risk": emp.ai_burnout_risk_score,
            "leave_count": int(X_arr[i, 2]),
        }
        emp.ai_insights = {
            "career_path": emp.ai_career_path_suggestion,
            "analyzed_at": datetime.utcnow().isoformat(),
        }
        emp.last_ai_review = datetime.utcnow()
        updated += 1

    db.commit()
    logger.info(f"✅ [AI-HR] {updated} employés analysés")
    return {"updated": updated, "domain": "employees"}


# ---------------------------------------------------------------------------
# 4. PRODUCTS — Product
# ---------------------------------------------------------------------------

def analyze_products(db) -> Dict[str, Any]:
    """
    Calcule les scores IA pour chaque Product :
      - ai_demand_forecast          : Random Forest Regressor (ventes 30j)
      - smart_reorder_point         : formule ML basée sur variance stock
      - ai_obsolescence_risk        : Isolation Forest
      - ai_customer_interest_score  : score composite
    """
    from app.models.product import Product

    products = db.query(Product).all()
    if not products:
        return {"updated": 0, "domain": "products"}

    X = []
    for p in products:
        X.append([
            _safe_float(p.unit_price),
            _safe_float(p.cost_price),
            _safe_float(p.quantity_on_hand),
            _safe_float(p.current_stock),
            _safe_float(p.min_stock),
            _safe_float(p.max_stock),
            _safe_float(p.reorder_level),
            _days_since(p.updated_at),
        ])

    X_arr = np.array(X, dtype=float)
    n = len(X_arr)

    # ── RF Regressor → demand forecast (30j) ─────────────────────────────
    stocks = X_arr[:, 2]
    prices = X_arr[:, 0]
    norm_stock = (stocks - stocks.min()) / (stocks.ptp() + 1e-9)
    norm_price = 1 - (prices - prices.min()) / (prices.ptp() + 1e-9)
    y_demand = np.clip(0.5 * norm_stock + 0.3 * norm_price + 0.2 * np.random.RandomState(11).rand(n), 0, 1) * stocks

    rf_demand = RandomForestRegressor(n_estimators=30, max_depth=4, random_state=42)
    try:
        rf_demand.fit(X_arr, y_demand)
        demand_forecasts = np.clip(rf_demand.predict(X_arr), 0, None)
    except Exception:
        demand_forecasts = y_demand

    # ── Reorder point: mean daily demand * lead time (7j) + safety stock ─
    daily_demand = demand_forecasts / 30.0
    safety_stock = daily_demand * 3  # 3 jours de sécurité
    reorder_points = daily_demand * 7 + safety_stock

    # ── Isolation Forest → obsolescence risk ─────────────────────────────
    iso_obs = IsolationForest(contamination=0.1, random_state=42)
    try:
        iso_obs.fit(X_arr)
        obs_raw = -iso_obs.score_samples(X_arr)
        obs_risk = np.clip(obs_raw / (obs_raw.max() + 1e-9), 0, 1)
    except Exception:
        obs_risk = np.zeros(n)

    # Products with very high stock and no movement (stale) = more obsolescence
    stale_mask = (X_arr[:, 2] > X_arr[:, 6]) & (X_arr[:, 7] > 90)
    obs_risk = np.where(stale_mask, np.clip(obs_risk + 0.3, 0, 1), obs_risk)

    # ── Customer interest score (composite) ───────────────────────────────
    margin_ratio = np.where(prices > 0, (prices - X_arr[:, 1]) / (prices + 1e-9), 0)
    interest = np.clip(0.4 * norm_price + 0.4 * margin_ratio + 0.2 * norm_stock, 0, 1)

    updated = 0
    for i, prod in enumerate(products):
        prod.ai_demand_forecast = round(float(demand_forecasts[i]), 2)
        prod.smart_reorder_point = round(float(reorder_points[i]), 2)
        prod.ai_obsolescence_risk = round(float(obs_risk[i]), 4)
        prod.ai_customer_interest_score = round(float(interest[i]), 4)
        prod.ai_stock_analysis = {
            "demand_forecast_30d": prod.ai_demand_forecast,
            "reorder_point": prod.smart_reorder_point,
            "obsolescence_risk": prod.ai_obsolescence_risk,
        }
        prod.ai_price_optimization = {
            "current_margin_ratio": round(float(margin_ratio[i]), 3),
            "interest_score": prod.ai_customer_interest_score,
            "recommendation": (
                "Réduire le prix pour stimuler la demande" if margin_ratio[i] > 0.5
                else "Prix compétitif — maintenir"
            ),
        }
        prod.ai_insights = {
            "demand_forecast": prod.ai_demand_forecast,
            "obsolescence_risk": prod.ai_obsolescence_risk,
            "analyzed_at": datetime.utcnow().isoformat(),
        }
        prod.last_ai_update = datetime.utcnow()
        updated += 1

    db.commit()
    logger.info(f"✅ [AI-Products] {updated} produits analysés")
    return {"updated": updated, "domain": "products"}


# ---------------------------------------------------------------------------
# 5. STOCK — StockMovement
# ---------------------------------------------------------------------------

def analyze_stock(db) -> Dict[str, Any]:
    """
    Calcule les scores IA pour chaque StockMovement :
      - ai_anomaly_score     : Isolation Forest
      - ai_stock_forecast_7d : Linear Regression sur tendance
      - ai_suggested_reorder : règle basée sur le forecast
    """
    from app.models.stock import StockMovement

    movements = db.query(StockMovement).order_by(StockMovement.created_at).all()
    if not movements:
        return {"updated": 0, "domain": "stock"}

    X = []
    for m in movements:
        X.append([
            _safe_float(m.quantity),
            _safe_float(m.previous_stock),
            _safe_float(m.new_stock),
            _safe_float(m.unit_price),
            _safe_float(m.total_price),
            _days_since(m.created_at),
        ])

    X_arr = np.array(X, dtype=float)
    n = len(X_arr)

    # ── Isolation Forest → anomaly score ─────────────────────────────────
    iso_stock = IsolationForest(contamination=0.1, random_state=42)
    try:
        iso_stock.fit(X_arr)
        anomaly_raw = -iso_stock.score_samples(X_arr)
        anomaly_scores = np.clip(anomaly_raw / (anomaly_raw.max() + 1e-9), 0, 1)
    except Exception:
        anomaly_scores = np.zeros(n)

    # ── Linear Regression → stock forecast 7j ────────────────────────────
    day_indices = np.arange(n).reshape(-1, 1)
    new_stocks = X_arr[:, 2]

    lr_stock = LinearRegression()
    try:
        lr_stock.fit(day_indices, new_stocks)
        # Forecast 7 days from now
        future_idx = np.array([[n + 7]])
        forecast_7d = float(lr_stock.predict(future_idx)[0])
        # Use the trend slope to estimate per-movement forecast
        slope = float(lr_stock.coef_[0])
        forecasts = np.clip(new_stocks + slope * 7, 0, None)
    except Exception:
        forecasts = new_stocks.copy()
        forecast_7d = float(new_stocks[-1]) if len(new_stocks) > 0 else 0.0

    # ── Reorder suggestion ────────────────────────────────────────────────
    reorder_threshold = float(X_arr[:, 1].mean()) * 0.2  # 20% of avg previous stock

    updated = 0
    for i, mvt in enumerate(movements):
        mvt.ai_anomaly_score = round(float(anomaly_scores[i]), 4)
        mvt.ai_stock_forecast_7d = round(float(forecasts[i]), 2)
        mvt.ai_suggested_reorder = bool(forecasts[i] < reorder_threshold)
        mvt.ai_insights = {
            "anomaly_score": mvt.ai_anomaly_score,
            "stock_forecast_7d": mvt.ai_stock_forecast_7d,
            "reorder_suggested": mvt.ai_suggested_reorder,
            "analyzed_at": datetime.utcnow().isoformat(),
        }
        mvt.last_ai_update = datetime.utcnow()
        updated += 1

    db.commit()
    logger.info(f"✅ [AI-Stock] {updated} mouvements analysés")
    return {"updated": updated, "domain": "stock"}


# ---------------------------------------------------------------------------
# 6. PURCHASES — PurchaseOrder
# ---------------------------------------------------------------------------

def analyze_purchases(db) -> Dict[str, Any]:
    """
    Calcule les scores IA pour chaque PurchaseOrder :
      - ai_supplier_reliability : Random Forest (score fiabilité fournisseur)
      - ai_delivery_risk        : Gradient Boosting (risque de retard)
      - ai_fraud_risk           : Isolation Forest (détection anomalies d'achat)
    """
    from app.models.purchase import PurchaseOrder

    orders = db.query(PurchaseOrder).all()
    if not orders:
        return {"updated": 0, "domain": "purchases"}

    X = []
    for o in orders:
        # Expected vs actual delivery delay
        if o.expected_date and o.delivery_date:
            delay = (o.delivery_date - o.expected_date).days
        else:
            delay = 0

        X.append([
            _safe_float(o.amount_total),
            _safe_float(o.amount_tax),
            _days_since(o.date_order),
            max(0, delay),
            1 if o.delivery_status and o.delivery_status.value == "delivered" else 0,
        ])

    X_arr = np.array(X, dtype=float)
    n = len(X_arr)

    # ── Random Forest → supplier reliability (0-100) ──────────────────────
    amounts = X_arr[:, 0]
    delays = X_arr[:, 3]
    delivered = X_arr[:, 4]
    norm_amt = (amounts - amounts.min()) / (amounts.ptp() + 1e-9)
    norm_delay = 1 - np.clip(delays / (delays.max() + 1), 0, 1)
    y_reliability = np.clip(0.4 * delivered + 0.35 * norm_delay + 0.25 * norm_amt, 0, 1) * 100

    rf_rel = RandomForestRegressor(n_estimators=30, max_depth=4, random_state=42)
    try:
        rf_rel.fit(X_arr, y_reliability)
        reliability_scores = np.clip(rf_rel.predict(X_arr), 0, 100)
    except Exception:
        reliability_scores = y_reliability

    # ── Gradient Boosting → delivery risk (0-1) ──────────────────────────
    y_risk = np.clip(0.6 * (delays / (delays.max() + 1)) + 0.4 * (1 - delivered), 0, 1)
    gb_risk = GradientBoostingRegressor(n_estimators=30, max_depth=3, random_state=42)
    try:
        gb_risk.fit(X_arr, y_risk)
        delivery_risks = np.clip(gb_risk.predict(X_arr), 0, 1)
    except Exception:
        delivery_risks = y_risk

    # ── Isolation Forest → fraud / anomaly detection ──────────────────────
    iso_pur = IsolationForest(contamination=0.1, random_state=42)
    try:
        iso_pur.fit(X_arr)
        fraud_raw = -iso_pur.score_samples(X_arr)
        fraud_risks = np.clip(fraud_raw / (fraud_raw.max() + 1e-9), 0, 1)
    except Exception:
        fraud_risks = np.zeros(n)

    updated = 0
    for i, order in enumerate(orders):
        order.ai_supplier_reliability = round(float(reliability_scores[i]), 1)
        order.ai_delivery_risk = round(float(delivery_risks[i]), 4)
        order.ai_fraud_risk = round(float(fraud_risks[i]), 4)
        order.ai_price_analysis = {
            "total_amount": _safe_float(order.amount_total),
            "fraud_risk": order.ai_fraud_risk,
            "delivery_risk": order.ai_delivery_risk,
        }
        order.ai_insights = {
            "supplier_reliability": order.ai_supplier_reliability,
            "delivery_risk": order.ai_delivery_risk,
            "fraud_risk": order.ai_fraud_risk,
            "recommendation": (
                "⚠️ Fournisseur peu fiable — Diversifier" if order.ai_supplier_reliability < 40
                else "✅ Fournisseur fiable" if order.ai_supplier_reliability > 75
                else "🔍 Fournisseur moyen — Surveiller"
            ),
            "analyzed_at": datetime.utcnow().isoformat(),
        }
        order.last_ai_update = datetime.utcnow()
        updated += 1

    db.commit()
    logger.info(f"✅ [AI-Purchases] {updated} commandes analysées")
    return {"updated": updated, "domain": "purchases"}


# ---------------------------------------------------------------------------
# 7. BANKING — Client & Transaction
# ---------------------------------------------------------------------------

def analyze_banking(db) -> Dict[str, Any]:
    """
    Calcule les scores IA pour chaque Client bancaire :
      - risk_score   : Gradient Boosting (risque client)
      - segment      : KMeans (segmentation 4 clusters)
    Et pour chaque Transaction :
      - fraud_score  : Isolation Forest
    """
    from app.models.banking import Client

    clients = db.query(Client).all()
    if not clients:
        return {"updated": 0, "domain": "banking"}

    X = []
    for c in clients:
        X.append([
            _safe_float(c.annual_income),
            _safe_float(c.credit_score),
            _safe_float(c.total_transactions),
            _safe_float(c.total_spent),
            _safe_float(c.average_transaction),
        ])

    X_arr = np.array(X, dtype=float)
    n = len(X_arr)

    # ── Gradient Boosting → risk score (0-100) ───────────────────────────
    incomes = X_arr[:, 0]
    credits = X_arr[:, 1]
    norm_inc = (incomes - incomes.min()) / (incomes.ptp() + 1e-9)
    norm_crd = (credits - credits.min()) / (credits.ptp() + 1e-9)
    y_risk = np.clip(1 - 0.5 * norm_inc - 0.5 * norm_crd, 0, 1) * 100

    gb_bank = GradientBoostingRegressor(n_estimators=30, max_depth=3, random_state=42)
    try:
        gb_bank.fit(X_arr, y_risk)
        risk_scores = np.clip(gb_bank.predict(X_arr), 0, 100)
    except Exception:
        risk_scores = y_risk

    # ── KMeans → segmentation (4 segments) ───────────────────────────────
    scaler_b = StandardScaler()
    segment_names = {0: "premium", 1: "standard", 2: "at_risk", 3: "nouveau"}
    try:
        X_scaled = scaler_b.fit_transform(X_arr)
        km = KMeans(n_clusters=min(4, n), random_state=42, n_init=10)
        segments = km.fit_predict(X_scaled)
    except Exception:
        segments = np.zeros(n, dtype=int)

    updated = 0
    for i, client in enumerate(clients):
        client.risk_score = round(float(risk_scores[i]), 1)
        client.segment = segment_names.get(int(segments[i]), "standard")
        updated += 1

    db.commit()
    logger.info(f"✅ [AI-Banking] {updated} clients analysés")
    return {"updated": updated, "domain": "banking"}


# ---------------------------------------------------------------------------
# 8. INVOICE — Invoice (Accounting)
# ---------------------------------------------------------------------------

def analyze_invoices(db) -> Dict[str, Any]:
    """
    Calcule les scores IA pour chaque Invoice :
      - ai_payment_risk  : Gradient Boosting (risque de non-paiement)
      - ai_fraud_score   : Isolation Forest
    """
    from app.models.account import Invoice

    invoices = db.query(Invoice).all()
    if not invoices:
        return {"updated": 0, "domain": "invoices"}

    X = []
    for inv in invoices:
        # Days overdue
        if inv.due_date:
            overdue = max(0, (datetime.utcnow() - inv.due_date).days) if isinstance(inv.due_date, datetime) else 0
        else:
            overdue = 0
        X.append([
            _safe_float(inv.amount_total),
            _safe_float(getattr(inv, 'amount_tax', 0)),
            _days_since(inv.created_at),
            overdue,
        ])

    X_arr = np.array(X, dtype=float)
    n = len(X_arr)
    amounts = X_arr[:, 0]
    overdues = X_arr[:, 3]

    # ── Gradient Boosting → payment risk ─────────────────────────────────
    norm_overdue = np.clip(overdues / (overdues.max() + 1), 0, 1)
    norm_amt = (amounts - amounts.min()) / (amounts.ptp() + 1e-9)
    y_pay_risk = np.clip(0.6 * norm_overdue + 0.4 * norm_amt, 0, 1)

    gb_inv = GradientBoostingRegressor(n_estimators=30, max_depth=3, random_state=42)
    try:
        gb_inv.fit(X_arr, y_pay_risk)
        pay_risks = np.clip(gb_inv.predict(X_arr), 0, 1)
    except Exception:
        pay_risks = y_pay_risk

    # ── Isolation Forest → fraud ──────────────────────────────────────────
    iso_inv = IsolationForest(contamination=0.05, random_state=42)
    try:
        iso_inv.fit(X_arr)
        fraud_raw = -iso_inv.score_samples(X_arr)
        fraud_scores = np.clip(fraud_raw / (fraud_raw.max() + 1e-9), 0, 1)
    except Exception:
        fraud_scores = np.zeros(n)

    updated = 0
    for i, inv in enumerate(invoices):
        # Dynamically set AI fields if they exist, otherwise skip gracefully
        if hasattr(inv, 'ai_payment_risk'):
            inv.ai_payment_risk = round(float(pay_risks[i]), 4)
        if hasattr(inv, 'ai_fraud_score'):
            inv.ai_fraud_score = round(float(fraud_scores[i]), 4)
        updated += 1

    db.commit()
    logger.info(f"✅ [AI-Invoices] {updated} factures analysées")
    return {"updated": updated, "domain": "invoices"}


# ---------------------------------------------------------------------------
# Master Orchestrator
# ---------------------------------------------------------------------------

def analyze_all(db) -> Dict[str, Any]:
    """
    Lance toutes les analyses IA sur tous les domaines.
    Chaque domaine est analysé indépendamment — une erreur dans l'un
    n'arrête pas les autres.
    """
    results = {}
    domains = [
        ("sales", analyze_sales),
        ("leads", analyze_leads),
        ("employees", analyze_employees),
        ("products", analyze_products),
        ("stock", analyze_stock),
        ("purchases", analyze_purchases),
        ("banking", analyze_banking),
        ("invoices", analyze_invoices),
    ]

    total_updated = 0
    for domain_name, fn in domains:
        try:
            res = fn(db)
            results[domain_name] = res
            total_updated += res.get("updated", 0)
            logger.info(f"✅ [{domain_name.upper()}] Analyse terminée: {res}")
        except Exception as e:
            logger.error(f"❌ [{domain_name.upper()}] Erreur analyse: {e}")
            results[domain_name] = {"error": str(e), "updated": 0}

    results["total_updated"] = total_updated
    results["analyzed_at"] = datetime.utcnow().isoformat()
    return results
