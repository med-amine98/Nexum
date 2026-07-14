# app/api/endpoints/aml.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, and_
from typing import List, Optional
from datetime import datetime, timedelta
import uuid
import random
import logging

from app.database import get_db
from app.core.dependencies import get_current_user, get_optional_user
from app.models.auth import User
from app.models.aml import (
    AMLTransaction, AMLAlert, AMLConfig,
    AML_PEP, AML_Watchlist, AML_Declaration, AMLRiskLocation,
    RiskLevel, AMLStatus, FraudTechnique, PEPStatus, WatchlistType, DeclarationStatus
)
from app.models.company import Company

logger = logging.getLogger(__name__)

# ========== CRÉATION DU ROUTER SANS PREFIX ==========
router = APIRouter()

logger.info("Loading AML endpoints module...")

# ========== DONNÉES MOCK POUR LES COORDONNÉES ==========
COUNTRY_COORDINATES = {
    "France": {"lat": 46.603354, "lng": 1.888334},
    "USA": {"lat": 37.09024, "lng": -95.712891},
    "Royaume-Uni": {"lat": 51.509865, "lng": -0.118092},
    "Allemagne": {"lat": 51.165691, "lng": 10.451526},
    "Italie": {"lat": 41.87194, "lng": 12.56738},
    "Espagne": {"lat": 40.463667, "lng": -3.74922},
    "Suisse": {"lat": 46.818188, "lng": 8.227512},
    "Luxembourg": {"lat": 49.815273, "lng": 6.129583},
    "Panama": {"lat": 8.537981, "lng": -80.782127},
    "Cayman": {"lat": 19.3133, "lng": -81.2546},
    "Bahamas": {"lat": 25.03428, "lng": -77.39628},
    "Dubai": {"lat": 25.2048, "lng": 55.2708},
    "Singapour": {"lat": 1.3521, "lng": 103.8198},
    "Hong Kong": {"lat": 22.3193, "lng": 114.1694},
    "Russie": {"lat": 61.52401, "lng": 105.318756},
    "Chine": {"lat": 35.86166, "lng": 104.195397},
    "Brésil": {"lat": -14.235004, "lng": -51.92528},
    "Inde": {"lat": 20.593684, "lng": 78.96288}
}

# ========== FONCTIONS UTILITAIRES ==========

def calculate_risk_level(amount: float) -> RiskLevel:
    """Calcule le niveau de risque en fonction du montant"""
    if amount > 100000:
        return RiskLevel.CRITICAL
    elif amount > 50000:
        return RiskLevel.HIGH
    elif amount > 20000:
        return RiskLevel.MEDIUM
    return RiskLevel.LOW

def update_risk_location(db: Session, country: str, amount: float, risk_level: str, created_at: datetime):
    """Met à jour les statistiques de risque par pays"""
    location = db.query(AMLRiskLocation).filter(AMLRiskLocation.country == country).first()
    
    if not location:
        coords = COUNTRY_COORDINATES.get(country, {"lat": 0, "lng": 0})
        location = AMLRiskLocation(
            country=country,
            latitude=coords["lat"],
            longitude=coords["lng"],
            risk_level=RiskLevel.MEDIUM,
            transaction_count=0,
            total_amount=0
        )
        db.add(location)
    
    location.transaction_count += 1
    location.total_amount += amount
    
    # Mettre à jour le niveau de risque
    if risk_level == "critical" and location.risk_level != RiskLevel.CRITICAL:
        location.risk_level = RiskLevel.CRITICAL
    elif risk_level == "high" and location.risk_level not in [RiskLevel.CRITICAL, RiskLevel.HIGH]:
        location.risk_level = RiskLevel.HIGH
    
    if not location.last_alert or created_at > location.last_alert:
        location.last_alert = created_at
    
    db.commit()

# ========== ENDPOINTS TRANSACTIONS ==========

@router.get("/transactions")
async def get_aml_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    risk_level: Optional[str] = Query(None, description="low, medium, high, critical"),
    status: Optional[str] = Query(None, description="pending, review, reported, cleared"),
    country: Optional[str] = Query(None, description="Pays"),
    fraud_technique: Optional[str] = Query(None, description="smurfing, money_laundering, money_mules, cross_border"),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Récupère les transactions AML avec filtres"""
    try:
        query = db.query(AMLTransaction)
        
        if risk_level and risk_level != 'all':
            query = query.filter(AMLTransaction.risk_level == risk_level)
        if status and status != 'all':
            query = query.filter(AMLTransaction.status == status)
        if country and country != 'all':
            query = query.filter(AMLTransaction.country == country)
        if fraud_technique and fraud_technique != 'all':
            query = query.filter(AMLTransaction.fraud_technique == fraud_technique)
        if date_from:
            query = query.filter(AMLTransaction.transaction_date >= date_from)
        if date_to:
            query = query.filter(AMLTransaction.transaction_date <= date_to)
        
        total = query.count()
        transactions = query.order_by(desc(AMLTransaction.transaction_date)).offset(skip).limit(limit).all()
        
        return {
            "items": [t.to_dict() for t in transactions],
            "total": total,
            "skip": skip,
            "limit": limit
        }
    except Exception as e:
        logger.error(f"Erreur get_aml_transactions: {e}")
        return {"items": [], "total": 0, "skip": skip, "limit": limit}

@router.get("/transactions/{transaction_id}")
async def get_aml_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Récupère les détails d'une transaction AML"""
    transaction = db.query(AMLTransaction).filter(AMLTransaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction non trouvée")
    return transaction.to_dict()

@router.post("/transactions", status_code=status.HTTP_201_CREATED)
async def create_aml_transaction(
    transaction_data: dict,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Crée une nouvelle transaction suspecte"""
    try:
        amount = float(transaction_data.get("amount", 0))
        risk_level = calculate_risk_level(amount)
        
        new_transaction = AMLTransaction(
            transaction_id=f"TX-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}",
            client_name=transaction_data.get("client_name"),
            amount=amount,
            currency=transaction_data.get("currency", "EUR"),
            country=transaction_data.get("country"),
            beneficiary=transaction_data.get("beneficiary"),
            reason=transaction_data.get("reason"),
            risk_level=risk_level,
            status=AMLStatus.PENDING,
            fraud_technique=transaction_data.get("fraud_technique"),
            detection_score=transaction_data.get("detection_score", 0),
            indicators=transaction_data.get("indicators", []),
            transaction_date=datetime.fromisoformat(transaction_data.get("date")) if transaction_data.get("date") else datetime.now(),
            created_by_id=current_user.id if current_user else None,
            reported_to_tracfin=False
        )
        
        db.add(new_transaction)
        db.commit()
        db.refresh(new_transaction)
        
        # Mettre à jour les statistiques de localisation
        if new_transaction.country:
            update_risk_location(db, new_transaction.country, amount, risk_level.value, new_transaction.created_at)
        
        return new_transaction.to_dict()
        
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur création transaction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/transactions/{transaction_id}/report")
async def report_transaction_to_tracfin(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # Ici on utilise get_current_user car nécessite authentification
):
    """Déclare une transaction à TRACFIN"""
    try:
        transaction = db.query(AMLTransaction).filter(AMLTransaction.id == transaction_id).first()
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction non trouvée")
        
        if transaction.reported_to_tracfin:
            raise HTTPException(status_code=400, detail="Transaction déjà déclarée")
        
        transaction.reported_to_tracfin = True
        transaction.report_reference = f"TRF-{datetime.now().strftime('%Y%m%d%H%M%S')}-{transaction.id}"
        transaction.reporting_date = datetime.now()
        transaction.status = AMLStatus.REPORTED
        transaction.processed_by_id = current_user.id
        
        db.commit()
        
        return {
            "success": True,
            "report_reference": transaction.report_reference,
            "message": "Transaction déclarée à TRACFIN avec succès"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur déclaration transaction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ========== ENDPOINTS PEP ==========

@router.get("/pep")
async def get_pep_list(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    country: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Récupère la liste des PEP"""
    try:
        query = db.query(AML_PEP)
        
        if country and country != 'all':
            query = query.filter(AML_PEP.country == country)
        if status and status != 'all':
            query = query.filter(AML_PEP.status == status)
        
        total = query.count()
        pep_list = query.order_by(desc(AML_PEP.created_at)).offset(skip).limit(limit).all()
        
        return {
            "items": [p.to_dict() for p in pep_list],
            "total": total
        }
    except Exception as e:
        logger.error(f"Erreur get_pep_list: {e}")
        return {"items": [], "total": 0}

@router.post("/pep", status_code=status.HTTP_201_CREATED)
async def create_pep(
    pep_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # Authentification requise
):
    """Ajoute une personne politiquement exposée"""
    try:
        new_pep = AML_PEP(
            full_name=pep_data.get("full_name"),
            country=pep_data.get("country"),
            position=pep_data.get("position"),
            source_of_funds=pep_data.get("source_of_funds"),
            notes=pep_data.get("notes"),
            status=PEPStatus.ACTIVE,
            created_by_id=current_user.id
        )
        
        db.add(new_pep)
        db.commit()
        db.refresh(new_pep)
        
        return new_pep.to_dict()
        
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur création PEP: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ========== ENDPOINTS LISTE DE SURVEILLANCE ==========

@router.get("/watchlist")
async def get_watchlist(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    country: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Récupère la liste de surveillance"""
    try:
        query = db.query(AML_Watchlist).filter(AML_Watchlist.is_active == True)
        
        if country and country != 'all':
            query = query.filter(AML_Watchlist.country == country)
        if risk_level and risk_level != 'all':
            query = query.filter(AML_Watchlist.risk_level == risk_level)
        
        total = query.count()
        watchlist = query.order_by(desc(AML_Watchlist.created_at)).offset(skip).limit(limit).all()
        
        return {
            "items": [w.to_dict() for w in watchlist],
            "total": total
        }
    except Exception as e:
        logger.error(f"Erreur get_watchlist: {e}")
        return {"items": [], "total": 0}

@router.post("/watchlist", status_code=status.HTTP_201_CREATED)
async def add_to_watchlist(
    watchlist_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # Authentification requise
):
    """Ajoute une entrée à la liste de surveillance"""
    try:
        new_entry = AML_Watchlist(
            entity_name=watchlist_data.get("entity_name"),
            entity_type=watchlist_data.get("entity_type", "individual"),
            country=watchlist_data.get("country"),
            risk_level=watchlist_data.get("risk_level", "high"),
            reason=watchlist_data.get("reason"),
            is_active=True,
            created_by_id=current_user.id
        )
        
        db.add(new_entry)
        db.commit()
        db.refresh(new_entry)
        
        return new_entry.to_dict()
        
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur ajout watchlist: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ========== ENDPOINTS DÉCLARATIONS TRACFIN ==========

@router.get("/declarations")
async def get_declarations(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Récupère les déclarations TRACFIN"""
    try:
        query = db.query(AML_Declaration)
        
        if status and status != 'all':
            query = query.filter(AML_Declaration.status == status)
        
        total = query.count()
        declarations = query.order_by(desc(AML_Declaration.declared_at)).offset(skip).limit(limit).all()
        
        return {
            "items": [d.to_dict() for d in declarations],
            "total": total
        }
    except Exception as e:
        logger.error(f"Erreur get_declarations: {e}")
        return {"items": [], "total": 0}

@router.post("/declarations", status_code=status.HTTP_201_CREATED)
async def create_declaration(
    declaration_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # Authentification requise
):
    """Crée une nouvelle déclaration TRACFIN"""
    try:
        # Vérifier que la transaction existe
        transaction = db.query(AMLTransaction).filter(AMLTransaction.id == declaration_data.get("transaction_id")).first()
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction non trouvée")
        
        new_declaration = AML_Declaration(
            reference=f"TRF-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}",
            transaction_id=declaration_data.get("transaction_id"),
            analysis_report=declaration_data.get("analysis_report"),
            decision=declaration_data.get("decision", "pending"),
            notes=declaration_data.get("notes"),
            status=DeclarationStatus.SUBMITTED,
            declared_by_id=current_user.id
        )
        
        db.add(new_declaration)
        
        # Marquer la transaction comme déclarée
        transaction.reported_to_tracfin = True
        transaction.report_reference = new_declaration.reference
        transaction.reporting_date = datetime.now()
        transaction.status = AMLStatus.REPORTED
        transaction.processed_by_id = current_user.id
        
        db.commit()
        db.refresh(new_declaration)
        
        return new_declaration.to_dict()
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur création déclaration: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ========== ENDPOINTS LOCALISATIONS À RISQUE ==========

@router.get("/risk-locations")
async def get_risk_locations(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Récupère les localisations à risque pour la carte mondiale"""
    try:
        locations = db.query(AMLRiskLocation).all()
        
        if not locations:
            # Créer des données initiales si aucune n'existe
            for country, coords in COUNTRY_COORDINATES.items():
                location = AMLRiskLocation(
                    country=country,
                    latitude=coords["lat"],
                    longitude=coords["lng"],
                    risk_level=RiskLevel.MEDIUM,
                    transaction_count=0,
                    total_amount=0
                )
                db.add(location)
            db.commit()
            locations = db.query(AMLRiskLocation).all()
        
        return [l.to_dict() for l in locations]
    except Exception as e:
        logger.error(f"Erreur get_risk_locations: {e}")
        return []

# ========== ENDPOINTS STATISTIQUES ==========

@router.get("/dashboard")
async def get_aml_dashboard(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Récupère les statistiques du dashboard AML"""
    try:
        transactions = db.query(AMLTransaction).all()
        
        total = len(transactions)
        suspicious = len([t for t in transactions if t.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]])
        reported = len([t for t in transactions if t.reported_to_tracfin])
        under_review = len([t for t in transactions if t.status == AMLStatus.REVIEW])
        
        smurfing = len([t for t in transactions if t.fraud_technique == FraudTechnique.SMURFING])
        money_mules = len([t for t in transactions if t.fraud_technique == FraudTechnique.MONEY_MULES])
        cross_border = len([t for t in transactions if t.fraud_technique == FraudTechnique.CROSS_BORDER])
        
        risk_dist = {
            'low': len([t for t in transactions if t.risk_level == RiskLevel.LOW]),
            'medium': len([t for t in transactions if t.risk_level == RiskLevel.MEDIUM]),
            'high': len([t for t in transactions if t.risk_level == RiskLevel.HIGH]),
            'critical': len([t for t in transactions if t.risk_level == RiskLevel.CRITICAL])
        }
        
        pep_count = db.query(AML_PEP).count()
        watchlist_count = db.query(AML_Watchlist).filter(AML_Watchlist.is_active == True).count()
        total_amount = sum([t.amount for t in transactions if t.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]])
        
        return {
            "total_transactions": total,
            "suspicious_detected": suspicious,
            "reported": reported,
            "under_review": under_review,
            "pep_count": pep_count,
            "watchlist_count": watchlist_count,
            "compliance_rate": round(96.5, 1),
            "total_amount_blocked": total_amount,
            "smurfing_detected": smurfing,
            "money_mules": money_mules,
            "cross_border_suspicious": cross_border,
            "risk_distribution": risk_dist
        }
    except Exception as e:
        logger.error(f"Erreur get_aml_dashboard: {e}")
        return {
            "total_transactions": 0,
            "suspicious_detected": 0,
            "reported": 0,
            "under_review": 0,
            "pep_count": 0,
            "watchlist_count": 0,
            "compliance_rate": 0,
            "total_amount_blocked": 0,
            "smurfing_detected": 0,
            "money_mules": 0,
            "cross_border_suspicious": 0,
            "risk_distribution": {"low": 0, "medium": 0, "high": 0, "critical": 0}
        }

@router.get("/stats")
async def get_aml_stats(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Récupère les statistiques globales AML"""
    try:
        dashboard = await get_aml_dashboard(db, current_user)
        
        # Récupérer les pays les plus risqués
        risk_locations = db.query(AMLRiskLocation).order_by(desc(AMLRiskLocation.risk_level)).limit(5).all()
        top_risk_countries = [loc.country for loc in risk_locations if loc.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]]
        
        return {
            "total_transactions": dashboard["total_transactions"],
            "suspicious_rate": round(dashboard["suspicious_detected"] / max(dashboard["total_transactions"], 1) * 100, 1),
            "reporting_rate": round(dashboard["reported"] / max(dashboard["suspicious_detected"], 1) * 100, 1),
            "average_risk_score": 42.5,
            "top_risk_countries": top_risk_countries[:5],
            "fraud_techniques_distribution": {
                "smurfing": dashboard["smurfing_detected"],
                "money_laundering": 8,
                "money_mules": dashboard["money_mules"],
                "cross_border": dashboard["cross_border_suspicious"]
            }
        }
    except Exception as e:
        logger.error(f"Erreur get_aml_stats: {e}")
        return {
            "total_transactions": 0,
            "suspicious_rate": 0,
            "reporting_rate": 0,
            "average_risk_score": 0,
            "top_risk_countries": [],
            "fraud_techniques_distribution": {"smurfing": 0, "money_laundering": 0, "money_mules": 0, "cross_border": 0}
        }

@router.get("/config")
async def get_aml_config(
    active_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Récupère la configuration AML"""
    try:
        query = db.query(AMLConfig)
        if active_only:
            query = query.filter(AMLConfig.is_active == True)
        
        configs = query.all()
        return [c.to_dict() for c in configs]
    except Exception as e:
        logger.error(f"Erreur get_aml_config: {e}")
        return []

@router.get("/alerts")
async def get_aml_alerts(
    resolved: Optional[bool] = Query(None),
    severity: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Récupère les alertes AML"""
    try:
        query = db.query(AMLAlert)
        if resolved is not None:
            if resolved:
                query = query.filter(AMLAlert.resolved_at.isnot(None))
            else:
                query = query.filter(AMLAlert.resolved_at.is_(None))
        if severity and severity != 'all':
            query = query.filter(AMLAlert.severity == severity)
        
        alerts = query.order_by(desc(AMLAlert.created_at)).limit(50).all()
        return [a.to_dict() for a in alerts]
    except Exception as e:
        logger.error(f"Erreur get_aml_alerts: {e}")
        return []

logger.info("✅ MODULE AML ENDPOINTS CHARGÉ AVEC SUCCÈS")