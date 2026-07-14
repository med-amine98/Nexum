# app/websocket/digital_twins.py
from fastapi import WebSocket, WebSocketDisconnect, Depends
from typing import Dict, Set
import asyncio
import json
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, twin_id: str = "all"):
        await websocket.accept()
        if twin_id not in self.active_connections:
            self.active_connections[twin_id] = set()
        self.active_connections[twin_id].add(websocket)
    
    def disconnect(self, websocket: WebSocket, twin_id: str = "all"):
        if twin_id in self.active_connections:
            self.active_connections[twin_id].discard(websocket)
    
    async def send_message(self, message: dict, twin_id: str = "all"):
        if twin_id in self.active_connections:
            for connection in self.active_connections[twin_id]:
                try:
                    await connection.send_json(message)
                except:
                    pass

manager = ConnectionManager()

async def broadcast_twin_update(twin_id: int, twin_data: dict):
    """Diffuse une mise à jour d'un jumeau numérique"""
    await manager.send_message({
        "type": "twin_update",
        "twin": twin_data
    }, twin_id=str(twin_id))

# Route WebSocket
async def websocket_endpoint(websocket: WebSocket, twin_id: str = "all"):
    await manager.connect(websocket, twin_id)
    try:
        while True:
            # Garder la connexion ouverte
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, twin_id)