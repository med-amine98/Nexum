from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from app.services.advanced_digital_twins_service import advanced_digital_twins_service

router = APIRouter(
    prefix="/advanced-twins",
    tags=["advanced_digital_twins"]
)

@router.get("/health")
def health_check():
    """Vérifier si les modèles ML avancés sont bien chargés."""
    return {
        "models_loaded": advanced_digital_twins_service.models_loaded,
        "fallback_enabled": advanced_digital_twins_service.fallback_enabled
    }

@router.post("/predict/aml")
def predict_aml(data: Dict[str, float]):
    """
    Prédiction pour la Lutte Fraude 3D (AML).
    Champs attendus: transaction_volume, transaction_frequency, foreign_trans_ratio (0 à 1)
    """
    try:
        suspicion, aml_prob = advanced_digital_twins_service.predict_aml(data)
        return {"suspicion_score": suspicion, "aml_probability": aml_prob}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/predict/damage")
def predict_damage(data: Dict[str, float]):
    """
    Prédiction pour Sinistres 3D.
    Champs attendus: impact_velocity, material_density, part_vulnerability (0 à 1)
    """
    try:
        dmg = advanced_digital_twins_service.predict_damage(data)
        return {"estimated_damage_percentage": dmg}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/predict/climate")
def predict_climate(data: Dict[str, float]):
    """
    Prédiction pour Climat 3D.
    Champs attendus: rainfall_intensity, wind_speed, elevation (0 à 1)
    """
    try:
        risk = advanced_digital_twins_service.predict_climate(data)
        return {"climate_risk_probability": risk}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/predict/fraud-ring")
def predict_fraud_ring(data: Dict[str, float]):
    """
    Prédiction pour Réseaux Fraude 3D.
    Champs attendus: shared_addresses, linked_phones, claims_frequency (0 à 1)
    """
    try:
        centrality, ring_prob = advanced_digital_twins_service.predict_fraud_ring(data)
        return {"centrality_score": centrality, "fraud_ring_probability": ring_prob}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/predict/talent")
def predict_talent(data: Dict[str, float]):
    """
    Prédiction pour Talents 3D.
    Champs attendus: skills_match, tenure_years_norm, collaboration_score (0 à 1)
    """
    try:
        perf = advanced_digital_twins_service.predict_talent(data)
        return {"performance_potential": perf}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
