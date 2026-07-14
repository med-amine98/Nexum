# backend/app/routes/insurance.py
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import json
import asyncio
import logging

router = APIRouter(prefix="/insurance", tags=["insurance"])
logger = logging.getLogger(__name__)

# Stockage des WebSocket connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.insurance_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    async def connect_insurance(self, websocket: WebSocket):
        await websocket.accept()
        self.insurance_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if websocket in self.insurance_connections:
            self.insurance_connections.remove(websocket)

    async def broadcast_claim(self, claim_data: dict):
        """Diffuser une nouvelle déclaration à tous les clients connectés"""
        for connection in self.insurance_connections:
            try:
                await connection.send_json({
                    "type": "new_claim",
                    "data": claim_data,
                    "timestamp": datetime.now().isoformat()
                })
            except:
                pass

manager = ConnectionManager()

# Modèles
class ClaimFromDiscord(BaseModel):
    user_id: str
    username: str
    type: str  # accident, home_claim, health_claim
    description: str
    image_url: Optional[str] = None
    event_type: Optional[str] = None
    date: Optional[str] = None
    amount: Optional[float] = None
    care_type: Optional[str] = None

@router.post("/claim/discord")
async def receive_claim_from_discord(claim: ClaimFromDiscord):
    """Recevoir une déclaration de sinistre depuis Discord"""
    
    # Créer l'objet sinistre
    new_claim = {
        "id": f"CLM-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "claim_number": f"CLM-DISCORD-{datetime.now().strftime('%Y%m%d%H%M%S')}",
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
    
    # Ajouter les champs spécifiques selon le type
    if claim.type == "accident_declaration":
        new_claim["subtype"] = "car_accident"
    elif claim.type == "home_claim":
        new_claim["subtype"] = "home"
        new_claim["event_type"] = claim.event_type
        new_claim["incident_date"] = claim.date
    elif claim.type == "health_claim":
        new_claim["subtype"] = "health"
        new_claim["care_type"] = claim.care_type
        new_claim["amount"] = claim.amount
    
    # Stocker en base de données (simulé)
    # await db.claims.insert_one(new_claim)
    
    # Diffuser en temps réel via WebSocket
    await manager.broadcast_claim(new_claim)
    
    # Log
    logger.info(f"Nouvelle déclaration Discord: {new_claim['claim_number']} de {claim.username}")
    
    return {"success": True, "claim": new_claim, "message": "Déclaration reçue et diffusée"}

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket pour les mises à jour en temps réel"""
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Keep connection alive
            await websocket.send_json({"status": "connected"})
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@router.websocket("/ws/insurance")
async def insurance_websocket(websocket: WebSocket):
    """WebSocket spécifique pour le dashboard assurance"""
    await manager.connect_insurance(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_json({"status": "connected", "timestamp": datetime.now().isoformat()})
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@router.get("/claims/discord")
async def get_discord_claims(limit: int = 50):
    """Récupérer les déclarations Discord"""
    # Simuler des données
    return {
        "claims": [
            {
                "id": "CLM-DISCORD-001",
                "claim_number": "CLM-DISCORD-202404071001",
                "source": "discord",
                "client": "Mohamed Amine",
                "type": "accident_declaration",
                "description": "Accident de voiture sur l'autoroute A1",
                "status": "pending",
                "created_at": datetime.now().isoformat(),
                "image_url": None
            }
        ],
        "total": 1
    }