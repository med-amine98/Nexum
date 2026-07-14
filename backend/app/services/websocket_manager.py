# app/services/websocket_manager.py
from typing import List, Dict, Any
import asyncio
from fastapi import WebSocket
import json
import logging

logger = logging.getLogger(__name__)

class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.user_connections: Dict[str, WebSocket] = {}
        
    async def connect(self, websocket: WebSocket, user_id: str = None):
        await websocket.accept()
        self.active_connections.append(websocket)
        if user_id:
            self.user_connections[user_id] = websocket
        logger.info(f"WebSocket connected: {user_id}")
        
    def disconnect(self, websocket: WebSocket, user_id: str = None):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if user_id and user_id in self.user_connections:
            del self.user_connections[user_id]
        logger.info(f"WebSocket disconnected: {user_id}")
    
    async def broadcast(self, event_type: str, data: Any):
        """Diffuse un événement à tous les clients connectés"""
        message = {
            "type": event_type,
            "data": data
        }
        
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting: {e}")
                disconnected.append(connection)
        
        # Nettoyer les connexions mortes
        for conn in disconnected:
            self.disconnect(conn)
    
    async def send_to_user(self, user_id: str, event_type: str, data: Any):
        """Envoie un message à un utilisateur spécifique"""
        if user_id in self.user_connections:
            try:
                await self.user_connections[user_id].send_json({
                    "type": event_type,
                    "data": data
                })
            except Exception as e:
                logger.error(f"Error sending to user {user_id}: {e}")
                self.disconnect(self.user_connections[user_id], user_id)

websocket_manager = WebSocketManager()