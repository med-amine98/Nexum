# app/api/fraud_insurance.py
from fastapi import APIRouter, Depends, Query, HTTPException, status, Path
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import json
import os
import uuid
from app.database import get_db
import logging
logger = logging.getLogger(__name__)
router = APIRouter()
logger.info("✅ ROUTER FRAUD INSURANCE CRÉÉ")

# ===== FICHIER DE PERSISTANCE =====
DATA_FILE = "data/fraud_insurance_data.json"

def ensure_data_dir():
    """Crée le dossier data s'il n'existe pas"""
    os.makedirs("data", exist_ok=True)

def load_data():
    """Charge les données depuis le fichier JSON"""
    ensure_data_dir()
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            # Convertir les dates string en datetime
            for claim in data.get('claims', []):
                if isinstance(claim.get('created_at'), str):
                    claim['created_at'] = datetime.fromisoformat(claim['created_at'])
            return data
    return {
        "claims": [],
        "clients": [],
        "rules": [],
        "alerts": []
    }

def save_data(data):
    """Sauvegarde les données dans le fichier JSON"""
    ensure_data_dir()
    # Convertir les datetime en string pour JSON
    data_copy = json.loads(json.dumps(data, default=str))
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data_copy, f, indent=2, ensure_ascii=False)

# ===== DONNÉES INITIALES =====
def init_default_data():
    """Initialise les données par défaut si le fichier est vide"""
    data = load_data()
    
    if not data['claims']:
        data['claims'] = [
            {
                "id": 1,
                "claim_number": "CLM-001",
                "client_name": "Jean Dupont",
                "client_id": 1,
                "amount": 15000,
                "claim_type": "auto",
                "risk_level": "critical",
                "fraud_score": 85.5,
                "status": "investigating",
                "created_at": datetime.now() - timedelta(hours=2),
                "description": "Accident de voiture avec dégâts importants",
                "location": "Paris",
                "documents": ["constat.pdf", "photos_accident.jpg"]
            },
            {
                "id": 2,
                "claim_number": "CLM-002",
                "client_name": "Marie Martin",
                "client_id": 2,
                "amount": 2500,
                "claim_type": "habitation",
                "risk_level": "high",
                "fraud_score": 72.3,
                "status": "blocked",
                "created_at": datetime.now() - timedelta(hours=5),
                "description": "Dégât des eaux",
                "location": "Paris",
                "documents": ["devis_plombier.pdf"]
            },
            {
                "id": 3,
                "claim_number": "CLM-003",
                "client_name": "Pierre Durand",
                "client_id": 3,
                "amount": 5000,
                "claim_type": "sante",
                "risk_level": "medium",
                "fraud_score": 65.0,
                "status": "detected",
                "created_at": datetime.now() - timedelta(hours=1),
                "description": "Frais médicaux",
                "location": "Lyon",
                "documents": ["facture_hopital.pdf"]
            }
        ]
    
    if not data['clients']:
        data['clients'] = [
            {
                "id": 1,
                "client_name": "Jean Dupont",
                "client_email": "jean.dupont@example.com",
                "client_phone": "+33123456789",
                "client_address": "12 rue de Paris, 75001 Paris",
                "claims_count": 3,
                "total_amount": 15750,
                "risk_level": "high",
                "status": "active",
                "created_at": (datetime.now() - timedelta(days=180)).isoformat()
            },
            {
                "id": 2,
                "client_name": "Marie Martin",
                "client_email": "marie.martin@example.com",
                "client_phone": "+33987654321",
                "client_address": "45 avenue des Champs, 75008 Paris",
                "claims_count": 1,
                "total_amount": 2500,
                "risk_level": "medium",
                "status": "active",
                "created_at": (datetime.now() - timedelta(days=90)).isoformat()
            },
            {
                "id": 3,
                "client_name": "Pierre Durand",
                "client_email": "pierre.durand@example.com",
                "client_phone": "+33655443322",
                "client_address": "8 rue de la République, 69001 Lyon",
                "claims_count": 0,
                "total_amount": 0,
                "risk_level": "low",
                "status": "active",
                "created_at": (datetime.now() - timedelta(days=45)).isoformat()
            },
            {
                "id": 4,
                "client_name": "Sophie Bernard",
                "client_email": "sophie.bernard@example.com",
                "client_phone": "+33455667788",
                "client_address": "23 boulevard Gambetta, 13001 Marseille",
                "claims_count": 2,
                "total_amount": 8900,
                "risk_level": "medium",
                "status": "active",
                "created_at": (datetime.now() - timedelta(days=120)).isoformat()
            },
            {
                "id": 5,
                "client_name": "Lucas Petit",
                "client_email": "lucas.petit@example.com",
                "client_phone": "+33566778899",
                "client_address": "67 rue Nationale, 59000 Lille",
                "claims_count": 4,
                "total_amount": 32500,
                "risk_level": "critical",
                "status": "blocked",
                "created_at": (datetime.now() - timedelta(days=200)).isoformat()
            }
        ]
    
    if not data['rules']:
        data['rules'] = [
            {
                "id": 1,
                "rule_id": "RULE-001",
                "rule_name": "Montant anormalement élevé",
                "threshold": 10000,
                "weight": 30,
                "is_active": True,
                "rule_type": "amount",
                "description": "Détecte les sinistres dont le montant dépasse le seuil défini"
            },
            {
                "id": 2,
                "rule_id": "RULE-002",
                "rule_name": "Délai de déclaration trop court",
                "threshold": 2,
                "weight": 20,
                "is_active": True,
                "rule_type": "velocity",
                "description": "Détecte les sinistres déclarés moins de 2 jours après l'incident"
            },
            {
                "id": 3,
                "rule_id": "RULE-003",
                "rule_name": "Nombre de sinistres suspect",
                "threshold": 3,
                "weight": 25,
                "is_active": True,
                "rule_type": "behavioral",
                "description": "Détecte les clients ayant plus de 3 sinistres en moins d'un an"
            }
        ]
    
    if not data['alerts']:
        data['alerts'] = [
            {
                "id": 1,
                "alert_id": "FRD-001",
                "claim_id": 1,
                "claim_number": "CLM-001",
                "amount": 15000,
                "risk_score": 85.5,
                "risk_level": "critical",
                "status": "investigating",
                "reason": "Montant inhabituellement élevé",
                "customer_name": "Jean Dupont",
                "customer_email": "jean@example.com",
                "created_at": (datetime.now() - timedelta(hours=2)).isoformat()
            },
            {
                "id": 2,
                "alert_id": "FRD-002",
                "claim_id": 2,
                "claim_number": "CLM-002",
                "amount": 2500,
                "risk_score": 72.3,
                "risk_level": "high",
                "status": "blocked",
                "reason": "Localisation suspecte",
                "customer_name": "Marie Martin",
                "customer_email": "marie@example.com",
                "created_at": (datetime.now() - timedelta(hours=5)).isoformat()
            },
            {
                "id": 3,
                "alert_id": "FRD-003",
                "claim_id": 3,
                "claim_number": "CLM-003",
                "amount": 5000,
                "risk_score": 65.0,
                "risk_level": "medium",
                "status": "detected",
                "reason": "Comportement inhabituel",
                "customer_name": "Pierre Durand",
                "customer_email": "pierre@example.com",
                "created_at": (datetime.now() - timedelta(hours=1)).isoformat()
            }
        ]
    
    save_data(data)
    return data

# Initialiser les données
_data = init_default_data()

# ===== FONCTIONS UTILITAIRES =====
def get_next_id(items):
    """Génère le prochain ID disponible"""
    if not items:
        return 1
    return max(item['id'] for item in items) + 1

def get_claims_data():
    """Récupère les sinistres avec conversion des dates"""
    data = load_data()
    return data.get('claims', [])

def get_clients_data():
    """Récupère les clients"""
    data = load_data()
    return data.get('clients', [])

def update_client_stats(client_id):
    """Met à jour les statistiques d'un client (nombre de sinistres, montant total, risque)"""
    data = load_data()
    client = next((c for c in data['clients'] if c['id'] == client_id), None)
    
    if client:
        client_claims = [c for c in data['claims'] if c.get('client_id') == client_id]
        client['claims_count'] = len(client_claims)
        client['total_amount'] = sum(c['amount'] for c in client_claims)
        
        # Mise à jour du niveau de risque basé sur les sinistres
        if client['claims_count'] >= 3 or client['total_amount'] > 20000:
            client['risk_level'] = 'critical'
        elif client['claims_count'] >= 2 or client['total_amount'] > 10000:
            client['risk_level'] = 'high'
        elif client['claims_count'] >= 1 or client['total_amount'] > 5000:
            client['risk_level'] = 'medium'
        else:
            client['risk_level'] = 'low'
        
        save_data(data)
    
    return client

# ===== ENDPOINTS SINISTRES =====
@router.get("/claims")
async def get_claims(
    risk_level: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    claim_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db = Depends(get_db)
):
    """Récupérer les sinistres suspects"""
    data = load_data()
    claims = data.get('claims', []).copy()
    
    # Filtrer
    if risk_level and risk_level != 'all':
        claims = [c for c in claims if c['risk_level'] == risk_level]
    if status and status != 'all':
        claims = [c for c in claims if c['status'] == status]
    if claim_type and claim_type != 'all':
        claims = [c for c in claims if c['claim_type'] == claim_type]
    if search:
        claims = [c for c in claims if search.lower() in c['client_name'].lower()]
    if date_from:
        claims = [c for c in claims if c['created_at'] >= date_from]
    if date_to:
        claims = [c for c in claims if c['created_at'] <= date_to]
    
    return claims[skip:skip+limit]

@router.get("/claims/{claim_id}")
async def get_claim(
    claim_id: int = Path(..., description="ID du sinistre"),
    db = Depends(get_db)
):
    """Récupérer un sinistre spécifique"""
    data = load_data()
    claim = next((c for c in data['claims'] if c['id'] == claim_id), None)
    
    if not claim:
        raise HTTPException(status_code=404, detail=f"Sinistre {claim_id} non trouvé")
    
    return claim

# ===== ENDPOINTS CLIENTS =====
@router.get("/clients")
async def get_clients(
    search: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db = Depends(get_db)
):
    """Récupérer la liste des clients"""
    data = load_data()
    clients = data.get('clients', []).copy()
    
    if search:
        clients = [c for c in clients if search.lower() in c['client_name'].lower() or 
                   (c.get('client_email') and search.lower() in c['client_email'].lower())]
    
    if risk_level and risk_level != 'all':
        clients = [c for c in clients if c['risk_level'] == risk_level]
    
    if status and status != 'all':
        clients = [c for c in clients if c.get('status') == status]
    
    return clients[skip:skip+limit]

@router.get("/clients/{client_id}")
async def get_client(
    client_id: int = Path(..., description="ID du client"),
    db = Depends(get_db)
):
    """Récupérer les détails d'un client"""
    data = load_data()
    client = next((c for c in data['clients'] if c['id'] == client_id), None)
    
    if not client:
        raise HTTPException(status_code=404, detail=f"Client {client_id} non trouvé")
    
    client_claims = [c for c in data['claims'] if c.get('client_id') == client_id]
    
    return {
        **client,
        "claims": [
            {
                "id": claim['id'],
                "claim_number": claim['claim_number'],
                "amount": claim['amount'],
                "claim_type": claim['claim_type'],
                "status": claim['status'],
                "fraud_score": claim['fraud_score'],
                "created_at": claim['created_at'].isoformat() if hasattr(claim['created_at'], 'isoformat') else claim['created_at']
            }
            for claim in client_claims
        ]
    }

@router.post("/clients", status_code=201)
async def create_client(
    client_data: dict,
    db = Depends(get_db)
):
    """Créer un nouveau client"""
    data = load_data()
    
    new_id = get_next_id(data['clients'])
    
    new_client = {
        "id": new_id,
        "client_name": client_data.get('client_name'),
        "client_email": client_data.get('client_email'),
        "client_phone": client_data.get('client_phone'),
        "client_address": client_data.get('client_address'),
        "claims_count": 0,
        "total_amount": 0,
        "risk_level": "low",
        "status": "active",
        "created_at": datetime.now().isoformat()
    }
    
    data['clients'].append(new_client)
    save_data(data)
    
    return {
        "success": True,
        "client": new_client,
        "message": f"Client {new_client['client_name']} créé avec succès",
        "id": new_id
    }

@router.put("/clients/{client_id}")
async def update_client(
    client_id: int = Path(..., description="ID du client"),
    client_data: dict = None,
    db = Depends(get_db)
):
    """Mettre à jour un client"""
    data = load_data()
    client_index = next((i for i, c in enumerate(data['clients']) if c['id'] == client_id), None)
    
    if client_index is None:
        raise HTTPException(status_code=404, detail=f"Client {client_id} non trouvé")
    
    updated_client = {**data['clients'][client_index], **client_data}
    data['clients'][client_index] = updated_client
    save_data(data)
    
    return {
        "success": True,
        "client": updated_client,
        "message": f"Client {updated_client['client_name']} mis à jour avec succès"
    }

@router.delete("/clients/{client_id}")
async def delete_client(
    client_id: int = Path(..., description="ID du client"),
    db = Depends(get_db)
):
    """Supprimer un client"""
    data = load_data()
    client = next((c for c in data['clients'] if c['id'] == client_id), None)
    
    if not client:
        raise HTTPException(status_code=404, detail=f"Client {client_id} non trouvé")
    
    data['clients'] = [c for c in data['clients'] if c['id'] != client_id]
    
    # Optionnel: supprimer aussi les sinistres associés
    data['claims'] = [c for c in data['claims'] if c.get('client_id') != client_id]
    
    save_data(data)
    
    return {
        "success": True,
        "message": f"Client {client['client_name']} supprimé avec succès"
    }

# ===== ENDPOINTS DASHBOARD =====
@router.get("/dashboard")
async def get_fraud_insurance_dashboard(db = Depends(get_db)):
    """Dashboard de détection de fraude"""
    data = load_data()
    claims = data.get('claims', [])
    
    total_detected = len(claims)
    blocked = len([c for c in claims if c['status'] == 'blocked'])
    investigating = len([c for c in claims if c['status'] == 'investigating'])
    approved = len([c for c in claims if c['status'] == 'approved'])
    rejected = len([c for c in claims if c['status'] == 'rejected'])
    
    total_amount = sum([c['amount'] for c in claims])
    saved_amount = sum([c['amount'] for c in claims if c['status'] == 'blocked'])
    
    return {
        "total_claims": len(claims),
        "fraud_detected": total_detected,
        "under_investigation": investigating,
        "saved_amount": saved_amount,
        "total_detected": total_detected,
        "blocked": blocked,
        "investigating": investigating,
        "approved": approved,
        "rejected": rejected,
        "false_positive": 0,
        "amount_saved": saved_amount,
        "suspicious_rate": (total_detected / len(claims) * 100) if claims else 0,
        "detection_accuracy": 96,
        "by_claim_type": {
            "auto": len([c for c in claims if c['claim_type'] == 'auto']),
            "habitation": len([c for c in claims if c['claim_type'] == 'habitation']),
            "sante": len([c for c in claims if c['claim_type'] == 'sante'])
        },
        "monthly_trend": [
            {"month": "Jan", "count": 23},
            {"month": "Fév", "count": 28},
            {"month": "Mar", "count": 32},
            {"month": "Avr", "count": 25},
            {"month": "Mai", "count": 35},
            {"month": "Juin", "count": 42}
        ],
        "anomaly_clusters": [
            {"id": 1, "size": 12, "avg_risk_score": 78.5},
            {"id": 2, "size": 8, "avg_risk_score": 65.2}
        ],
        "total_clients": len(data.get('clients', []))
    }

# ===== ENDPOINTS RÈGLES =====
@router.get("/rules")
async def get_fraud_rules(active_only: bool = True, db = Depends(get_db)):
    """Récupérer les règles de détection"""
    data = load_data()
    rules = data.get('rules', [])
    
    if active_only:
        rules = [r for r in rules if r['is_active']]
    
    return rules

# ===== ENDPOINTS ALERTES =====
@router.get("/fraud-alerts")
async def get_fraud_alerts(
    resolved: Optional[bool] = Query(None),
    severity: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db = Depends(get_db)
):
    """Récupérer les alertes de fraude"""
    data = load_data()
    alerts = data.get('alerts', []).copy()
    
    if resolved is not None:
        alerts = [a for a in alerts if a.get("resolved", False) == resolved]
    
    if severity and severity != 'all':
        alerts = [a for a in alerts if a['risk_level'] == severity]
    
    return alerts[skip:skip+limit]

logger.info("✅ MODULE FRAUD INSURANCE CHARGÉ AVEC SUCCÈS - Données persistantes")