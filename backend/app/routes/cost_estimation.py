# app/routes/cost_estimation.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.unified_cost_estimation import estimation_service

router = APIRouter(prefix="/estimate", tags=["cost-estimation"])


class AccidentEstimateRequest(BaseModel):
    parts: list[str]
    region: str = "paris"


class HabitationEstimateRequest(BaseModel):
    damage_type: str
    surface_m2: float = 10


class AgricoleEstimateRequest(BaseModel):
    disease_name: str


class SanteEstimateRequest(BaseModel):
    care_type: str


@router.post("/accident")
async def estimate_accident(request: AccidentEstimateRequest):
    """Estimation pour accident automobile"""
    detections = [{"part": part} for part in request.parts]
    result = await estimation_service.estimate_accident_cost(detections)
    return result


@router.post("/habitation")
async def estimate_habitation(request: HabitationEstimateRequest):
    """Estimation pour sinistre habitation"""
    result = await estimation_service.estimate_habitation_cost(
        request.damage_type, request.surface_m2
    )
    return result


@router.post("/agricole")
async def estimate_agricole(request: AgricoleEstimateRequest):
    """Estimation pour sinistre agricole"""
    result = await estimation_service.estimate_agricole_cost(request.disease_name)
    return result


@router.post("/sante")
async def estimate_sante(request: SanteEstimateRequest):
    """Estimation pour santé"""
    result = await estimation_service.estimate_sante_cost(request.care_type)
    return result


@router.post("/any")
async def estimate_any(claim_type: str, **kwargs):
    """Estimation pour n'importe quel type de sinistre"""
    result = await estimation_service.full_estimate(claim_type, **kwargs)
    return result