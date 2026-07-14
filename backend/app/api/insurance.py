# app/api/insurance.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List, Optional
from datetime import datetime, timedelta
import random
import uuid
import logging

from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.auth import User
from app.models.insurance import (
    InsuranceClaim, InsuranceFraudAlert, CatastropheRisk, WeatherAlert,
    ChurnPrediction, FraudStatistics, ClaimStatus, ClaimType,
    FraudLevel, CatastropheType, AlertLevel, ChurnRiskLevel
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/insurance", tags=["insurance"])

# ========== DONNÉES MOCK ==========

def generate_mock_claims(limit=10):
    """Génère des sinistres mock"""
    clients = ["Jean Dupont", "Marie Martin", "Pierre Durand", "Sophie Petit", "Lucas Bernard"]
    types = ["auto", "habitation", "sante", "vie"]
    statuses = ["en_attente", "en_cours", "investigation", "approuvé", "rejeté", "payé", "bloqué"]
    
    claims = []
    for i in range(limit):
        fraud_score = random.uniform(0, 0.98)
        claims.append({
            "id": i + 1,
            "claim_number": f"CLM-{datetime.now().strftime('%Y%m%d')}-{i+1:04d}",
            "client_name": random.choice(clients),
            "client_id": random.randint(1, 20),
            "claim_type": random.choice(types),
            "amount": random.randint(500, 50000),
            "description": f"Sinistre {random.choice(['auto', 'habitation', 'santé'])}",
            "incident_date": (datetime.now() - timedelta(days=random.randint(1, 30))).isoformat(),
            "status": random.choice(statuses),
            "fraud_score": round(fraud_score * 100, 1),
            "fraud_level": "critique" if fraud_score > 0.8 else "élevé" if fraud_score > 0.6 else "moyen" if fraud_score > 0.3 else "faible",
            "created_at": (datetime.now() - timedelta(days=random.randint(1, 15))).isoformat()
        })
    return claims

def generate_mock_fraud_alerts(limit=10):
    """Génère des alertes de fraude mock"""
    indicators = [
        "Montant inhabituellement élevé",
        "Délai de déclaration trop court",
        "Document falsifié détecté",
        "Localisation suspecte",
        "Multiples sinistres récents",
        "Incohérence dans les documents",
        "Adresse IP suspecte",
        "Comportement anormal"
    ]
    methods = ["XGBoost", "LightGBM", "CatBoost", "Deep Neural Network"]
    
    alerts = []
    for i in range(limit):
        fraud_score = random.uniform(0.5, 0.98)
        alerts.append({
            "id": i + 1,
            "alert_id": f"FRD-{datetime.now().strftime('%Y%m%d')}-{i+1:04d}",
            "claim_id": f"CLM-{datetime.now().strftime('%Y%m%d')}-{random.randint(100, 999)}",
            "client_name": random.choice(["Jean Dupont", "Pierre Durand", "Sophie Petit"]),
            "claim_type": random.choice(["auto", "habitation", "sante"]),
            "amount": random.randint(5000, 50000),
            "fraud_score": round(fraud_score * 100, 1),
            "fraud_level": "critique" if fraud_score > 0.85 else "élevé",
            "detection_method": random.choice(methods),
            "indicators": random.sample(indicators, random.randint(2, 4)),
            "description": random.choice(indicators),
            "status": random.choice(["investigation", "bloqué", "en_cours"]),
            "is_resolved": random.random() > 0.7,
            "created_at": (datetime.now() - timedelta(hours=random.randint(1, 72))).isoformat()
        })
    return alerts

def generate_mock_catastrophe_risks():
    """Génère les risques de catastrophes"""
    return [
        {"zone": "Bretagne", "region": "Bretagne", "catastrophe_type": "tempête", "probability": 78, "severity": 85, "alert_level": "critique", "damage_estimate": 2500000, "insured_damage": 1800000},
        {"zone": "Hauts-de-France", "region": "Hauts-de-France", "catastrophe_type": "inondation", "probability": 65, "severity": 72, "alert_level": "élevé", "damage_estimate": 1800000, "insured_damage": 1200000},
        {"zone": "Sud", "region": "Provence-Alpes-Côte d'Azur", "catastrophe_type": "canicule", "probability": 82, "severity": 68, "alert_level": "élevé", "damage_estimate": 500000, "insured_damage": 300000},
        {"zone": "Alpes", "region": "Auvergne-Rhône-Alpes", "catastrophe_type": "avalanche", "probability": 45, "severity": 55, "alert_level": "moyen", "damage_estimate": 1200000, "insured_damage": 800000}
    ]

def generate_mock_churn_risks(limit=10):
    """Génère les risques d'attrition"""
    clients = ["Jean Dupont", "Marie Martin", "Pierre Durand", "Sophie Petit", "Lucas Bernard", "Emma Robert"]
    reasons = ["Prix des primes trop élevé", "Insatisfaction du service client", "Offre concurrente plus avantageuse", "Déménagement", "Sinistre mal géré"]
    
    risks = []
    for i, client in enumerate(clients[:limit]):
        churn_prob = random.uniform(0.05, 0.95)
        risks.append({
            "id": i + 1,
            "client_name": client,
            "client_id": random.randint(1, 50),
            "churn_probability": round(churn_prob * 100, 1),
            "churn_risk_level": "critique" if churn_prob > 0.7 else "élevé" if churn_prob > 0.5 else "moyen" if churn_prob > 0.3 else "faible",
            "retention_score": round((1 - churn_prob) * 100, 1),
            "main_reason": random.choice(reasons),
            "risk_factors": ["Délai de réponse", "Fréquence des sinistres", "Montant des primes"],
            "recommended_actions": ["Appel de fidélisation", "Proposition de réduction", "Enquête de satisfaction"],
            "is_alert_sent": churn_prob > 0.5,
            "created_at": (datetime.now() - timedelta(days=random.randint(1, 15))).isoformat()
        })
    return risks

def generate_mock_weather_alerts():
    """Génère les alertes météo"""
    return [
        {"id": 1, "alert_id": "WTH-001", "alert_type": "tempête", "zone": "Bretagne", "severity": "critique", "description": "Tempête avec vents violents attendus", "start_date": (datetime.now() + timedelta(days=1)).isoformat(), "end_date": (datetime.now() + timedelta(days=2)).isoformat(), "predicted_damage": 1250000, "impact": "fort", "is_active": True},
        {"id": 2, "alert_id": "WTH-002", "alert_type": "inondation", "zone": "Hauts-de-France", "severity": "élevé", "description": "Risque d'inondation sur les zones côtières", "start_date": (datetime.now() + timedelta(days=2)).isoformat(), "end_date": (datetime.now() + timedelta(days=4)).isoformat(), "predicted_damage": 450000, "impact": "moyen", "is_active": True}
    ]

# ========== ENDPOINTS SINISTRES ==========

@router.get("/claims")
async def get_claims(
    status: Optional[str] = Query(None),
    claim_type: Optional[str] = Query(None),
    fraud_level: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupérer la liste des sinistres"""
    claims = generate_mock_claims(limit)
    
    if status and status != 'all':
        claims = [c for c in claims if c["status"] == status]
    if claim_type and claim_type != 'all':
        claims = [c for c in claims if c["claim_type"] == claim_type]
    if fraud_level and fraud_level != 'all':
        claims = [c for c in claims if c["fraud_level"] == fraud_level]
    
    return {
        "claims": claims,
        "total": len(claims)
    }

@router.get("/claims/{claim_id}")
async def get_claim(
    claim_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupérer un sinistre spécifique"""
    claims = generate_mock_claims(20)
    claim = next((c for c in claims if c["id"] == claim_id), None)
    
    if not claim:
        raise HTTPException(status_code=404, detail="Sinistre non trouvé")
    
    return claim

# ========== ENDPOINTS FRAUDE ASSURANCE ==========

@router.get("/fraud/alerts")
async def get_fraud_alerts(
    level: Optional[str] = Query(None),
    resolved: Optional[bool] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupérer les alertes de fraude assurance"""
    alerts = generate_mock_fraud_alerts(limit)
    
    if level and level != 'all':
        alerts = [a for a in alerts if a["fraud_level"] == level]
    
    if resolved is not None:
        alerts = [a for a in alerts if a.get("is_resolved") == resolved]
    
    return {
        "alerts": alerts,
        "total": len(alerts),
        "stats": {
            "critical": len([a for a in alerts if a["fraud_level"] == "critique"]),
            "high": len([a for a in alerts if a["fraud_level"] == "élevé"]),
            "avg_score": round(sum(a["fraud_score"] for a in alerts) / len(alerts), 1) if alerts else 0
        }
    }

@router.post("/fraud/alerts/{alert_id}/block")
async def block_fraud_alert(
    alert_id: int,
    reason: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Bloquer une alerte de fraude"""
    return {
        "success": True,
        "alert_id": alert_id,
        "status": "blocked",
        "message": f"Alerte {alert_id} bloquée avec succès",
        "reason": reason or "Fraude confirmée"
    }

@router.post("/fraud/alerts/{alert_id}/analyze")
async def analyze_fraud_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Analyser en profondeur une alerte de fraude"""
    alerts = generate_mock_fraud_alerts(10)
    alert = next((a for a in alerts if a["id"] == alert_id), None)
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alerte non trouvée")
    
    return {
        "alert_id": alert_id,
        "analysis": {
            "fraud_score": alert["fraud_score"],
            "fraud_level": alert["fraud_level"],
            "indicators": alert["indicators"],
            "detection_method": alert["detection_method"],
            "recommendation": "Bloquer immédiatement le sinistre et contacter le client",
            "similar_cases": random.randint(2, 8),
            "confidence": random.uniform(0.85, 0.99)
        }
    }

# ========== ENDPOINTS CATASTROPHES ==========

@router.get("/catastrophe/risks")
async def get_catastrophe_risks(
    zone: Optional[str] = Query(None),
    alert_level: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupérer les risques de catastrophes"""
    risks = generate_mock_catastrophe_risks()
    
    if zone:
        risks = [r for r in risks if zone.lower() in r["zone"].lower()]
    if alert_level and alert_level != 'all':
        risks = [r for r in risks if r["alert_level"] == alert_level]
    
    return {
        "risks": risks,
        "total": len(risks),
        "summary": {
            "critical_zones": len([r for r in risks if r["alert_level"] == "critique"]),
            "total_damage_estimate": sum(r["damage_estimate"] for r in risks),
            "total_insured_damage": sum(r["insured_damage"] for r in risks)
        }
    }

@router.get("/catastrophe/alerts")
async def get_weather_alerts(
    active_only: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupérer les alertes météo"""
    alerts = generate_mock_weather_alerts()
    
    if active_only:
        alerts = [a for a in alerts if a.get("is_active", True)]
    
    return {
        "alerts": alerts,
        "total": len(alerts)
    }

# ========== ENDPOINTS ATTRITION CLIENTS ==========

@router.get("/churn/risks")
async def get_churn_risks(
    risk_level: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupérer les risques d'attrition clients"""
    risks = generate_mock_churn_risks(limit)
    
    if risk_level and risk_level != 'all':
        risks = [r for r in risks if r["churn_risk_level"] == risk_level]
    
    return {
        "risks": risks,
        "total": len(risks),
        "stats": {
            "high_risk": len([r for r in risks if r["churn_risk_level"] in ["critique", "élevé"]]),
            "avg_churn_probability": round(sum(r["churn_probability"] for r in risks) / len(risks), 1) if risks else 0,
            "avg_retention_score": round(sum(r["retention_score"] for r in risks) / len(risks), 1) if risks else 0
        }
    }

@router.post("/churn/risks/{client_id}/retain")
async def apply_retention_action(
    client_id: int,
    action: str = Query(..., description="Action de rétention à appliquer"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Appliquer une action de rétention pour un client"""
    return {
        "success": True,
        "client_id": client_id,
        "action": action,
        "message": f"Action de rétention '{action}' appliquée avec succès",
        "recommended_follow_up": "Contacter le client dans 7 jours"
    }

# ========== ENDPOINTS STATISTIQUES ==========

@router.get("/statistics")
async def get_fraud_statistics(
    period: str = Query("month", description="day, week, month, year"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupérer les statistiques de fraude"""
    alerts = generate_mock_fraud_alerts(50)
    
    return {
        "total_detected": len(alerts),
        "blocked": len([a for a in alerts if a["status"] == "bloqué"]),
        "under_investigation": len([a for a in alerts if a["status"] == "investigation"]),
        "false_positive": random.randint(0, 5),
        "amount_saved": sum(a["amount"] for a in alerts if a["status"] == "bloqué"),
        "detection_accuracy": round(random.uniform(94, 98), 1),
        "by_type": {
            "auto": len([a for a in alerts if a["claim_type"] == "auto"]),
            "habitation": len([a for a in alerts if a["claim_type"] == "habitation"]),
            "sante": len([a for a in alerts if a["claim_type"] == "sante"]),
            "vie": len([a for a in alerts if a["claim_type"] == "vie"])
        },
        "trend": [
            {"month": "Jan", "count": random.randint(10, 30)},
            {"month": "Fév", "count": random.randint(10, 35)},
            {"month": "Mar", "count": random.randint(15, 40)},
            {"month": "Avr", "count": random.randint(20, 45)},
            {"month": "Mai", "count": random.randint(25, 50)},
            {"month": "Juin", "count": random.randint(30, 55)}
        ]
    }

# ========== ENDPOINTS DASHBOARD ==========

@router.get("/dashboard")
async def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupérer le résumé du tableau de bord assurance"""
    claims = generate_mock_claims(100)
    fraud_alerts = generate_mock_fraud_alerts(50)
    churn_risks = generate_mock_churn_risks(20)
    catastrophe_risks = generate_mock_catastrophe_risks()
    
    return {
        "kpis": {
            "total_claims": len(claims),
            "pending_claims": len([c for c in claims if c["status"] in ["en_attente", "en_cours"]]),
            "fraud_alerts": len(fraud_alerts),
            "critical_fraud": len([a for a in fraud_alerts if a["fraud_level"] == "critique"]),
            "churn_risk_high": len([r for r in churn_risks if r["churn_risk_level"] in ["critique", "élevé"]]),
            "catastrophe_risk_critical": len([r for r in catastrophe_risks if r["alert_level"] == "critique"]),
            "amount_saved": sum(a["amount"] for a in fraud_alerts if a["status"] == "bloqué")
        },
        "fraud_stats": {
            "detection_rate": round(random.uniform(94, 98), 1),
            "false_positive_rate": round(random.uniform(1, 4), 1),
            "avg_processing_time": round(random.uniform(2, 5), 1)
        },
        "last_update": datetime.now().isoformat()
    }

logger.info("✅ MODULE INSURANCE CHARGÉ AVEC SUCCÈS")