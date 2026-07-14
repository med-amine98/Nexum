# app/api/omnichannel.py - VERSION CORRIGÉE COMPLÈTE
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import random
import logging
import json

import os
import aiohttp
# ==================== CONFIGURATION ====================
router = APIRouter(prefix="/customer", tags=["omnichannel"])
logger = logging.getLogger(__name__)

# ==================== WEBSOCKET MANAGER ====================

class ConnectionManager:
    """Gère les connexions WebSocket"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        logger.info(f"✅ WebSocket connecté pour user_id: {user_id}")
        return True
    
    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            logger.info(f"❌ WebSocket déconnecté pour user_id: {user_id}")
    
    async def send_message(self, user_id: str, message: dict):
        """Envoie un message à un utilisateur spécifique"""
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_json(message)
                return True
            except Exception as e:
                logger.error(f"Erreur envoi WebSocket à {user_id}: {e}")
                self.disconnect(user_id)
        return False

# Instance globale
manager = ConnectionManager()

# ==================== WEBSOCKET ENDPOINT ====================
# IMPORTANT: Ce WebSocket sera accessible sur /api/v1/customer/ws/omnichannel/{user_id}
@router.websocket("/ws/omnichannel/{user_id}")
async def websocket_omnichannel(
    websocket: WebSocket,
    user_id: str
):
    """WebSocket pour la communication en temps réel omnicanal"""
    
    await manager.connect(websocket, user_id)
    
    try:
        # Message de bienvenue
        await manager.send_message(user_id, {
            "type": "connection",
            "status": "connected",
            "message": "Connecté au serveur omnicanal",
            "timestamp": datetime.now().isoformat()
        })
        
        # Boucle d'écoute
        while True:
            data = await websocket.receive_text()
            try:
                message_data = json.loads(data)
                logger.info(f"Message WebSocket reçu de {user_id}: {message_data}")
                
                msg_type = message_data.get("type", "message")
                if msg_type == "ping":
                    await manager.send_message(user_id, {
                        "type": "pong",
                        "timestamp": datetime.now().isoformat()
                    })
            except json.JSONDecodeError:
                logger.warning(f"Message JSON invalide: {data}")
    except WebSocketDisconnect:
        manager.disconnect(user_id)
    except Exception as e:
        logger.error(f"Erreur WebSocket: {e}")
        manager.disconnect(user_id)

# ==================== AUTH ====================
async def get_current_user_optional(token: Optional[str] = None):
    class CurrentUser:
        id = 2
        email = "aminehechmi4@gmail.com"
        full_name = "Amine Hechmi"
        is_superuser = False
        role = "user"
        is_active = True
    return CurrentUser()

# ==================== ENDPOINTS OMNICANAL ====================
@router.get("/omnichannel")
async def get_omnichannel_data(current_user = Depends(get_current_user_optional)):
    """Récupérer toutes les données omnicanal"""
    channels = [
        {"id": 1, "name": "Email", "type": "email", "color": "#1890ff", "unread": 2, "last_contact": "Aujourd'hui 10:30"},
        {"id": 2, "name": "Téléphone", "type": "phone", "color": "#52c41a", "unread": 0, "last_contact": "Hier 15:45"},
        {"id": 3, "name": "Chat en ligne", "type": "chat", "color": "#722ed1", "unread": 3, "last_contact": "Il y a 5 min"},
        {"id": 4, "name": "WhatsApp", "type": "whatsapp", "color": "#25D366", "unread": 1, "last_contact": "Aujourd'hui 09:15"},
        {"id": 5, "name": "Discord Banque", "type": "discord", "color": "#5865F2", "unread": 0, "last_contact": "Connecté"}
    ]
    
    interactions = [
        {"title": "Email envoyé", "content": "Confirmation de réception", "date": "Aujourd'hui 10:30", "channel": "email", "color": "#1890ff", "status": "Lu"},
        {"title": "Appel reçu", "content": "Échange avec le conseiller", "date": "Hier 15:45", "channel": "phone", "color": "#52c41a", "status": "Traité"},
        {"title": "Message chat", "content": "Discussion sur votre devis", "date": "Il y a 2 heures", "channel": "chat", "color": "#722ed1", "status": "En attente"}
    ]
    
    messages = [
        {"id": 1, "sender": "assistant", "content": "Bienvenue ! Tapez !solde pour voir votre solde", "time": "10:30", "channel": "chat"},
        {"id": 2, "sender": "client", "content": "!solde", "time": "10:32", "channel": "chat"},
        {"id": 3, "sender": "assistant", "content": "Solde: 1250.50€", "time": "10:32", "channel": "chat"}
    ]
    return {"channels": channels, "interactions": interactions, "messages": messages}

@router.post("/omnichannel/messages")
async def send_message(message_data: dict, current_user = Depends(get_current_user_optional)):
    """Envoyer un message"""
    content = message_data.get("content", "")
    auto_response = None
    
    if content.lower() == "!solde":
        auto_response = "**Votre solde**: 1250.50€"
    elif content.lower() == "!points":
        auto_response = "**Vos points**: 450 points"
    elif content.lower().startswith("!credit"):
        auto_response = "Simulation envoyée à un conseiller"
    
    # Store the interaction for learning (default feedback_score = None)
    # The assistant handling this request is "omnichannel" (could be mapped to Elena/Sophie/James later)
    from app.services.learning_service import learning_service
    learning_service.learn_from_conversation(
        assistant="omnichannel",
        question=content,
        answer=auto_response or "",
        feedback_score=None
    )
    
    return {"success": True, "message_id": random.randint(1000, 9999), "auto_response": auto_response}

# ==================== FEEDBACK ENDPOINT ====================
@router.post("/analytics/feedback")
async def receive_feedback(data: dict, current_user = Depends(get_current_user_optional)):
    """Recevoir le feedback utilisateur et enrichir la base Qdrant.
    Expected keys: assistant (str), question (str), correct_answer (str), feedback_score (int 0‑5)
    """
    assistant = data.get("assistant")
    question = data.get("question")
    correct_answer = data.get("correct_answer")
    feedback_score = data.get("feedback_score")
    
    if not all([assistant, question, correct_answer, isinstance(feedback_score, int)]):
        raise HTTPException(status_code=400, detail="Missing required feedback fields")

    from app.services.learning_service import learning_service
    # Store corrected answer with provided feedback score
    learning_service.learn_from_conversation(
        assistant=assistant,
        question=question,
        answer=correct_answer,
        feedback_score=feedback_score
    )
    return {"success": True, "message": "Feedback stored"}

# ==================== ENDPOINTS BOT BANQUE ====================
@router.post("/discord/bank/send")
async def send_to_bank_bot(data: dict):
    """Envoie un message du portail vers le bot banque Discord"""
    user_id = data.get("user_id")
    message_content = data.get("message")
    user_name = data.get("user_name", "Client")
    
    logger.info(f"📤 Message portail -> bot banque: User={user_name}, Msg={message_content}")
    # ICI: Appeler votre webhook Discord
    # webhook_url = "https://discord.com/api/webhooks/..."
    # await send_to_discord_webhook(webhook_url, message_content, user_name)
    
    return {
        "success": True,
        "message": "Message envoyé au conseiller bancaire",
        "user_id": user_id,
        "timestamp": datetime.now().isoformat()
    }

@router.post("/discord/bank/receive")
async def receive_from_bank_bot(data: dict):
    """Reçoit une réponse du bot banque Discord"""
    user_id = data.get("user_id")
    response = data.get("response")
    responder = data.get("responder", "Conseiller")
    
    logger.info(f"📥 Réponse bot banque -> portail: User={user_id}, Response={response}")
    # Envoyer via WebSocket au portail
    await manager.send_message(user_id, {
        "type": "bank_reply",
        "content": response,
        "responder": responder,
        "timestamp": datetime.now().isoformat(),
        "sector": "banking"
    })
    
    return {"success": True, "message": "Réponse transmise au client"}

@router.get("/discord/bank/balance/{user_id}")
async def get_bank_balance(user_id: str):
    """Récupère le solde bancaire"""
    return {"user_id": user_id, "balance": round(random.uniform(100, 10000), 2), "currency": "EUR"}

@router.get("/discord/bank/points/{user_id}")
async def get_bank_points(user_id: str):
    """Récupère les points"""
    return {"user_id": user_id, "points": random.randint(100, 5000)}

@router.get("/discord/bank/transactions/{user_id}")
async def get_bank_transactions(user_id: str, limit: int = 10):
    """Historique des transactions"""
    transactions = []
    for i in range(min(limit, 10)):
        transactions.append({
            "id": i+1,
            "date": (datetime.now() - timedelta(days=i)).strftime("%d/%m/%Y"),
            "amount": random.choice([-50, -100, 200, 500, -30]),
            "type": random.choice(["Virement", "Carte", "Prélèvement"]),
            "status": "completed"
        })
    return {"user_id": user_id, "transactions": transactions}

# Analytics user intent/session placeholders (remain unchanged)
@router.post("/analytics/user/intent")
async def track_user_intent(data: dict):
    logger.info(f"🎯 Intent detected: {data}")
    return {"success": True}

@router.post("/analytics/user/session")
async def track_user_session(data: dict):
    logger.info(f"📊 Session data: {data}")
    return {"success": True}

@router.get("/discord/bank/messages/pending")
async def get_pending_messages():
    """Messages en attente pour conseillers"""
    return {"clients": []}

@router.post("/notifications/{sector}/{event_type}")
async def send_notification(sector: str, event_type: str, data: dict):
    """
    Generic notification endpoint for sector events.
    Sends to Discord webhook (if configured) and broadcasts via WebSocket.
    Expected payload:
    {
        "user_id": "some-id",
        "description": "text describing the event"
    }
    """
    user_id = data.get("user_id")
    description = data.get("description", "")
    # Discord webhook
    webhook_env = f"DISCORD_WEBHOOK_{sector.upper()}"
    webhook_url = os.getenv(webhook_env, "")
    if webhook_url:
        async with aiohttp.ClientSession() as session:
            await session.post(webhook_url, json={"content": f"[{sector}] {event_type}: {description}"})
    # WebSocket broadcast
    if user_id:
        await manager.send_message(user_id, {
            "type": "notification",
            "sector": sector,
            "event_type": event_type,
            "description": description,
            "timestamp": datetime.now().isoformat()
        })
    return {"success": True, "sector": sector, "event_type": event_type}
