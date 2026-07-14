# backend/app/routes/websocket_claims.py
from fastapi import WebSocket, WebSocketDisconnect, APIRouter
from typing import Optional
import logging
from app.websocket_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])

@router.websocket("/ws/notifications")
async def websocket_notifications(websocket: WebSocket, sector: Optional[str] = "all"):
    """
    WebSocket endpoint for all notifications.
    Clients can specify a sector (banking, insurance, enterprise, all) as a query parameter.
    """
    await manager.connect(websocket, sector=sector)
    try:
        while True:
            # Maintenir la connexion ouverte
            data = await websocket.receive_text()
            # Heartbeat simple
            await websocket.send_json({"status": "active", "sector": sector})
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)