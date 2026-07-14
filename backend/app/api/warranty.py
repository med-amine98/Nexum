# app/api/warranty.py
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models.warranty import (
    Warranty, WarrantySubscription, WarrantyClaim, ClientProfile,
    WarrantyType, WarrantyStatus
)
from app.models.banking import Client
from app.core.dependencies import get_optional_user
from app.models.auth import User
import logging
import json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/insurance", tags=["warranty"])


# ===== RECOMMANDATIONS BASÉES SUR LE PROFIL SAISI =====

def calculate_risk_score(age, annual_income, has_family, previous_claims=0, credit_score=700, location="medium_risk", health_status="good"):
    """Calculer le score de risque (0-100) basé sur les données saisies"""
    score = 50
    
    # Âge
    if age < 25:
        score += 15
    elif age < 35:
        score += 5
    elif age > 60:
        score += 10
    else:
        score -= 5
    
    # Revenu
    if annual_income < 30000:
        score += 20
    elif annual_income < 50000:
        score += 10
    elif annual_income > 100000:
        score -= 15
    
    # Score de crédit
    if credit_score < 600:
        score += 25
    elif credit_score < 700:
        score += 10
    elif credit_score > 750:
        score -= 15
    
    # Famille
    if has_family:
        score -= 10
    
    # Sinistres antérieurs
    score += previous_claims * 10
    
    # Localisation
    if location == "high_risk":
        score += 20
    elif location == "medium_risk":
        score += 10
    
    # Santé
    if health_status == "poor":
        score += 20
    elif health_status == "fair":
        score += 10
    
    return max(0, min(100, score))


def calculate_premium(risk_score, case_value, case_type, coverage_level="standard", payment_method="monthly"):
    """Calculer la prime mensuelle estimée"""
    base_premium = 40
    
    # Multiplicateur par type de garantie
    type_multipliers = {
        "home": 1.0,
        "car": 1.2,
        "health": 1.5,
        "life": 0.8,
        "travel": 0.6,
        "electronics": 0.4
    }
    
    # Multiplicateur par niveau de couverture
    level_multipliers = {
        "basic": 0.7,
        "standard": 1.0,
        "premium": 1.5,
        "ultimate": 2.0
    }
    
    premium = base_premium
    premium *= type_multipliers.get(case_type, 1.0)
    premium *= (case_value / 50000)
    premium *= (1 + (risk_score - 50) / 100)
    premium *= level_multipliers.get(coverage_level, 1.0)
    
    # Réduction pour paiement annuel
    if payment_method == "yearly":
        premium *= 0.92
    
    return max(30, min(300, round(premium, 2)))


def calculate_coverage(case_value, case_type, has_family, annual_income):
    """Calculer la couverture recommandée"""
    if case_type == "home":
        return int(case_value * 1.5)
    elif case_type == "car":
        return int(case_value * 1.3)
    elif case_type == "health":
        return 200000 + (100000 if has_family else 0)
    elif case_type == "life":
        return int(annual_income * 8)
    else:
        return int(case_value * 1.2)


def get_recommendation_score(warranty, case_type, case_value, risk_score, annual_income):
    """Calculer le score de pertinence d'une garantie"""
    score = 50
    
    warranty_type = warranty.type.value if hasattr(warranty.type, 'value') else str(warranty.type)
    
    # Match par type
    if case_type == "home" and warranty_type == "HOME":
        score += 30
    elif case_type == "car" and warranty_type == "CAR":
        score += 30
    elif case_type == "health" and warranty_type == "HEALTH":
        score += 35
    elif case_type == "life" and warranty_type == "LIFE":
        score += 40
    elif case_type == "travel" and warranty_type == "TRAVEL":
        score += 30
    elif case_type == "electronics" and warranty_type == "ELECTRONICS":
        score += 25
    else:
        score -= 10
    
    # Budget (prime mensuelle < 5% du revenu mensuel)
    monthly_budget = annual_income * 0.05 / 12
    if warranty.monthly_price <= monthly_budget:
        score += 15
    
    # Risque élevé -> besoin de protection
    if risk_score > 70 and warranty_type in ["HEALTH", "LIFE"]:
        score += 15
    
    return min(100, max(0, score))


# ===== ENDPOINTS =====

@router.get("/warranty-recommendations")
async def get_warranty_recommendations(
    db: Session = Depends(get_db)
):
    """Récupérer toutes les garanties disponibles"""
    
    warranties = db.query(Warranty).filter(Warranty.is_active == True).all()
    
    if not warranties:
        raise HTTPException(status_code=404, detail="Aucune garantie disponible")
    
    recommendations = []
    for warranty in warranties:
        recommendations.append({
            "id": warranty.id,
            "name": warranty.name,
            "description": warranty.description,
            "coverage": warranty.coverage_amount,
            "price": warranty.monthly_price,
            "icon": get_icon_for_type(warranty.type),
            "color": get_color_for_type(warranty.type),
            "features": warranty.features[:3] if warranty.features else [],
            "recommended": False,
            "score": 50
        })
    
    return {
        "profile": {
            "score": 50,
            "risk_level": "medium",
            "premium": 500,
            "rating": 4.0,
            "confidence": 85
        },
        "recommendations": recommendations[:6]
    }


@router.post("/subscribe-warranty")
async def subscribe_warranty(
    subscription_data: dict,
    db: Session = Depends(get_db)
):
    """Souscrire à une garantie"""
    
    warranty_id = subscription_data.get("warranty_id")
    
    warranty = db.query(Warranty).filter(Warranty.id == warranty_id).first()
    if not warranty:
        raise HTTPException(status_code=404, detail="Garantie non trouvée")
    
    # Créer une souscription (simulée)
    return {
        "success": True,
        "subscription_id": 1,
        "message": f"Souscription à {warranty.name} effectuée avec succès"
    }


@router.get("/my-warranties")
async def get_my_warranties(
    db: Session = Depends(get_db)
):
    """Récupérer les garanties souscrites"""
    return []


@router.get("/warranties")
async def get_all_warranties(
    warranty_type: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """Récupérer toutes les garanties disponibles"""
    
    query = db.query(Warranty).filter(Warranty.is_active == True)
    
    if warranty_type:
        query = query.filter(Warranty.type == warranty_type)
    
    warranties = query.limit(limit).all()
    
    return [
        {
            "id": w.id,
            "name": w.name,
            "type": w.type.value,
            "description": w.description,
            "coverage_amount": w.coverage_amount,
            "monthly_price": w.monthly_price,
            "yearly_price": w.yearly_price,
            "deductible": w.deductible,
            "features": w.features,
            "color": get_color_for_type(w.type)
        }
        for w in warranties
    ]


@router.post("/warranties")
async def create_warranty(
    warranty_data: dict,
    db: Session = Depends(get_db)
):
    """Créer une nouvelle garantie"""
    
    # Traiter les features (séparées par des virgules)
    features_str = warranty_data.get("features", "")
    features = [f.strip() for f in features_str.split(",")] if features_str else []
    
    # Générer un code unique
    last_warranty = db.query(Warranty).order_by(desc(Warranty.id)).first()
    new_code = f"WAR-{str((last_warranty.id + 1) if last_warranty else 1).zfill(4)}"
    
    new_warranty = Warranty(
        name=warranty_data.get("name"),
        code=new_code,
        type=warranty_data.get("type"),
        description=warranty_data.get("description"),
        coverage_amount=warranty_data.get("coverage_amount", 0),
        monthly_price=warranty_data.get("monthly_price", 0),
        yearly_price=warranty_data.get("yearly_price", 0),
        deductible=warranty_data.get("deductible", 0),
        features=features,
        min_age=18,
        max_age=99,
        min_credit_score=300,
        required_documents=[],
        is_active=warranty_data.get("is_active", True),
        created_at=datetime.now()
    )
    
    db.add(new_warranty)
    db.commit()
    db.refresh(new_warranty)
    
    return {
        "success": True,
        "id": new_warranty.id,
        "code": new_warranty.code,
        "message": f"Garantie {new_warranty.name} créée avec succès"
    }


@router.post("/analyze-case")
async def analyze_case(
    case_data: dict,
    db: Session = Depends(get_db)
):
    """
    Analyser un cas et retourner des recommandations personnalisées
    Basé sur les données saisies par l'utilisateur
    """
    
    # Extraire les données du cas
    case_type = case_data.get("type", "home")
    case_value = case_data.get("value", 100000)
    has_family = case_data.get("hasFamily", False)
    existing_insurance = case_data.get("existingInsurance", False)
    age = case_data.get("age", 35)
    annual_income = case_data.get("annual_income", 50000)
    previous_claims = case_data.get("previous_claims", 0)
    coverage_level = case_data.get("coverage_level", "standard")
    credit_score = case_data.get("credit_score", 700)
    location = case_data.get("location", "medium_risk")
    health_status = case_data.get("health_status", "good")
    payment_method = case_data.get("payment_method", "monthly")
    
    # Calculs basés sur les données saisies
    risk_score = calculate_risk_score(age, annual_income, has_family, previous_claims, credit_score, location, health_status)
    estimated_premium = calculate_premium(risk_score, case_value, case_type, coverage_level, payment_method)
    coverage_total = calculate_coverage(case_value, case_type, has_family, annual_income)
    
    # Récupérer les garanties depuis la base
    warranties = db.query(Warranty).filter(Warranty.is_active == True).all()
    
    if not warranties:
        raise HTTPException(status_code=404, detail="Aucune garantie disponible")
    
    # Calculer le score pour chaque garantie
    recommendations = []
    for warranty in warranties:
        score = get_recommendation_score(warranty, case_type, case_value, risk_score, annual_income)
        
        if score > 40:
            # Ajuster le prix selon le risque
            adjusted_price = round(warranty.monthly_price * (1 + (risk_score - 50) / 100), 2)
            adjusted_price = max(20, min(300, adjusted_price))
            
            recommendations.append({
                "id": warranty.id,
                "name": warranty.name,
                "description": warranty.description,
                "coverage": warranty.coverage_amount,
                "price": adjusted_price,
                "icon": get_icon_for_type(warranty.type),
                "color": get_color_for_type(warranty.type),
                "features": warranty.features[:4] if warranty.features else [],
                "recommended": score > 75,
                "score": score,
                "reasons": get_recommendation_reasons(warranty, case_type, risk_score)
            })
    
    # Trier par score
    recommendations.sort(key=lambda x: x["score"], reverse=True)
    
    return {
        "analysis": {
            "risk_level": "low" if risk_score < 35 else "medium" if risk_score < 65 else "high",
            "estimated_premium": estimated_premium,
            "coverage_total": coverage_total,
            "risk_score": risk_score,
            "confidence": 85
        },
        "recommendations": recommendations[:4]
    }


# ===== FONCTIONS UTILITAIRES =====

def get_recommendation_reasons(warranty, case_type, risk_score):
    """Générer des explications pour la recommandation"""
    reasons = []
    warranty_type = warranty.type.value if hasattr(warranty.type, 'value') else str(warranty.type)
    
    if case_type == "home" and warranty_type == "HOME":
        reasons.append("🏠 Protection adaptée à votre logement")
    elif case_type == "car" and warranty_type == "CAR":
        reasons.append("🚗 Couverture pour votre véhicule")
    elif case_type == "health" and warranty_type == "HEALTH":
        reasons.append("❤️ Protection santé essentielle")
    elif case_type == "life" and warranty_type == "LIFE":
        reasons.append("👨‍👩‍👧‍👦 Protection pour vos proches")
    elif case_type == "travel" and warranty_type == "TRAVEL":
        reasons.append("✈️ Protection pour vos voyages")
    elif case_type == "electronics" and warranty_type == "ELECTRONICS":
        reasons.append("💻 Protection pour vos appareils")
    
    if risk_score > 70:
        reasons.append("⚠️ Protection renforcée recommandée")
    elif risk_score < 30:
        reasons.append("💰 Tarif préférentiel")
    
    return reasons[:2]


def get_icon_for_type(warranty_type: WarrantyType) -> str:
    icons = {
        WarrantyType.HOME: "home",
        WarrantyType.CAR: "car",
        WarrantyType.HEALTH: "heart",
        WarrantyType.LIFE: "heart",
        WarrantyType.TRAVEL: "global",
        WarrantyType.ELECTRONICS: "thunderbolt"
    }
    return icons.get(warranty_type, "safety")


def get_color_for_type(warranty_type: WarrantyType) -> str:
    colors = {
        WarrantyType.HOME: "#1890ff",
        WarrantyType.CAR: "#52c41a",
        WarrantyType.HEALTH: "#eb2f96",
        WarrantyType.LIFE: "#722ed1",
        WarrantyType.TRAVEL: "#fa8c16",
        WarrantyType.ELECTRONICS: "#13c2c2"
    }
    return colors.get(warranty_type, "#8c8c8c")