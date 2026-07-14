# app/api/banking.py
from fastapi import APIRouter, Depends, Query, HTTPException
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import random
import uuid
from app.database import get_db
import logging
logger = logging.getLogger(__name__)
router = APIRouter(prefix="/banking", tags=["banking"])

logger.info("🔧 CHARGEMENT DU MODULE BANKING...")

# ========== DONNÉES MOCK ==========

def generate_mock_transactions(period="month", limit=10):
    """Génère des transactions mock"""
    types = ["virement", "carte", "prélèvement", "espèces", "chèque"]
    statuses = ["complété", "en attente", "bloqué"]
    clients = [
        {"id": 1, "name": "Jean Dupont", "email": "jean.dupont@example.com"},
        {"id": 2, "name": "Marie Martin", "email": "marie.martin@example.com"},
        {"id": 3, "name": "Pierre Durand", "email": "pierre.durand@example.com"},
        {"id": 4, "name": "Sophie Bernard", "email": "sophie.bernard@example.com"},
        {"id": 5, "name": "Lucas Petit", "email": "lucas.petit@example.com"}
    ]
    
    transactions = []
    now = datetime.now()
    
    for i in range(limit):
        client = random.choice(clients)
        amount = random.randint(50, 50000)
        risk = random.random()
        
        transactions.append({
            "id": i + 1,
            "transaction_id": f"TX-{datetime.now().strftime('%Y%m%d')}-{i+1:04d}",
            "client": client["name"],
            "client_id": client["id"],
            "client_email": client["email"],
            "amount": amount,
            "type": random.choice(types),
            "status": random.choice(statuses),
            "risk_score": round(risk * 100, 1),
            "risk_level": "critical" if risk > 0.8 else "high" if risk > 0.6 else "medium" if risk > 0.3 else "low",
            "description": f"Transaction {random.choice(['Achat', 'Virement', 'Paiement', 'Retrait'])}",
            "date": (now - timedelta(days=random.randint(0, 30))).strftime("%Y-%m-%d"),
            "timestamp": (now - timedelta(hours=random.randint(1, 720))).isoformat(),
            "ip_address": f"192.168.{random.randint(1, 255)}.{random.randint(1, 255)}",
            "device_id": f"DEV-{random.randint(1000, 9999)}"
        })
    
    return sorted(transactions, key=lambda x: x["timestamp"], reverse=True)

def generate_mock_fraud_alerts(limit=10):
    """Génère des alertes de fraude mock"""
    levels = ["critique", "élevé", "moyen", "faible"]
    detection_methods = ["XGBoost", "LightGBM", "CatBoost", "Deep Neural Network", "Ensemble"]
    indicators = [
        "Montant inhabituellement élevé",
        "Localisation suspecte",
        "Heure anormale (nuit)",
        "Nouveau bénéficiaire",
        "Multiples transactions en peu de temps",
        "Adresse IP suspecte",
        "Device ID anormal"
    ]
    
    alerts = []
    now = datetime.now()
    
    for i in range(limit):
        risk_score = random.uniform(0.4, 0.98)
        level = "critique" if risk_score > 0.85 else "élevé" if risk_score > 0.7 else "moyen" if risk_score > 0.5 else "faible"
        
        alerts.append({
            "id": i + 1,
            "alert_id": f"FRD-{datetime.now().strftime('%Y%m%d')}-{i+1:04d}",
            "transaction_id": f"TX-{datetime.now().strftime('%Y%m%d')}-{random.randint(1000, 9999)}",
            "amount": random.randint(5000, 100000),
            "fraud_score": round(risk_score * 100, 1),
            "fraud_level": level,
            "description": random.choice(indicators),
            "detection_method": random.choice(detection_methods),
            "indicators": random.sample(indicators, random.randint(2, 4)),
            "is_resolved": random.random() > 0.7,
            "created_at": (now - timedelta(hours=random.randint(1, 48))).isoformat(),
            "client": random.choice(["Jean Dupont", "Pierre Durand", "Lucas Petit"]),
            "recommendation": "Bloquer immédiatement" if risk_score > 0.8 else "Surveiller" if risk_score > 0.6 else "Analyse complémentaire"
        })
    
    return sorted(alerts, key=lambda x: x["fraud_score"], reverse=True)

def generate_mock_clients(limit=20):
    """Génère des clients mock"""
    first_names = ["Jean", "Marie", "Pierre", "Sophie", "Lucas", "Emma", "Louis", "Camille", "Hugo", "Chloé"]
    last_names = ["Dupont", "Martin", "Durand", "Bernard", "Petit", "Robert", "Richard", "Dubois", "Moreau", "Laurent"]
    professions = ["Ingénieur", "Médecin", "Enseignant", "Commerçant", "Retraité", "Étudiant", "Avocat", "Consultant"]
    risk_levels = ["low", "medium", "high", "critical"]
    
    clients = []
    
    for i in range(limit):
        first_name = random.choice(first_names)
        last_name = random.choice(last_names)
        credit_score = random.randint(450, 850)
        
        clients.append({
            "id": i + 1,
            "client_id": f"CLT-{i+1:04d}",
            "first_name": first_name,
            "last_name": last_name,
            "email": f"{first_name.lower()}.{last_name.lower()}@example.com",
            "phone": f"+33{random.randint(600000000, 799999999)}",
            "address": f"{random.randint(1, 200)} rue {random.choice(['de Paris', 'Victor Hugo', 'de la République', 'des Lilas'])}, {random.randint(75000, 95000)}",
            "profession": random.choice(professions),
            "annual_income": random.randint(25000, 150000),
            "credit_score": credit_score,
            "risk_level": random.choice(risk_levels),
            "risk_score": round(random.uniform(0, 100), 1),
            "is_active": random.random() > 0.1,
            "created_at": (datetime.now() - timedelta(days=random.randint(30, 1095))).isoformat(),
            "accounts_count": random.randint(1, 4),
            "total_balance": round(random.uniform(5000, 150000), 2)
        })
    
    return clients

def generate_mock_loans(limit=10):
    """Génère des demandes de crédit mock"""
    purposes = ["Achat immobilier", "Travaux", "Voiture", "Consommation", "Création d'entreprise"]
    statuses = ["en_attente", "approuvé", "rejeté", "actif", "clôturé"]
    clients = ["Jean Dupont", "Marie Martin", "Pierre Durand", "Sophie Bernard", "Lucas Petit", "Emma Robert"]
    
    loans = []
    
    for i in range(limit):
        amount = random.randint(10000, 300000)
        duration = random.choice([12, 24, 36, 60, 120, 180, 240])
        interest_rate = round(random.uniform(2.5, 6.5), 2)
        monthly_payment = round(amount * (interest_rate / 100 / 12) / (1 - (1 + interest_rate / 100 / 12) ** -duration), 2)
        
        loans.append({
            "id": i + 1,
            "loan_number": f"LN-{datetime.now().strftime('%Y%m%d')}-{i+1:04d}",
            "client": random.choice(clients),
            "client_id": random.randint(1, 20),
            "amount": amount,
            "duration_months": duration,
            "interest_rate": interest_rate,
            "monthly_payment": monthly_payment,
            "purpose": random.choice(purposes),
            "status": random.choice(statuses),
            "credit_score_at_application": random.randint(500, 850),
            "risk_assessment_score": round(random.uniform(0, 100), 1),
            "created_at": (datetime.now() - timedelta(days=random.randint(1, 90))).isoformat(),
            "approved_at": (datetime.now() - timedelta(days=random.randint(1, 30))).isoformat() if random.random() > 0.6 else None
        })
    
    return sorted(loans, key=lambda x: x["created_at"], reverse=True)

def generate_mock_aml_alerts(limit=10):
    """Génère des alertes LCB-FT mock"""
    types = ["Virement fractionné", "Transaction suspecte", "Pays à risque", "Montant inhabituel", "Origine des fonds douteuse"]
    levels = ["critique", "élevé", "moyen", "faible"]
    clients = ["Pierre Durand", "Lucas Petit", "Jean Dupont", "Sophie Bernard"]
    
    alerts = []
    
    for i in range(limit):
        alerts.append({
            "id": i + 1,
            "alert_id": f"AML-{datetime.now().strftime('%Y%m%d')}-{i+1:04d}",
            "client": random.choice(clients),
            "client_id": random.randint(1, 20),
            "type": random.choice(types),
            "level": random.choice(levels),
            "amount": random.randint(10000, 200000),
            "description": f"Détection de {random.choice(types).lower()} nécessitant investigation",
            "transactions": [f"TX-{random.randint(1000, 9999)}" for _ in range(random.randint(2, 5))],
            "is_investigated": random.random() > 0.7,
            "created_at": (datetime.now() - timedelta(days=random.randint(1, 30))).isoformat(),
            "investigation_notes": "En cours d'analyse" if random.random() > 0.8 else None
        })
    
    return sorted(alerts, key=lambda x: x["created_at"], reverse=True)

def generate_mock_risk_metrics():
    """Génère les métriques de risque"""
    return {
        "credit_risk": round(random.uniform(5, 25), 1),
        "market_risk": round(random.uniform(3, 18), 1),
        "operational_risk": round(random.uniform(2, 12), 1),
        "liquidity_risk": round(random.uniform(4, 20), 1),
        "global_score": random.randint(70, 98),
        "risk_level": random.choice(["low", "medium", "high", "critical"]),
        "var_95": round(random.uniform(100000, 500000), 0),
        "expected_loss": round(random.uniform(50000, 200000), 0),
        "stress_test_score": random.randint(65, 95)
    }

def generate_mock_credit_scores(limit=20):
    """Génère les scores de crédit"""
    clients = generate_mock_clients(limit)
    
    return [
        {
            "client_id": c["client_id"],
            "client_name": f"{c['first_name']} {c['last_name']}",
            "credit_score": c["credit_score"],
            "risk_level": c["risk_level"],
            "risk_score": c["risk_score"],
            "factors": [
                {"name": "Historique paiement", "score": random.randint(60, 95), "impact": "positif" if random.random() > 0.3 else "negatif"},
                {"name": "Endettement", "score": random.randint(40, 90), "impact": "neutre"},
                {"name": "Ancienneté", "score": random.randint(50, 95), "impact": "positif"},
                {"name": "Comportement", "score": random.randint(55, 92), "impact": "positif"}
            ],
            "evolution": [
                {"month": "Jan", "score": random.randint(500, 700)},
                {"month": "Fév", "score": random.randint(550, 720)},
                {"month": "Mar", "score": random.randint(580, 750)},
                {"month": "Avr", "score": random.randint(600, 780)},
                {"month": "Mai", "score": random.randint(620, 800)},
                {"month": "Juin", "score": c["credit_score"]}
            ]
        }
        for c in clients
    ]

def generate_mock_accounts(limit=30):
    """Génère des comptes bancaires mock"""
    account_types = ["courant", "épargne", "professionnel", "joint"]
    currencies = ["EUR", "USD", "GBP", "CHF"]
    clients = generate_mock_clients(15)
    
    accounts = []
    
    for i in range(limit):
        client = random.choice(clients)
        accounts.append({
            "id": i + 1,
            "account_number": f"FR76{random.randint(10000000000000, 99999999999999)}",
            "iban": f"FR76{random.randint(10000000000000, 99999999999999)}",
            "account_type": random.choice(account_types),
            "balance": round(random.uniform(500, 250000), 2),
            "currency": random.choice(currencies),
            "client_id": client["id"],
            "client_name": f"{client['first_name']} {client['last_name']}",
            "is_active": random.random() > 0.1,
            "opening_date": (datetime.now() - timedelta(days=random.randint(30, 1825))).strftime("%Y-%m-%d"),
            "last_transaction": (datetime.now() - timedelta(days=random.randint(1, 30))).isoformat()
        })
    
    return accounts

# ========== ENDPOINTS ==========

@router.get("/transactions")
async def get_transactions(
    period: str = Query("month", description="day, week, month, year"),
    client_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db = Depends(get_db)
):
    """Récupérer les transactions bancaires"""
    transactions = generate_mock_transactions(period, limit)
    
    if client_id:
        transactions = [t for t in transactions if t.get("client_id") == client_id]
    
    if status:
        transactions = [t for t in transactions if t.get("status") == status]
    
    # Calcul des statistiques
    total_amount = sum(t["amount"] for t in transactions)
    avg_amount = total_amount / len(transactions) if transactions else 0
    
    return {
        "transactions": transactions,
        "total": len(transactions),
        "period": period,
        "stats": {
            "total_amount": total_amount,
            "average_amount": round(avg_amount, 2),
            "max_amount": max([t["amount"] for t in transactions]) if transactions else 0,
            "min_amount": min([t["amount"] for t in transactions]) if transactions else 0
        }
    }

@router.get("/fraud/alerts")
async def get_fraud_alerts(
    level: Optional[str] = Query(None),
    resolved: Optional[bool] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db = Depends(get_db)
):
    """Récupérer les alertes de fraude"""
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
            "medium": len([a for a in alerts if a["fraud_level"] == "moyen"]),
            "low": len([a for a in alerts if a["fraud_level"] == "faible"])
        }
    }

@router.get("/fraud/alerts/{alert_id}")
async def get_fraud_alert(
    alert_id: int,
    db = Depends(get_db)
):
    """Récupérer une alerte de fraude spécifique"""
    alerts = generate_mock_fraud_alerts(20)
    alert = next((a for a in alerts if a["id"] == alert_id), None)
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alerte non trouvée")
    
    return alert

@router.post("/fraud/alerts/{alert_id}/block")
async def block_fraud_alert(
    alert_id: int,
    reason: Optional[str] = Query(None),
    db = Depends(get_db)
):
    """Bloquer une alerte de fraude"""
    return {
        "success": True,
        "alert_id": alert_id,
        "status": "blocked",
        "message": f"Alerte {alert_id} bloquée avec succès",
        "reason": reason or "Fraude confirmée"
    }

@router.get("/clients")
async def get_clients(
    search: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db = Depends(get_db)
):
    """Récupérer la liste des clients"""
    clients = generate_mock_clients(limit)
    
    if search:
        clients = [c for c in clients if search.lower() in c["first_name"].lower() or search.lower() in c["last_name"].lower() or search.lower() in c["email"].lower()]
    
    if risk_level and risk_level != 'all':
        clients = [c for c in clients if c["risk_level"] == risk_level]
    
    return {
        "clients": clients,
        "total": len(clients),
        "stats": {
            "low_risk": len([c for c in clients if c["risk_level"] == "low"]),
            "medium_risk": len([c for c in clients if c["risk_level"] == "medium"]),
            "high_risk": len([c for c in clients if c["risk_level"] == "high"]),
            "critical_risk": len([c for c in clients if c["risk_level"] == "critical"]),
            "average_credit_score": round(sum(c["credit_score"] for c in clients) / len(clients), 0) if clients else 0
        }
    }

@router.get("/clients/{client_id}")
async def get_client(
    client_id: int,
    db = Depends(get_db)
):
    """Récupérer un client spécifique"""
    clients = generate_mock_clients(50)
    client = next((c for c in clients if c["id"] == client_id), None)
    
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    # Ajouter les transactions et comptes du client
    transactions = generate_mock_transactions("month", 10)
    client_transactions = [t for t in transactions if t.get("client_id") == client_id]
    
    accounts = generate_mock_accounts(20)
    client_accounts = [a for a in accounts if a.get("client_id") == client_id]
    
    return {
        **client,
        "recent_transactions": client_transactions[:5],
        "accounts": client_accounts,
        "statistics": {
            "total_transactions": len(client_transactions),
            "total_amount": sum(t["amount"] for t in client_transactions),
            "average_amount": round(sum(t["amount"] for t in client_transactions) / len(client_transactions), 2) if client_transactions else 0
        }
    }

@router.post("/clients")
async def create_client(
    client_data: dict,
    db = Depends(get_db)
):
    """Créer un nouveau client"""
    new_id = random.randint(100, 999)
    
    new_client = {
        "id": new_id,
        "client_id": f"CLT-{new_id:04d}",
        "first_name": client_data.get("first_name"),
        "last_name": client_data.get("last_name"),
        "email": client_data.get("email"),
        "phone": client_data.get("phone"),
        "address": client_data.get("address"),
        "profession": client_data.get("profession", "Non renseigné"),
        "annual_income": client_data.get("annual_income", 0),
        "credit_score": 500,
        "risk_level": "low",
        "risk_score": 0,
        "is_active": True,
        "created_at": datetime.now().isoformat(),
        "accounts_count": 0,
        "total_balance": 0
    }
    
    return {
        "success": True,
        "client": new_client,
        "message": f"Client {client_data.get('first_name')} {client_data.get('last_name')} créé avec succès"
    }

@router.get("/loans")
async def get_loans(
    status: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db = Depends(get_db)
):
    """Récupérer les demandes de crédit"""
    loans = generate_mock_loans(limit)
    
    if status and status != 'all':
        loans = [l for l in loans if l["status"] == status]
    
    return {
        "loans": loans,
        "total": len(loans),
        "stats": {
            "total_amount": sum(l["amount"] for l in loans),
            "average_amount": round(sum(l["amount"] for l in loans) / len(loans), 0) if loans else 0,
            "approved": len([l for l in loans if l["status"] == "approuvé"]),
            "pending": len([l for l in loans if l["status"] == "en_attente"]),
            "active": len([l for l in loans if l["status"] == "actif"])
        }
    }

@router.get("/loans/{loan_id}")
async def get_loan(
    loan_id: int,
    db = Depends(get_db)
):
    """Récupérer une demande de crédit spécifique"""
    loans = generate_mock_loans(30)
    loan = next((l for l in loans if l["id"] == loan_id), None)
    
    if not loan:
        raise HTTPException(status_code=404, detail="Crédit non trouvé")
    
    return loan

@router.post("/loans/{loan_id}/approve")
async def approve_loan(
    loan_id: int,
    db = Depends(get_db)
):
    """Approuver une demande de crédit"""
    return {
        "success": True,
        "loan_id": loan_id,
        "status": "approved",
        "message": f"Crédit {loan_id} approuvé avec succès"
    }

@router.get("/risk/metrics")
async def get_risk_metrics(db = Depends(get_db)):
    """Récupérer les métriques de risque"""
    metrics = generate_mock_risk_metrics()
    
    return {
        "risk_score": metrics["global_score"],
        "level": metrics["risk_level"],
        "metrics": metrics
    }

@router.get("/credit-scores")
async def get_credit_scores(
    client_id: Optional[int] = Query(None),
    db = Depends(get_db)
):
    """Récupérer les scores de crédit"""
    scores = generate_mock_credit_scores(20)
    
    if client_id:
        client_scores = [s for s in scores if s["client_id"] == f"CLT-{client_id:04d}"]
        if client_scores:
            return client_scores[0]
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    return {
        "scores": scores,
        "average": round(sum(s["credit_score"] for s in scores) / len(scores), 0) if scores else 0,
        "distribution": {
            "excellent_750": len([s for s in scores if s["credit_score"] >= 750]),
            "good_650_749": len([s for s in scores if 650 <= s["credit_score"] < 750]),
            "fair_550_649": len([s for s in scores if 550 <= s["credit_score"] < 650]),
            "poor_below_550": len([s for s in scores if s["credit_score"] < 550])
        }
    }

@router.post("/credit-scores/calculate")
async def calculate_credit_score(
    client_data: dict,
    db = Depends(get_db)
):
    """Calculer un score de crédit pour un client"""
    annual_income = client_data.get("annual_income", 0)
    existing_debt = client_data.get("existing_debt", 0)
    payment_history = client_data.get("payment_history", 80)
    account_age_years = client_data.get("account_age_years", 5)
    
    score = 300
    score += min(int(annual_income / 1000), 200) if annual_income > 0 else 0
    
    if annual_income > 0:
        debt_ratio = existing_debt / annual_income
        if debt_ratio < 0.2:
            score += 100
        elif debt_ratio < 0.35:
            score += 50
        elif debt_ratio > 0.5:
            score -= 50
    
    score += int(payment_history * 0.8)
    score += min(account_age_years * 10, 100)
    
    score = max(300, min(850, score))
    
    return {
        "credit_score": score,
        "risk_level": "low" if score > 700 else "medium" if score > 550 else "high",
        "factors": {
            "income_impact": "positif" if annual_income > 60000 else "neutre",
            "debt_ratio": round(existing_debt / annual_income * 100, 1) if annual_income > 0 else 0,
            "payment_history": payment_history,
            "account_age": account_age_years
        }
    }

@router.get("/compliance")
async def get_compliance(db = Depends(get_db)):
    """Récupérer l'état de conformité"""
    aml_alerts = generate_mock_aml_alerts(10)
    
    return {
        "status": "compliant",
        "score": random.randint(95, 99),
        "alerts": len(aml_alerts),
        "unresolved_alerts": len([a for a in aml_alerts if not a.get("is_investigated", False)]),
        "last_audit": (datetime.now() - timedelta(days=random.randint(30, 180))).isoformat(),
        "next_audit": (datetime.now() + timedelta(days=random.randint(30, 90))).isoformat()
    }

@router.get("/aml/alerts")
async def get_aml_alerts(
    level: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db = Depends(get_db)
):
    """Récupérer les alertes LCB-FT"""
    alerts = generate_mock_aml_alerts(limit)
    
    if level and level != 'all':
        alerts = [a for a in alerts if a["level"] == level]
    
    return {
        "alerts": alerts,
        "total": len(alerts),
        "stats": {
            "critical": len([a for a in alerts if a["level"] == "critique"]),
            "high": len([a for a in alerts if a["level"] == "élevé"]),
            "medium": len([a for a in alerts if a["level"] == "moyen"]),
            "low": len([a for a in alerts if a["level"] == "faible"])
        }
    }

@router.get("/accounts")
async def get_accounts(
    client_id: Optional[int] = Query(None),
    limit: int = Query(30, ge=1, le=100),
    db = Depends(get_db)
):
    """Récupérer les comptes bancaires"""
    accounts = generate_mock_accounts(limit)
    
    if client_id:
        accounts = [a for a in accounts if a.get("client_id") == client_id]
    
    return {
        "accounts": accounts,
        "total": len(accounts),
        "total_balance": sum(a["balance"] for a in accounts)
    }

@router.get("/dashboard")
async def get_dashboard_summary(db = Depends(get_db)):
    """Récupérer le résumé du tableau de bord"""
    transactions = generate_mock_transactions("month", 100)
    fraud_alerts = generate_mock_fraud_alerts(20)
    clients = generate_mock_clients(20)
    loans = generate_mock_loans(10)
    risk_metrics = generate_mock_risk_metrics()
    
    return {
        "kpis": {
            "total_transactions": len(transactions),
            "total_volume": sum(t["amount"] for t in transactions),
            "fraud_alerts": len(fraud_alerts),
            "critical_alerts": len([a for a in fraud_alerts if a["fraud_level"] == "critique"]),
            "total_clients": len(clients),
            "active_loans": len([l for l in loans if l["status"] == "actif"]),
            "pending_loans": len([l for l in loans if l["status"] == "en_attente"]),
            "risk_score": risk_metrics["global_score"]
        },
        "trends": {
            "transactions_last_7_days": [random.randint(100, 500) for _ in range(7)],
            "fraud_last_7_days": [random.randint(5, 30) for _ in range(7)]
        }
    }

@router.get("/fraud/graph-analysis")
async def get_fraud_graph_analysis(db = Depends(get_db)):
    """
    Retourne une analyse de graphe (GNN/GraphTransformer) pour la détection de fraude.
    Visualise les relations complexes entre comptes, IPs et transactions.
    """
    # Simulation d'un cluster suspect de blanchiment
    nodes = [
        {"id": "C1", "name": "Jean Dupont", "type": "client", "risk": 0.82},
        {"id": "A1", "name": "Account Main", "type": "account", "risk": 0.45},
        {"id": "A2", "name": "Account Secondary", "type": "account", "risk": 0.78},
        {"id": "IP1", "name": "192.168.1.45", "type": "ip", "risk": 0.95},
        {"id": "D1", "name": "iPhone 13", "type": "device", "risk": 0.3},
        {"id": "C2", "name": "Société Ecran X", "type": "client", "risk": 0.98},
        {"id": "A3", "name": "Account Offshore", "type": "account", "risk": 0.99},
        {"id": "T1", "name": "TX-9942", "type": "transaction", "amount": 45000, "risk": 0.9},
    ]
    
    links = [
        {"source": "C1", "target": "A1", "type": "owns"},
        {"source": "C1", "target": "A2", "type": "owns"},
        {"source": "A1", "target": "IP1", "type": "logged_from"},
        {"source": "A2", "target": "IP1", "type": "logged_from"},
        {"source": "IP1", "target": "C2", "type": "shared_access"},
        {"source": "C2", "target": "A3", "type": "owns"},
        {"source": "A1", "target": "T1", "type": "originates"},
        {"source": "T1", "target": "A3", "type": "targets"},
    ]
    
    return {
        "nodes": nodes,
        "links": links,
        "gnn_summary": {
            "model": "GraphTransformer-v4",
            "confidence": 0.94,
            "detected_pattern": "Circular Laundering / Shell Company",
            "last_training": datetime.now().isoformat()
        }
    }

@router.get("/pipeline/status")
async def get_pipeline_status(db = Depends(get_db)):
    """Retourne l'état de santé et les métriques de l'orchestrateur Grover."""
    return {
        "orchestrator": {
            "status": "online",
            "version": "Grover-v3.2",
            "uptime": "14d 5h 22m",
            "active_tasks": random.randint(5, 25)
        },
        "components": [
            {"id": "kafka", "name": "Kafka Ingestion", "status": "healthy", "latency": "2ms", "throughput": "4.2k eps"},
            {"id": "spark", "name": "Spark Streaming", "status": "healthy", "latency": "45ms", "throughput": "3.8k eps"},
            {"id": "neo4j", "name": "Neo4j Graph Store", "status": "healthy", "nodes": 1240502, "edges": 5840201},
            {"id": "gnn", "name": "GNN + Transformer", "status": "healthy", "confidence": "98.4%", "inference_time": "18ms"},
            {"id": "blockchain", "name": "Traceability Ledger", "status": "synced", "last_block": "0x4a2c...f92", "sync_rate": "100%"}
        ],
        "load_distribution": {
            "GNN": 45,
            "Search": 35,
            "Deep": 20
        }
    }

@router.get("/grover/search")
async def grover_search(query: str = Query(..., min_length=2), db = Depends(get_db)):
    """Recherche sémantique via le service Grover."""
    try:
        from app.grover_service import search_fraud
        results = search_fraud(query)
        if not results:
            # Fallback mock si ES vide
            results = [
                {"transaction_id": f"TX-{random.randint(1000,9999)}", "explanation": f"Similar pattern to {query} detected in high-risk cluster.", "path": "GNN", "risk_score": 0.89},
                {"transaction_id": f"TX-{random.randint(1000,9999)}", "explanation": f"Search match for {query} with suspected shell company behavior.", "path": "Search", "risk_score": 0.72}
            ]
        return results
    except Exception as e:
        return {"error": str(e), "results": []}

@router.post("/pipeline/stress-test")
async def trigger_stress_test(intensity: int = 100, db = Depends(get_db)):
    """Simule une montée en charge massive sur le pipeline Kafka/GNN."""
    # Simulation de l'envoi de messages massifs
    throughput = intensity * random.randint(50, 150)
    latency = 10 + (intensity / 5)
    
    return {
        "status": "stress_test_active",
        "simulated_load": f"{intensity}%",
        "current_throughput": f"{throughput} eps",
        "projected_latency": f"{latency:.1f}ms",
        "warning": "GNN Layer reaching critical load" if intensity > 80 else None,
        "timestamp": datetime.now().isoformat()
    }

@router.get("/fraud/explain/{transaction_id}")
async def explain_fraud(transaction_id: str, db = Depends(get_db)):
    """Explique la décision de l'IA (XAI) via des valeurs de type SHAP/LIME."""
    features = [
        {"name": "Proximité IP suspecte", "value": random.uniform(0.1, 0.9), "impact": "positif"},
        {"name": "Fréquence inhabituelle", "value": random.uniform(0.1, 0.7), "impact": "positif"},
        {"name": "Nœud Graphe (Centralité)", "value": random.uniform(0.1, 0.8), "impact": "positif"},
        {"name": "Vérification KYC", "value": -random.uniform(0.1, 0.4), "impact": "négatif"},
        {"name": "Historique de crédit", "value": -random.uniform(0.1, 0.5), "impact": "négatif"},
        {"name": "Montant atypique", "value": random.uniform(0.4, 0.95), "impact": "positif"}
    ]
    
    return {
        "transaction_id": transaction_id,
        "model": "GraphTransformer-v4-XAI",
        "explanation": "Le score élevé est principalement dû à un montant atypique combiné à une centralité élevée dans un cluster de comptes non vérifiés.",
        "features": sorted(features, key=lambda x: abs(x['value']), reverse=True)
    }

logger.info("✅ MODULE BANKING CHARGÉ AVEC SUCCÈS")