# app/routes/discord_claims.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid

router = APIRouter(prefix="/insurance", tags=["discord-claims"])

# Stockage des claims Discord
discord_claims_db = []

class DiscordClaim(BaseModel):
    user_id: str
    username: str
    type: str
    description: str
    image_url: Optional[str] = None
    event_type: Optional[str] = None
    date: Optional[str] = None
    amount: Optional[float] = None
    care_type: Optional[str] = None

@router.post("/claim/discord")
async def receive_claim_from_discord(claim: DiscordClaim):
    """Recevoir une déclaration de sinistre depuis Discord"""
    
    new_claim = {
        "id": str(uuid.uuid4()),
        "claim_number": f"CLM-DISC-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "source": "discord",
        "user_id": claim.user_id,
        "client": claim.username,
        "type": claim.type,
        "description": claim.description,
        "image_url": claim.image_url,
        "status": "pending",
        "fraud_score": 0,
        "created_at": datetime.now().isoformat(),
        "is_fraudulent": False
    }
    
    discord_claims_db.insert(0, new_claim)
    
    # Garder seulement les 100 derniers
    if len(discord_claims_db) > 100:
        discord_claims_db.pop()
    
    return {"success": True, "claim": new_claim, "message": "Déclaration reçue"}

@router.get("/claims/discord")
async def get_discord_claims(limit: int = 50):
    """Récupérer les déclarations Discord"""
    return {"claims": discord_claims_db[:limit], "total": len(discord_claims_db)}
@router.get("/claim/{claim_id}/report")
async def get_claim_report(claim_id: str):
    """Récupérer le rapport/constat d'une déclaration Discord"""
    # Chercher la déclaration
    claim = None
    for c in discord_claims_db:
        if c.get("id") == claim_id or c.get("claim_number") == claim_id:
            claim = c
            break
    
    if not claim:
        raise HTTPException(status_code=404, detail="Déclaration non trouvée")
    
    # Générer le rapport
    report = {
        "claim_number": claim.get("claim_number"),
        "client": claim.get("client"),
        "type": claim.get("type"),
        "date": claim.get("created_at"),
        "description": claim.get("description"),
        "status": claim.get("status"),
        "fraud_score": claim.get("fraud_score", 0),
        "image_url": claim.get("image_url"),
        "subtype": claim.get("subtype"),
        "incident_date": claim.get("incident_date"),
        "event_type": claim.get("event_type"),
        "amount": claim.get("amount"),
        "care_type": claim.get("care_type"),
        "analysis": claim.get("analysis", {})
    }
    
    return {"success": True, "report": report}