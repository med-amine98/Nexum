# app/routes/insurance_websocket.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Optional
import logging
from app.websocket_manager import manager
from app.core.security import decode_access_token
from datetime import datetime
logger = logging.getLogger(__name__)

# Supprimer le prefix pour que l'URL soit directement /ws/insurance
router = APIRouter(tags=["insurance-websocket"])

@router.websocket("/ws/insurance")
async def insurance_websocket(
    websocket: WebSocket, 
    token: Optional[str] = Query(None),
    sector: Optional[str] = Query("insurance")
):
    """
    WebSocket endpoint for insurance sector.
    URL: ws://localhost:8000/ws/insurance?token=xxx
    """
    # Vérifier le token si fourni
    if token:
        try:
            payload = decode_access_token(token)
            user_id = payload.get("sub")
            logger.info(f"🔐 Utilisateur authentifié: {user_id}")
        except Exception as e:
            logger.error(f"❌ Erreur token: {e}")
            # On accepte quand même la connexion mais on logge l'erreur
    
    await manager.connect(websocket, sector=sector)
    try:
        while True:
            data = await websocket.receive_text()
            
            # Gestion du heartbeat
            if data == "ping":
                await websocket.send_json({"type": "pong"})
            else:
                # Répondre avec le message reçu
                await websocket.send_json({
                    "type": "message",
                    "data": data,
                    "timestamp": datetime.now().isoformat()
                })
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info("🔌 Client déconnecté")
    except Exception as e:
        logger.error(f"❌ WebSocket error: {e}")
        manager.disconnect(websocket)