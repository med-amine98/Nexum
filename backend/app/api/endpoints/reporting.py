from fastapi import APIRouter, Depends, HTTPException
from app.core.dependencies import get_current_user
from app.models.auth import User
from app.services.reporting_service import reporting_service
from app.services.email_service import email_service
from typing import Dict, Any

router = APIRouter()

@router.post("/banking/generate")
async def generate_banking_report_api(data: Dict[str, Any], current_user: User = Depends(get_current_user)):
    report = reporting_service.generate_banking_report(data)
    
    # Optionnel: Envoyer par email
    if data.get("send_email") and current_user.email:
        email_service.send_email_with_attachment(
            current_user.email,
            "Votre Rapport Bancaire Nexum AI",
            f"Bonjour {current_user.username}, veuillez trouver ci-joint votre rapport bancaire personnalisé.",
            report["path"]
        )
    
    return {"status": "success", "report": report}

@router.post("/insurance/generate")
async def generate_insurance_report_api(data: Dict[str, Any], current_user: User = Depends(get_current_user)):
    report = reporting_service.generate_insurance_report(data)
    
    if data.get("send_email") and current_user.email:
        email_service.send_email_with_attachment(
            current_user.email,
            "Votre Rapport Assurance Nexum AI",
            f"Bonjour {current_user.username}, veuillez trouver ci-joint votre rapport d'analyse des sinistres.",
            report["path"]
        )
    
    return {"status": "success", "report": report}

@router.post("/enterprise/generate")
async def generate_enterprise_report_api(data: Dict[str, Any], current_user: User = Depends(get_current_user)):
    report = reporting_service.generate_enterprise_report(data)
    
    if data.get("send_email") and current_user.email:
        email_service.send_email_with_attachment(
            current_user.email,
            "Votre Rapport Entreprise Nexum AI",
            f"Bonjour {current_user.username}, veuillez trouver ci-joint votre rapport de performance opérationnelle.",
            report["path"]
        )
    
    return {"status": "success", "report": report}
