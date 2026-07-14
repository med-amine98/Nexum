# app/api/discord_bridge.py - Version simplifiée pour 1 bot
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
import aiohttp
import os
from datetime import datetime
from typing import Optional

router = APIRouter(prefix="/discord", tags=["discord"])

# Configuration du BOT BANQUE
DISCORD_WEBHOOK_BANK = os.getenv("DISCORD_WEBHOOK_BANK", "")
ERP_API_URL = os.getenv("ERP_API_URL", "http://localhost:8000/api/v1")

# Stockage temporaire des messages
message_store = {}

class MessageToBankBot(BaseModel):
    message: str
    user_id: str
    user_name: str
    channel: str = "mp"  # "mp" ou "server"

class MessageFromBankBot(BaseModel):
    content: str
    user_id: str
    user_name: str
    command: Optional[str] = None


@router.post("/bank/send")
async def send_to_bank_bot(data: MessageToBankBot):
    """Envoie un message du portail vers le bot banque"""
    
    if not DISCORD_WEBHOOK_BANK:
        raise HTTPException(500, "Webhook banque non configuré")
    
    # Format du message pour Discord
    embed = {
        "title": "🏦 Nouveau message bancaire",
        "color": 0x1890ff,  # Bleu
        "fields": [
            {
                "name": "👤 Client",
                "value": f"{data.user_name} (`{data.user_id}`)",
                "inline": True
            },
            {
                "name": "📝 Message",
                "value": data.message[:500],
                "inline": False
            },
            {
                "name": "📅 Reçu le",
                "value": datetime.now().strftime("%d/%m/%Y à %H:%M"),
                "inline": True
            }
        ],
        "footer": {
            "text": "Répondez avec !repondre [user_id] [message]"
        }
    }
    
    # Envoyer au webhook Discord
    async with aiohttp.ClientSession() as session:
        await session.post(DISCORD_WEBHOOK_BANK, json={"embeds": [embed]})
    
    # Stocker le message
    message_store[data.user_id] = {
        "message": data.message,
        "timestamp": datetime.now().isoformat(),
        "status": "sent"
    }
    
    return {
        "success": True, 
        "message": "Message envoyé au conseiller bancaire",
        "user_id": data.user_id
    }


@router.post("/bank/receive")
async def receive_from_bank_bot(data: MessageFromBankBot):
    """Reçoit une réponse du bot banque (webhook entrant)"""
    
    # Stocker la réponse
    message_store[data.user_id] = message_store.get(data.user_id, {})
    message_store[data.user_id]["response"] = data.content
    message_store[data.user_id]["response_time"] = datetime.now().isoformat()
    
    # Ici, vous pouvez notifier le portail via WebSocket
    # Pour l'instant, on stocke juste
    
    return {"success": True, "message": "Réponse enregistrée"}


@router.get("/bank/messages/{user_id}")
async def get_messages_for_user(user_id: str):
    """Récupère les messages d'un utilisateur"""
    
    return {
        "user_id": user_id,
        "messages": message_store.get(user_id, [])
    }