# app/api/discord_support.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import aiohttp
import os

router = APIRouter(prefix="/discord/support", tags=["discord"])

class DiscordTicketRequest(BaseModel):
    user_id: str
    user_name: str
    message: str
    guild_id: Optional[str] = None

@router.post("/ticket")
async def create_ticket_from_discord(request: DiscordTicketRequest):
    """Créer un ticket à partir d'un message Discord"""
    
    # Créer le ticket dans votre base de données
    ticket_data = {
        "subject": f"Ticket Discord de {request.user_name}",
        "description": request.message,
        "category": "general",
        "priority": "medium",
        "user_email": f"{request.user_id}@discord.user",
        "user_name": request.user_name,
        "source": "discord",
        "source_id": request.user_id
    }
    
    # Appeler votre API interne
    async with aiohttp.ClientSession() as session:
        async with session.post(
            "http://localhost:8000/api/v1/support/tickets",
            json=ticket_data
        ) as resp:
            result = await resp.json()
            
            # Envoyer une confirmation sur Discord
            webhook_url = os.getenv("DISCORD_SUPPORT_WEBHOOK")
            if webhook_url:
                await send_discord_confirmation(webhook_url, request.user_id, result)
            
            return {"success": True, "ticket": result}

async def send_discord_confirmation(webhook_url, user_id, ticket):
    """Envoyer une confirmation Discord"""
    async with aiohttp.ClientSession() as session:
        embed = {
            "title": "✅ Ticket créé avec succès",
            "description": f"Votre ticket #{ticket.get('ticket_number')} a été créé.",
            "color": 0x00ff00,
            "fields": [
                {"name": "Sujet", "value": ticket.get('subject'), "inline": True},
                {"name": "Statut", "value": "Ouvert", "inline": True},
                {"name": "Priorité", "value": ticket.get('priority', 'Moyenne'), "inline": True}
            ],
            "timestamp": datetime.now().isoformat()
        }
        
        await session.post(webhook_url, json={"embeds": [embed]})